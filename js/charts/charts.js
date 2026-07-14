/**
 * js/charts/charts.js
 * Chart rendering module - lazy loaded saat tab Charts dibuka
 * Membutuhkan Chart.js yang di-install via npm
 */
import Chart from 'chart.js/auto';
import { CONFIG, stateData } from '../config.js';
import { sanitizeHTML } from '../utils/security.js';
import { parseWaveNum, getWeatherEmoji } from '../utils/share.js';
import { formatWITA } from '../data/api.js';
import { makeStatusBadge, makeStatCard } from '../pages/home.js';

let chartInstances = {};
let activeChartParameter = 'wave';
let activePeriodIndex = 0;

// ============================================================
// CHART.JS CUSTOM PLUGINS
// ============================================================
const gelombangBandsPlugin = {
  id: 'gelombangBands',
  beforeDraw: (chart) => {
    const { ctx, chartArea, scales: { yAxisL } } = chart;
    if (!yAxisL || chart.config.options.plugins.gelombangBandsDisabled) return;
    ctx.save();
    const bands = [
      { min: 0,   max: 0.5,  color: 'rgba(56, 189, 248, 0.12)',  text: 'Tenang (0.1 - 0.5 m)' },
      { min: 0.5, max: 1.25, color: 'rgba(74, 222, 128, 0.12)',  text: 'Rendah (0.5 - 1.25 m)' },
      { min: 1.25,max: 2.5,  color: 'rgba(253, 224, 71, 0.08)',  text: 'Sedang (1.25 - 2.5 m)' },
      { min: 2.5, max: 4.0,  color: 'rgba(249, 115, 22, 0.12)',  text: 'Tinggi (2.5 - 4.0 m)' },
      { min: 4.0, max: 10.0, color: 'rgba(239, 68, 68, 0.12)',   text: 'Sangat Tinggi / Ekstrem' }
    ];
    bands.forEach(band => {
      const top    = yAxisL.getPixelForValue(band.max);
      const bottom = yAxisL.getPixelForValue(band.min);
      if (top !== undefined && bottom !== undefined) {
        ctx.fillStyle = band.color;
        const drawY = Math.max(top, chartArea.top);
        const drawH = Math.min(bottom - top, chartArea.bottom - drawY);
        if (drawH > 0) {
          ctx.fillRect(chartArea.left, drawY, chartArea.right - chartArea.left, drawH);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.font = 'bold 9px Arial, sans-serif';
          ctx.fillText(band.text, chartArea.left + 10, bottom - 5);
        }
      }
    });
    ctx.restore();
  }
};

Chart.register(gelombangBandsPlugin);

// ============================================================
// PUBLIC API
// ============================================================

export function renderCharts() {
  const source = (document.getElementById('chart-source-select') || {}).value || 'pelabuhan';
  const data = stateData[source];

  if (!data || !data.data) {
    const canvas = document.getElementById('chart-bmkg-main');
    if (canvas) canvas.parentElement.innerHTML = '<div class="loading-overlay py-12 text-center opacity-50"><i class="fas fa-chart-line fa-3x mb-4"></i><p class="text-sm font-bold">Data belum tersedia. Kembali ke beranda dan refresh.</p></div>';
    return;
  }

  renderStatCards(source, data);
  renderForecastPeriodCards(data);
  renderTrendTable(source, data);
  renderOfficialTable(source, data);
  renderActiveChart();
}

export function switchChartParameter(param) {
  activeChartParameter = param;
  document.querySelectorAll('.pill-param-btn').forEach(btn => {
    if (btn.disabled) {
      btn.className = 'pill-param-btn bg-white/5 border-2 border-white/10 text-white/30 px-6 py-3.5 rounded-full text-sm font-bold cursor-not-allowed opacity-30';
    } else {
      btn.className = 'pill-param-btn bg-white/5 border-2 border-white/10 hover:bg-white/10 text-white/60 hover:text-white px-6 py-3.5 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95';
    }
  });
  const activeBtn = document.getElementById(`pill-param-${param}`);
  if (activeBtn && !activeBtn.disabled) {
    activeBtn.className = 'pill-param-btn bg-cyan-500 border-2 border-cyan-400/50 text-white shadow-lg shadow-cyan-500/20 px-6 py-3.5 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95';
  }
  renderActiveChart();
}
window.switchChartParameter = switchChartParameter;

