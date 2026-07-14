/**
 * js/pages/history.js
 * Halaman historis data & trend
 * Klasifikasi: Harian, Mingguan, Bulanan
 */
import Chart from 'chart.js/auto';
import { getAggregatedData, calculateHistoryStats, getHistoricalData } from '../data/history.js';
import { sanitizeHTML } from '../utils/security.js';

let historyChart = null;
let activeKlasifikasi = 'hari'; // 'hari' | 'minggu' | 'bulan'

// ============================================================
// PUBLIC
// ============================================================

export function renderHistory() {
  loadHistoryData();
}

export function downloadHistoryExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Library Excel belum siap. Tunggu beberapa detik dan coba lagi.');
    return;
  }

  const location  = document.getElementById('history-location')?.value || 'pelabuhan';
  const lokasiNama = location === 'pelabuhan' ? 'PPS Bitung (Pelabuhan)' : 'Perairan Bitung – Likupang';
  const aggData   = getAggregatedData(location, activeKlasifikasi);
  const rawData   = getHistoricalData(location, 90);
  const isDemo    = rawData.length < 2;

  if (!aggData || aggData.length === 0) {
    alert('Tidak ada data untuk diunduh.');
    return;
  }

  const klasLabel = { hari: 'Harian', minggu: 'Mingguan', bulan: 'Bulanan' };
  const now = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) + ' WITA';

  // ── Sheet 1: Data Per Periode ──────────────────────────────
  const headers = [
    'Periode',
    'Gelombang Rata-rata (m)',
    'Kategori Gelombang',
    'Angin Rata-rata (kt)',
    'Suhu Rata-rata (°C)',
    'Jumlah Data',
    'Keterangan'
  ];

  const rows = aggData.map(d => {
    const waveN = parseFloat(d.wave_avg) || 0;
    const waveCat = waveN > 4.0 ? 'Ekstrem'
                  : waveN > 2.5 ? 'Tinggi'
                  : waveN > 1.25 ? 'Sedang'
                  : waveN > 0.5 ? 'Rendah'
                  : 'Tenang';
    return [
      d.label,
      d.wave_avg != null ? parseFloat(parseFloat(d.wave_avg).toFixed(2)) : '-',
      waveCat,
      d.wind_avg != null ? parseFloat(parseFloat(d.wind_avg).toFixed(1)) : '-',
      d.temp_avg != null ? parseFloat(parseFloat(d.temp_avg).toFixed(1)) : '-',
      d.count || 1,
      isDemo ? 'Data Contoh (estimasi)' : 'Data BMKG tersimpan'
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Styling lebar kolom
  ws['!cols'] = [
    { wch: 22 }, // Periode
    { wch: 24 }, // Gelombang
    { wch: 20 }, // Kategori
    { wch: 22 }, // Angin
    { wch: 22 }, // Suhu
    { wch: 14 }, // Jumlah Data
    { wch: 30 }, // Keterangan
  ];

  // ── Sheet 2: Info & Metadata ───────────────────────────────
  const wsInfo = XLSX.utils.aoa_to_sheet([
    ['SIMAR BITUNG — Sistem Informasi Maritim'],
    ['Laporan Data Riwayat Kondisi Laut'],
    [],
    ['Lokasi', lokasiNama],
    ['Klasifikasi', klasLabel[activeKlasifikasi]],
    ['Jumlah Periode', aggData.length],
    ['Dicetak Pada', now],
    ['Sumber Data', 'API Publik BMKG — peta-maritim.bmkg.go.id'],
    ['Status Data', isDemo ? 'CONTOH — Belum ada data nyata tersimpan' : 'Data nyata dari BMKG'],
    [],
    ['KETERANGAN WARNA GELOMBANG'],
    ['Tenang', '≤ 0.5 m'],
    ['Rendah', '≤ 1.25 m'],
    ['Sedang', '≤ 2.5 m'],
    ['Tinggi', '≤ 4.0 m'],
    ['Ekstrem', '> 4.0 m'],
    [],
    ['KETERANGAN WARNA ANGIN'],
    ['Normal', '≤ 10 kt'],
    ['Sedang', '≤ 15 kt'],
    ['Kencang', '≤ 20 kt'],
    ['Badai', '> 20 kt'],
    [],
    ['KETERANGAN WARNA SUHU'],
    ['Dingin', '< 25°C'],
    ['Normal', '25–31°C'],
    ['Hangat', '31–33°C'],
    ['Panas', '> 33°C'],
    [],
    ['Catatan', 'Data prakiraan bersifat indikatif. Selalu verifikasi dengan otoritas maritim setempat sebelum berlayar.'],
  ]);

  wsInfo['!cols'] = [{ wch: 28 }, { wch: 45 }];

  // ── Buat Workbook & Download ───────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Per Periode');
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info & Keterangan');

  const timestamp = new Date().toISOString().slice(0, 10);
  const fileName = `SiMarBitung_Riwayat_${location}_${klasLabel[activeKlasifikasi]}_${timestamp}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function loadHistoryData() {
  const location  = document.getElementById('history-location')?.value  || 'pelabuhan';
  const parameter = document.getElementById('history-parameter')?.value || 'wave';

  const rawData = getHistoricalData(location, 90);
  const aggData = getAggregatedData(location, activeKlasifikasi);

  // Tampilkan status data tersedia
  _updateDataStatus(rawData.length);

  // Selalu render chart — jika rawData kosong, aggData akan berisi data demo
  const stats = calculateHistoryStats(aggData);
  _renderSummaryCards(stats, parameter, rawData.length);
  _renderHistoryChart(aggData, parameter, rawData.length === 0);
  _renderDataTable(aggData, parameter, rawData.length === 0);
}

export function setKlasifikasi(k) {
  activeKlasifikasi = k;

  // Update tombol aktif
  ['hari', 'minggu', 'bulan'].forEach(key => {
    const btn = document.getElementById(`history-klasifikasi-${key}`);
    if (!btn) return;
    if (key === k) {
      btn.className = 'history-klasifikasi-btn px-5 py-2.5 rounded-full text-sm font-black bg-cyan-500 text-white border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/20 transition-all';
    } else {
      btn.className = 'history-klasifikasi-btn px-5 py-2.5 rounded-full text-sm font-bold bg-white/5 text-white/60 hover:text-white border-2 border-white/10 hover:bg-white/10 transition-all';
    }
  });

  loadHistoryData();
}

// ============================================================
// PRIVATE: RENDER
// ============================================================

function _showEmpty() {
  const summary = document.getElementById('history-summary');
  const chartWrap = document.getElementById('history-chart-wrap');
  const tableWrap = document.getElementById('history-table-wrap');

  if (summary) summary.innerHTML = `
    <div class="col-span-4 glass p-10 rounded-2xl text-center border border-yellow-500/20">
      <div class="text-5xl mb-4">📭</div>
      <p class="text-yellow-400 font-black text-lg mb-2">Belum Ada Data Historis</p>
      <p class="text-white/50 text-sm">Data akan terekam otomatis setiap kali aplikasi memuat data BMKG.<br>Kunjungi kembali besok untuk melihat tren pertama Anda.</p>
    </div>
  `;
  if (chartWrap)  chartWrap.classList.add('hidden');
  if (tableWrap)  tableWrap.classList.add('hidden');
}

function _updateDataStatus(count) {
  const el = document.getElementById('history-data-status');
  if (!el) return;
  if (count === 0) {
    el.textContent = 'Belum ada data';
    el.className = 'text-xs font-bold text-yellow-400';
  } else {
    el.textContent = `${count} hari data tersimpan`;
    el.className = 'text-xs font-bold text-green-400';
  }
}

function _renderSummaryCards(stats, parameter, daysRecorded) {
  const container = document.getElementById('history-summary');
  if (!container || !stats) return;

  const s = stats[parameter];
  if (!s) return;

  const unit       = parameter === 'wave' ? 'm' : parameter === 'wind' ? 'kt' : '°C';
  const icon       = parameter === 'wave' ? '🌊' : parameter === 'wind' ? '💨' : '🌡️';
  const trendIcon  = s.trend > 0 ? '📈' : s.trend < 0 ? '📉' : '➡️';
  const trendColor = s.trend > 0 ? 'text-red-400' : s.trend < 0 ? 'text-green-400' : 'text-yellow-400';
  const trendLabel = s.trend > 0 ? 'Meningkat' : s.trend < 0 ? 'Menurun' : 'Stabil';

  container.innerHTML = `
    <div class="glass p-6 rounded-2xl border border-cyan-500/15">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-2xl">${icon}</span>
        <span class="text-[10px] uppercase opacity-50 font-black tracking-wider">Rata-rata</span>
      </div>
      <p class="text-3xl font-black text-cyan-400">${s.avg}<span class="text-sm font-normal ml-1 opacity-60">${unit}</span></p>
      <p class="text-xs text-white/40 mt-1">dari ${daysRecorded} hari tercatat</p>
    </div>

    <div class="glass p-6 rounded-2xl border border-red-500/15">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-2xl">⬆️</span>
        <span class="text-[10px] uppercase opacity-50 font-black tracking-wider">Maksimum</span>
      </div>
      <p class="text-3xl font-black text-red-400">${s.max}<span class="text-sm font-normal ml-1 opacity-60">${unit}</span></p>
      <p class="text-xs text-white/40 mt-1">nilai tertinggi</p>
    </div>

    <div class="glass p-6 rounded-2xl border border-green-500/15">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-2xl">⬇️</span>
        <span class="text-[10px] uppercase opacity-50 font-black tracking-wider">Minimum</span>
      </div>
      <p class="text-3xl font-black text-green-400">${s.min}<span class="text-sm font-normal ml-1 opacity-60">${unit}</span></p>
      <p class="text-xs text-white/40 mt-1">nilai terendah</p>
    </div>

    <div class="glass p-6 rounded-2xl border border-white/10">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-2xl">${trendIcon}</span>
        <span class="text-[10px] uppercase opacity-50 font-black tracking-wider">Tren</span>
      </div>
      <p class="text-3xl font-black ${trendColor}">${s.trend > 0 ? '+' : ''}${s.trend}%</p>
      <p class="text-xs text-white/40 mt-1">${trendLabel} dari awal periode</p>
    </div>
  `;
}

function _renderHistoryChart(aggData, parameter, isDemo = false) {
  const chartWrap = document.getElementById('history-chart-wrap');
  const canvas    = document.getElementById('history-chart');
  if (!canvas) return;
  if (chartWrap) chartWrap.classList.remove('hidden');

  if (historyChart) historyChart.destroy();

  if (!aggData || aggData.length === 0) {
    canvas.parentElement.innerHTML = '<p class="text-center py-8 text-white/30">Tidak ada data untuk periode ini.</p>';
    return;
  }

  const labels = aggData.map(d => d.label);
  const values = aggData.map(d => {
    const v = parameter === 'wave' ? d.wave_avg : parameter === 'wind' ? d.wind_avg : d.temp_avg;
    return v != null ? parseFloat(parseFloat(v).toFixed(2)) : null;
  });

  const unit  = parameter === 'wave' ? 'm' : parameter === 'wind' ? 'kt' : '°C';
  const label = parameter === 'wave' ? 'Tinggi Gelombang' : parameter === 'wind' ? 'Kecepatan Angin' : 'Suhu Udara';
  const color = parameter === 'wave' ? '#38bdf8' : parameter === 'wind' ? '#fb923c' : '#f87171';

  const klasLabel = { hari: 'Harian', minggu: 'Mingguan', bulan: 'Bulanan' };
  const chartTitle = document.getElementById('history-chart-title');
  if (chartTitle) {
    chartTitle.textContent = `${label} — ${klasLabel[activeKlasifikasi]}${isDemo ? ' (Contoh Data)' : ''}`;
  }

  // Banner demo
  const demoBanner = document.getElementById('history-demo-banner');
  if (demoBanner) demoBanner.classList.toggle('hidden', !isDemo);

  historyChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${label} Rata-rata${isDemo ? ' (Demo)' : ''}`,
        data: values,
        borderColor: isDemo ? color + '99' : color,
        backgroundColor: color + '18',
        borderWidth: isDemo ? 2 : 3,
        borderDash: isDemo ? [6, 3] : [],
        fill: true,
        tension: 0.4,
        pointRadius: aggData.length > 30 ? 2 : 4,
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        spanGaps: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#fff', font: { size: 12, weight: 'bold' } }
        },
        tooltip: {
          backgroundColor: 'rgba(11,31,58,0.97)',
          titleColor: '#22d3ee',
          bodyColor: '#fff',
          borderColor: isDemo ? '#fbbf24' : '#22d3ee',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y?.toFixed(2)} ${unit}`,
            afterBody: isDemo ? () => ['⚠️ Ini adalah data contoh'] : undefined,
          }
        }
      },
      scales: {
        y: {
          beginAtZero: parameter !== 'temp',
          grid: { color: 'rgba(255,255,255,0.08)' },
          ticks: { color: 'rgba(255,255,255,0.6)', callback: v => v.toFixed(1) + ' ' + unit }
        },
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: 'rgba(255,255,255,0.6)',
            maxRotation: activeKlasifikasi === 'hari' ? 45 : 30,
            font: { size: 10 }
          }
        }
      }
    }
  });
}

function _renderDataTable(aggData, parameter, isDemo = false) {
  const tableWrap = document.getElementById('history-table-wrap');
  const tableBody = document.getElementById('history-table-body');
  if (!tableBody) return;
  if (tableWrap) tableWrap.classList.remove('hidden');

  if (!aggData || aggData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-white/30">Tidak ada data.</td></tr>';
    return;
  }

  const sorted = [...aggData].reverse();

  tableBody.innerHTML = sorted.map((d, i) => {
    // ── Gelombang ──
    // Tenang ≤0.5m | Rendah ≤1.25m | Sedang ≤2.5m | Tinggi ≤4.0m | Ekstrem >4.0m
    const waveVal = d.wave_avg != null ? parseFloat(d.wave_avg).toFixed(2) : '-';
    const waveN   = parseFloat(waveVal);
    const waveColor = waveN > 4.0  ? 'text-red-500'
                    : waveN > 2.5  ? 'text-red-400'
                    : waveN > 1.25 ? 'text-yellow-400'
                    : waveN > 0.5  ? 'text-cyan-400'
                    : 'text-green-400';

    // ── Angin ──
    // Normal ≤10kt | Sedang ≤15kt | Kencang ≤20kt | Badai >20kt
    const windVal = d.wind_avg != null ? parseFloat(d.wind_avg).toFixed(1) : '-';
    const windN   = parseFloat(windVal);
    const windColor = windN > 20 ? 'text-red-400'
                    : windN > 15 ? 'text-orange-400'
                    : windN > 10 ? 'text-yellow-400'
                    : 'text-green-400';

    // ── Suhu Udara ──
    // Dingin <25°C | Normal 25-31°C | Hangat 31-33°C | Panas >33°C
    const tempVal = d.temp_avg != null ? parseFloat(d.temp_avg).toFixed(1) : '-';
    const tempN   = parseFloat(tempVal);
    const tempColor = isNaN(tempN)  ? 'text-white/40'
                    : tempN > 33   ? 'text-red-400'
                    : tempN > 31   ? 'text-orange-400'
                    : tempN >= 25  ? 'text-green-400'
                    : 'text-blue-400';

    const count   = d.count ? `<span class="text-white/30 text-[10px] ml-1">(${d.count} data)</span>` : '';
    const demoTag = isDemo ? '<span class="ml-1 text-[9px] text-yellow-400/60 font-normal">(contoh)</span>' : '';

    return `
      <tr class="${i % 2 === 0 ? 'bg-white/[0.02]' : ''} hover:bg-white/5 transition-colors">
        <td class="p-3 border-b border-white/5 font-bold text-sm">${sanitizeHTML(d.label)}${count}${demoTag}</td>
        <td class="p-3 border-b border-white/5 font-black text-base ${waveColor}">${waveVal} <span class="text-xs font-normal opacity-60">m</span></td>
        <td class="p-3 border-b border-white/5 font-bold text-sm ${windColor}">${windVal} <span class="text-xs font-normal opacity-60">kt</span></td>
        <td class="p-3 border-b border-white/5 font-bold text-sm ${tempColor}">${tempVal !== '-' ? tempVal + ' °C' : '-'}</td>
      </tr>
    `;
  }).join('');
}