export function setActivePeriodIndex(idx) {
  activePeriodIndex = idx;
  // Update border tiap card sesuai status aktif
  document.querySelectorAll('.forecast-period-card').forEach((card, cidx) => {
    card.style.border = cidx === idx
      ? '2px solid #22d3ee'
      : '2px solid rgba(255,255,255,0.12)';
    card.style.background = cidx === idx
      ? 'rgba(8,145,178,0.15)'
      : '';
  });
}
window.setActivePeriodIndex = setActivePeriodIndex;

// ============================================================
// PRIVATE HELPERS
// ============================================================
function renderStatCards(source, data) {
  const isPelabuhan = source === 'pelabuhan';
  const rows = data.data;
  const container = document.getElementById('charts-stat-cards');
  if (!container) return;

  const waveData = rows.map(r => parseWaveNum(r.wave_desc));
  const windData = rows.map(r => parseFloat(r.wind_speed_max) || 0);
  const maxWave  = Math.max(...waveData);
  const avgWind  = (windData.reduce((a,b) => a+b,0) / windData.length).toFixed(1);

  const waveStatus = maxWave > CONFIG.WAVE_THRESHOLDS.RENDAH ? 'Waspada' : 'Aman';
  const waveColor  = maxWave > CONFIG.WAVE_THRESHOLDS.RENDAH ? 'text-yellow-400' : 'text-green-400';

  let html = makeStatCard('fas fa-water', 'Gelombang Maks.', maxWave.toFixed(1), 'meter', waveColor, makeStatusBadge(waveStatus));
  html += makeStatCard('fas fa-wind', 'Angin Rata-rata', avgWind, 'knot', 'text-orange-400');

  if (isPelabuhan) {
    const tempData = rows.map(r => parseFloat(r.temp_max) || 0).filter(v => v > 0);
    const avgTemp  = tempData.length > 0 ? (tempData.reduce((a,b) => a+b,0) / tempData.length).toFixed(1) : '-';
    const curData  = rows.map(r => parseFloat((r.current_speed_max * 100).toFixed(0)) || 0);
    const maxCur   = curData.length > 0 ? Math.max(...curData) : 0;
    html += makeStatCard('fas fa-temperature-high', 'Suhu Rata-rata', avgTemp, '°C', 'text-red-400');
    html += makeStatCard('fas fa-location-arrow', 'Arus Maks.', maxCur.toFixed(0), 'cm/s', 'text-cyan-400');
  }

  container.innerHTML = html;
}

function renderForecastPeriodCards(data) {
  const wrapper = document.getElementById('forecast-period-cards');
  if (!wrapper) return;

  const source      = (document.getElementById('chart-source-select') || {}).value || 'pelabuhan';
  const isPelabuhan = source === 'pelabuhan';

  let cardsHtml = '';
  data.data.forEach((p, idx) => {
    const clean = (p.valid_from || '').replace(' UTC', 'Z').replace(' ', 'T');
    let dayStr = '', hourStr = '';
    try {
      const d = new Date(clean);
      dayStr  = d.toLocaleString('id-ID', { timeZone:'Asia/Makassar', weekday:'short', day:'numeric', month:'short' });
      hourStr = d.toLocaleString('id-ID', { timeZone:'Asia/Makassar', hour:'2-digit', minute:'2-digit' });
    } catch(e) { dayStr = p.time_desc || 'Prakiraan'; }

    const isActive   = idx === activePeriodIndex;
    const waveH      = parseWaveNum(p.wave_desc);
    const waveColor  = waveH > 2.5 ? '#f87171' : waveH > 1.25 ? '#facc15' : '#4ade80';
    const windN      = parseFloat(p.wind_speed_max) || 0;
    const windColor  = windN > 20 ? '#f87171' : windN > 10 ? '#facc15' : '#22d3ee';
    const activeBg   = isActive ? 'rgba(8,145,178,0.15)' : 'transparent';
    const activeBdr  = isActive ? '#22d3ee' : 'rgba(255,255,255,0.12)';

    // Parameter lengkap dari active-period-weather-card
    const arusRow = isPelabuhan && p.current_speed_max ? `
      <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="color:rgba(255,255,255,0.4);">🧭 Arus</span>
        <span style="font-weight:700;color:#22d3ee;">${(p.current_speed_max * 100).toFixed(0)} cm/s ${sanitizeHTML(p.current_to || '')}</span>
      </div>` : '';
    const suhuRow = isPelabuhan && p.temp_max ? `
      <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;">
        <span style="color:rgba(255,255,255,0.4);">🌡️ Suhu</span>
        <span style="font-weight:700;color:rgba(255,255,255,0.8);">${p.temp_min}–${p.temp_max}°C</span>
      </div>` : '';

    cardsHtml += `
      <div onclick="setActivePeriodIndex(${idx})"
           class="forecast-period-card glass rounded-2xl cursor-pointer transition-all hover:-translate-y-1"
           style="border:2px solid ${activeBdr};background:${activeBg};padding:0.9rem;">
        <!-- Waktu -->
        <div style="border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:0.5rem;margin-bottom:0.5rem;text-align:center;">
          <p style="font-size:9px;color:rgba(255,255,255,0.35);font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 2px;">${sanitizeHTML(dayStr)}</p>
          <p style="font-size:13px;font-weight:900;color:#fff;margin:0;">${sanitizeHTML(hourStr || p.time_desc)}</p>
        </div>
        <!-- Cuaca -->
        <div style="text-align:center;margin-bottom:0.6rem;">
          <div style="font-size:1.6rem;line-height:1;margin-bottom:2px;">${getWeatherEmoji(p.weather)}</div>
          <p style="font-size:8px;color:rgba(255,255,255,0.35);font-weight:900;text-transform:uppercase;letter-spacing:0.08em;margin:0;line-height:1.3;">${sanitizeHTML(p.weather || 'Cerah')}</p>
        </div>
        <!-- Semua Parameter -->
        <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:0.5rem;display:flex;flex-direction:column;gap:0;">
          <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="color:rgba(255,255,255,0.4);">🌊 Gelombang</span>
            <span style="font-weight:900;color:${waveColor};">${sanitizeHTML(p.wave_desc || '0.0 m')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="color:rgba(255,255,255,0.4);">📐 Kategori</span>
            <span style="font-weight:700;color:rgba(255,255,255,0.7);">${sanitizeHTML(p.wave_cat || '-')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="color:rgba(255,255,255,0.4);">💨 Angin</span>
            <span style="font-weight:800;color:${windColor};">${p.wind_from || ''} ${p.wind_speed_min || ''}–${p.wind_speed_max || '-'} kn</span>
          </div>
          ${arusRow}
          ${suhuRow}
        </div>
      </div>`;
  });

  wrapper.innerHTML = cardsHtml;
}

function renderActivePeriodWeatherCard() {
  // Fungsi dipertahankan agar tidak error jika masih dipanggil dari tempat lain
  // Semua info sudah dimuat langsung di tiap forecast card
}

function renderTrendTable(source, data) {
  const table = document.getElementById('table-visual-trend');
  if (!table || !data?.data) return;

  const isPelabuhan = source === 'pelabuhan';
  const rows = data.data;

  let headerHtml = `<thead class="bg-white/5">
    <tr>
      <th class="p-3 font-black uppercase text-[10px] text-cyan-400 border-b border-white/10">Waktu (WITA)</th>
      <th class="p-3 font-black uppercase text-[10px] text-cyan-400 border-b border-white/10">Cuaca</th>
      <th class="p-3 font-black uppercase text-[10px] text-cyan-400 border-b border-white/10">Gelombang</th>
      <th class="p-3 font-black uppercase text-[10px] text-cyan-400 border-b border-white/10">Angin</th>`;
  
  if (isPelabuhan) {
    headerHtml += `<th class="p-3 font-black uppercase text-[10px] text-cyan-400 border-b border-white/10">Arus</th>
      <th class="p-3 font-black uppercase text-[10px] text-cyan-400 border-b border-white/10">Suhu</th>`;
  }
  headerHtml += `</tr></thead>`;

  let bodyHtml = '<tbody>';
  rows.forEach((r, idx) => {
    const clean = (r.valid_from || r.time_desc || '').replace(' UTC','Z').replace(' ','T');
    let witaTime = '';
    try {
      witaTime = new Date(clean).toLocaleString('id-ID', { timeZone:'Asia/Makassar', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    } catch(e) { witaTime = r.time_desc || '-'; }

    const bgClass = idx % 2 === 0 ? 'bg-white/[0.02]' : '';
    bodyHtml += `<tr class="${bgClass} hover:bg-white/5 transition-colors">
      <td class="p-3 border-b border-white/5 font-bold text-white/90">${sanitizeHTML(witaTime)}</td>
      <td class="p-3 border-b border-white/5">${sanitizeHTML(r.weather || 'Cerah')}</td>
      <td class="p-3 border-b border-white/5 font-bold text-cyan-400">${sanitizeHTML(r.wave_desc || '-')}</td>
      <td class="p-3 border-b border-white/5">${r.wind_from || '-'} ${r.wind_speed_max || '-'} kn</td>`;
    
    if (isPelabuhan) {
      bodyHtml += `<td class="p-3 border-b border-white/5">${(r.current_speed_max * 100).toFixed(0)} cm/s ${r.current_to || '-'}</td>
        <td class="p-3 border-b border-white/5">${r.temp_min}–${r.temp_max}°C</td>`;
    }
    bodyHtml += `</tr>`;
  });
  bodyHtml += '</tbody>';

  table.innerHTML = headerHtml + bodyHtml;
}

function renderOfficialTable(source, data) {
  const area = document.getElementById('charts-official-area');
  if (!area || !data?.data) return;

  const isPelabuhan = source === 'pelabuhan';
  const periods = data.data;
  if (periods.length === 0) {
    area.innerHTML = '<p style="text-align:center;padding:2rem;color:#6b7280;font-weight:bold;">Tidak ada data prakiraan resmi.</p>';
    return;
  }

  // Helper: format jam periode
  const formatPeriodHours = (p) => {
    try {
      const clean = (p.valid_from || '').replace(' UTC','Z').replace(' ','T');
      const d = new Date(clean);
      return d.toLocaleString('id-ID', { timeZone:'Asia/Makassar', hour:'2-digit', minute:'2-digit' }) + ' WITA';
    } catch(e) { return p.time_desc || '-'; }
  };

  // Helper: arrow arah
  const getDirectionArrow = (dir) => {
    if (!dir || dir === '-') return '-';
    const arrows = {
      'N':'↓', 'NE':'↙', 'E':'←', 'SE':'↖',
      'S':'↑', 'SW':'↗', 'W':'→', 'NW':'↘',
      'Utara':'↓', 'Timur Laut':'↙', 'Timur':'←', 'Tenggara':'↖',
      'Selatan':'↑', 'Barat Daya':'↗', 'Barat':'→', 'Barat Laut':'↘'
    };
    return `<div style="font-size:24px;line-height:1;">${arrows[dir] || '•'}</div><div style="font-size:11px;margin-top:2px;color:#444;">${sanitizeHTML(dir)}</div>`;
  };

  // Helper: warna cell gelombang
  const getWaveCellBg = (waveDesc) => {
    const h = parseWaveNum(waveDesc);
    if (h > CONFIG.WAVE_THRESHOLDS.TINGGI) return 'wave-danger';
    if (h > CONFIG.WAVE_THRESHOLDS.SEDANG) return 'wave-warning';
    if (h > CONFIG.WAVE_THRESHOLDS.RENDAH) return 'wave-caution';
    return 'wave-safe';
  };

  // Build header kolom
  let tableHtml = `
    <table style="width:100%;border-collapse:collapse;border:2.5px solid #000;font-family:Arial,sans-serif;font-size:14px;color:#000;text-align:center;background:#fff;">
      <thead>
        <tr style="background:#f3f4f6;border-bottom:2.5px solid #000;">
          <th style="border:1.5px solid #000;padding:12px 14px;font-weight:bold;width:220px;text-align:left;font-size:15px;">Parameter</th>
  `;

  periods.forEach(p => {
    const clean = (p.valid_from || '').replace(' UTC','Z').replace(' ','T');
    let dStr = '';
    try {
      dStr = new Date(clean).toLocaleString('id-ID', { timeZone:'Asia/Makassar', day:'2-digit', month:'long', year:'numeric' });
    } catch(e) { dStr = p.time_desc || 'Prakiraan'; }
    
    tableHtml += `
      <th style="border:1.5px solid #000;padding:12px 14px;font-weight:bold;">
        <div style="font-size:14px;margin-bottom:3px;color:#000;">${sanitizeHTML(dStr)}</div>
        <div style="font-size:11px;color:#444;font-weight:normal;">${formatPeriodHours(p)}</div>
      </th>
    `;
  });
  tableHtml += `</tr></thead><tbody>`;

  // Baris: Kondisi Cuaca
  tableHtml += `
    <tr>
      <td style="border:1.5px solid #000;padding:12px;text-align:left;font-weight:bold;background:#f9fafb;font-size:14px;">Kondisi Cuaca</td>
  `;
  periods.forEach(p => {
    const emoji = getWeatherEmoji(p.weather);
    tableHtml += `
      <td style="border:1.5px solid #000;padding:12px;font-size:14px;">
        <span style="font-size:28px;display:block;margin-bottom:3px;line-height:1;">${emoji}</span>
        <span style="font-weight:bold;font-size:12px;color:#222;">${sanitizeHTML(p.weather || '-')}</span>
      </td>
    `;
  });
  tableHtml += `</tr>`;

  // Visibilitas (hanya pelabuhan)
  if (isPelabuhan) {
    tableHtml += `
      <tr>
        <td style="border:1.5px solid #000;padding:12px;text-align:left;font-weight:bold;background:#f9fafb;font-size:14px;">Visibilitas (km)</td>
    `;
    periods.forEach(p => {
      const vis = p.visibility ? (p.visibility / 1000).toFixed(1) + ' km' : '-';
      tableHtml += `<td style="border:1.5px solid #000;padding:12px;font-weight:bold;font-size:14px;color:#000;">${vis}</td>`;
    });
    tableHtml += `</tr>`;
  }

  // Suhu Udara (hanya pelabuhan)
  if (isPelabuhan) {
    tableHtml += `
      <tr>
        <td style="border:1.5px solid #000;padding:12px;text-align:left;font-weight:bold;background:#f9fafb;font-size:14px;">Suhu Udara (&deg;C)</td>
    `;
    periods.forEach(p => {
      const temp = p.temp_min && p.temp_max ? `${p.temp_min} - ${p.temp_max}` : '-';
      tableHtml += `<td style="border:1.5px solid #000;padding:12px;font-weight:bold;font-size:14px;color:#000;">${temp}</td>`;
    });
    tableHtml += `</tr>`;
  }

  // Kelembapan Udara (hanya pelabuhan)
  if (isPelabuhan) {
    tableHtml += `
      <tr>
        <td style="border:1.5px solid #000;padding:12px;text-align:left;font-weight:bold;background:#f9fafb;font-size:14px;">Kelembapan Udara (%)</td>
    `;
    periods.forEach(p => {
      const rh = p.rh_min && p.rh_max ? `${p.rh_min} - ${p.rh_max}` : '-';
      tableHtml += `<td style="border:1.5px solid #000;padding:12px;font-weight:bold;font-size:14px;color:#000;">${rh}</td>`;
    });
    tableHtml += `</tr>`;
  }

  // Arah Angin
  tableHtml += `
    <tr>
      <td style="border:1.5px solid #000;padding:12px;text-align:left;font-weight:bold;background:#f9fafb;font-size:14px;">Arah Angin</td>
  `;
  periods.forEach(p => {
    tableHtml += `<td style="border:1.5px solid #000;padding:12px;vertical-align:middle;">${getDirectionArrow(p.wind_from)}</td>`;
  });
  tableHtml += `</tr>`;

  // Kecepatan Angin
  tableHtml += `
    <tr>
      <td style="border:1.5px solid #000;padding:12px;text-align:left;font-weight:bold;background:#f9fafb;font-size:14px;">Kecepatan Angin (knot)</td>
  `;
  periods.forEach(p => {
    const wind = p.wind_speed_min && p.wind_speed_max ? `${p.wind_speed_min} - ${p.wind_speed_max}` : (p.wind_speed_max ? `${p.wind_speed_max}` : '0');
    tableHtml += `<td style="border:1.5px solid #000;padding:12px;font-weight:bold;font-size:14px;color:#000;">${wind}</td>`;
  });
  tableHtml += `</tr>`;

  // Tinggi Gelombang
  tableHtml += `
    <tr>
      <td style="border:1.5px solid #000;padding:12px;text-align:left;font-weight:bold;background:#f9fafb;font-size:14px;">Tinggi Gelombang Signifikan (m)</td>
  `;
  periods.forEach(p => {
    const waveDesc = p.wave_desc || p.wave_cat || '-';
    const cellClass = getWaveCellBg(waveDesc);
    tableHtml += `<td class="${cellClass}" style="border:1.5px solid #000;padding:14px 12px;font-weight:bold;font-size:14px;">${sanitizeHTML(waveDesc)}</td>`;
  });
  tableHtml += `</tr>`;

  // Arah Arus (hanya pelabuhan)
  if (isPelabuhan) {
    tableHtml += `
      <tr>
        <td style="border:1.5px solid #000;padding:12px;text-align:left;font-weight:bold;background:#f9fafb;font-size:14px;">Arah Arus Permukaan</td>
    `;
    periods.forEach(p => {
      tableHtml += `<td style="border:1.5px solid #000;padding:12px;vertical-align:middle;">${getDirectionArrow(p.current_from)}</td>`;
    });
    tableHtml += `</tr>`;

    // Kecepatan Arus
    tableHtml += `
      <tr>
        <td style="border:1.5px solid #000;padding:12px;text-align:left;font-weight:bold;background:#f9fafb;font-size:14px;">Kecepatan Arus (knot)</td>
    `;
    periods.forEach(p => {
      const curSpeed = p.current_speed_min && p.current_speed_max ? `${p.current_speed_min} - ${p.current_speed_max}` : (p.current_speed_max ? `${p.current_speed_max}` : '0');
      tableHtml += `<td style="border:1.5px solid #000;padding:12px;font-weight:bold;font-size:14px;color:#000;">${curSpeed}</td>`;
    });
    tableHtml += `</tr>`;

    // Tinggi Muka Laut
    tableHtml += `
      <tr>
        <td style="border:1.5px solid #000;padding:12px;text-align:left;font-weight:bold;background:#f9fafb;font-size:14px;">Tinggi Muka Laut (m)</td>
    `;
    periods.forEach(p => {
      tableHtml += `<td style="border:1.5px solid #000;padding:12px;font-weight:bold;font-size:14px;color:#777;">-</td>`;
    });
    tableHtml += `</tr>`;
  }

  tableHtml += `</tbody></table>`;

  area.innerHTML = `
    <div style="background:#ffffff;color:#000;padding:15px;border-radius:20px;">
      <div style="overflow-x:auto;">
        ${tableHtml}
      </div>
    </div>
  `;
}

// CSS untuk warna cell gelombang
const waveColorStyles = document.createElement('style');
waveColorStyles.textContent = `
  .wave-safe    { background:#d1fae5 !important; color:#065f46 !important; }
  .wave-caution { background:#fef3c7 !important; color:#92400e !important; }
  .wave-warning { background:#fed7aa !important; color:#9a3412 !important; }
  .wave-danger  { background:#fecaca !important; color:#7f1d1d !important; }
`;
document.head.appendChild(waveColorStyles);

function renderActiveChart() {
  const source = (document.getElementById('chart-source-select') || {}).value || 'pelabuhan';
  const data = stateData[source];
  if (!data?.data) return;

  const isPelabuhan = source === 'pelabuhan';
  const rows = data.data;
  const labels = rows.map(r => {
    try {
      const clean = (r.valid_from || r.time_desc || '').replace(' UTC','Z').replace(' ','T');
      return new Date(clean).toLocaleString('id-ID', { timeZone:'Asia/Makassar', day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) + ' WITA';
    } catch(e) { return r.time_desc || '-'; }
  });

  const waveData    = rows.map(r => parseWaveNum(r.wave_desc));
  const windData    = rows.map(r => parseFloat(r.wind_speed_max) || 0);
  const directions  = rows.map(r => r.wind_from || '-');
  const tempData    = isPelabuhan ? rows.map(r => parseFloat(r.temp_max) || 0) : [];
  const curData     = isPelabuhan ? rows.map(r => parseFloat((r.current_speed_max * 100).toFixed(0)) || 0) : [];
  const curDirs     = isPelabuhan ? rows.map(r => r.current_to || '-') : [];

  const canvas = document.getElementById('chart-bmkg-main');
  if (!canvas) return;

  if (chartInstances.main) { chartInstances.main.destroy(); chartInstances.main = null; }

  const commonTooltip = {
    backgroundColor: 'rgba(11,31,58,0.98)', titleColor: 'rgb(34, 211, 238)',
    bodyColor: 'rgb(255,255,255)', borderColor: 'rgba(34, 211, 238, 0.3)',
    borderWidth: 2, padding: 12, displayColors: true, boxPadding: 6,
    titleFont: { size: 13, weight: 'bold' }, bodyFont: { size: 12 }
  };

  const commonScales = {
    x: {
      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10, weight: '600' }, maxRotation: 45 },
      grid: { color: 'rgba(255,255,255,0.05)' }
    }
  };

  let chartConfig;

  if (activeChartParameter === 'wave') {
    chartConfig = {
      type: 'line', data: { labels, datasets: [{
        label: 'Tinggi Gelombang', data: waveData, borderColor: CONFIG.COLORS.WAVE,
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0,0,0,400);
          g.addColorStop(0, 'rgba(56, 189, 248, 0.35)'); g.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
          return g;
        },
        borderWidth: 3.5, fill: true, tension: 0.4, pointBackgroundColor: CONFIG.COLORS.WAVE,
        pointRadius: 6, pointHoverRadius: 9
      }]},
      options: { maintainAspectRatio: false, responsive: true, interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false }, tooltip: { ...commonTooltip, callbacks: {
          label: ctx => ` Gelombang: ${ctx.parsed.y.toFixed(2)} meter`,
          afterLabel: ctx => { const v = ctx.parsed.y; return v > 2.5 ? '⚠️ Tinggi' : v > 1.25 ? '⚡ Sedang' : '✓ Aman'; }
        }}, gelombangBandsDisabled: false },
        scales: { ...commonScales, yAxisL: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
      }
    };
  } else if (activeChartParameter === 'wind') {
    chartConfig = {
      type: 'bar', data: { labels, datasets: [{
        label: 'Kecepatan Angin', data: windData, backgroundColor: 'rgba(249,115,22,0.7)',
        borderColor: CONFIG.COLORS.WIND, borderWidth: 2, borderRadius: 6
      }]},
      options: { maintainAspectRatio: false, responsive: true, interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false }, tooltip: { ...commonTooltip, callbacks: {
          label: ctx => ` Angin: ${ctx.parsed.y.toFixed(1)} knot`,
          afterLabel: (ctx) => { const i = ctx.dataIndex; return `Arah: ${directions[i] || '-'}`; }
        }}, gelombangBandsDisabled: true },
        scales: { ...commonScales, y: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
      }
    };
  } else if (activeChartParameter === 'temp' && isPelabuhan) {
    chartConfig = {
      type: 'line', data: { labels, datasets: [{
        label: 'Suhu Udara', data: tempData, borderColor: CONFIG.COLORS.TEMP,
        backgroundColor: 'rgba(248,113,113,0.15)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5
      }]},
      options: { maintainAspectRatio: false, responsive: true, interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false }, tooltip: { ...commonTooltip, callbacks: { label: ctx => ` Suhu: ${ctx.parsed.y.toFixed(1)}°C` }}, gelombangBandsDisabled: true },
        scales: { ...commonScales, y: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
      }
    };
  } else if (activeChartParameter === 'current' && isPelabuhan) {
    chartConfig = {
      type: 'bar', data: { labels, datasets: [{
        label: 'Kecepatan Arus', data: curData, backgroundColor: 'rgba(74,222,128,0.7)',
        borderColor: CONFIG.COLORS.CURRENT, borderWidth: 2, borderRadius: 6
      }]},
      options: { maintainAspectRatio: false, responsive: true, interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false }, tooltip: { ...commonTooltip, callbacks: {
          label: ctx => ` Arus: ${ctx.parsed.y.toFixed(0)} cm/s`,
          afterLabel: (ctx) => { const i = ctx.dataIndex; return `Arah: ${curDirs[i] || '-'}`; }
        }}, gelombangBandsDisabled: true },
        scales: { ...commonScales, y: { ticks: { color: 'rgba(255,255,255,0.5)' }, grid: { color: 'rgba(255,255,255,0.05)' } } }
      }
    };
  } else {
    return;
  }

  chartInstances.main = new Chart(canvas, chartConfig);
}
