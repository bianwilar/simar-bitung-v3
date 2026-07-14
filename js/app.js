/**
 * js/app.js
 * Entry point utama SIMAR Bitung v3
 */

// CSS - hanya custom styles (Tailwind via CDN di HTML, Leaflet CSS via CDN di HTML)
import '../css/styles.css';

// Core config & state
import { CONFIG, stateData, nowcastState, bitungCoords } from './config.js';

// Utils
import { sanitizeHTML, showErrorNotification, showLoadingState } from './utils/security.js';
import { debounce, DOMCache } from './utils/performance.js';
import { shareToWhatsApp, calculateMWI, parseWaveNum, getWeatherEmoji, getWeatherIcon } from './utils/share.js';
import { applyMaritimeTooltips } from './utils/tooltip.js';

// Data
import { DataCache, fetchWithRetry, encodeFileName, formatWITA, fetchWeatherByKelurahan, switchPerairan as _switchPerairan, switchPort as _switchPort } from './data/api.js';
import { bitungKelurahan, findNearestKelurahan, calculateDistance, isWithinBitung } from './data/kelurahan.js';

// Nowcast
import { fetchNowcast, showNowcastAlert, clearNowcastAlert, showNowcastDetail, dismissNowcastBanner } from './nowcast/nowcast.js';

// Pages
import { renderHome, renderMWI, renderWeeklyCalendar, showWeeklyDayDetail, makeStatusBadge, makeParamRow, _updateShipSvgColor } from './pages/home.js';
import { renderWater } from './pages/water.js';
import { renderPorts } from './pages/ports.js';
import { saveHistorySnapshot } from './data/history.js';

// Charts, Map & History (lazy import saat dibutuhkan)
let mapModule     = null;
let chartsModule  = null;
let historyModule = null;

// ============================================================
// EXPOSE ke window (diperlukan oleh onclick handlers di HTML)
// ============================================================
window.navigate         = navigate;
window.refreshData      = refreshData;
window.shareToWhatsApp  = shareToWhatsApp;
window.showNowcastDetail = showNowcastDetail;
window.dismissNowcastBanner = dismissNowcastBanner;
window.showWeeklyDayDetail  = showWeeklyDayDetail;
window.switchPerairan   = (f) => _switchPerairan(f, renderWater);
window.switchPort       = (f) => _switchPort(f, () => { renderHome(); renderPorts(); });
window.closeMobileMenu  = closeMobileMenu;

// History handlers (dipanggil dari onchange dropdown + onclick tombol klasifikasi)
window.loadHistoryData = async () => {
  if (!historyModule) historyModule = await import('./pages/history.js');
  historyModule.loadHistoryData();
};
window.setKlasifikasi = async (k) => {
  if (!historyModule) historyModule = await import('./pages/history.js');
  historyModule.setKlasifikasi(k);
};

window.downloadHistoryExcel = async () => {
  if (!historyModule) historyModule = await import('./pages/history.js');
  historyModule.downloadHistoryExcel();
};

// Ganti sumber data grafik (pelabuhan / perairan) lalu render ulang
window.onChartSourceChange = async () => {
  if (!chartsModule) chartsModule = await import('./charts/charts.js');
  const source = document.getElementById('chart-source-select')?.value || 'pelabuhan';
  // Tampilkan/sembunyikan banner info perairan
  const banner = document.getElementById('charts-info-banner');
  if (banner) banner.classList.toggle('hidden', source !== 'perairan');
  // Nonaktifkan tombol parameter yang tidak tersedia untuk perairan
  ['temp', 'current'].forEach(p => {
    const btn = document.getElementById(`pill-param-${p}`);
    if (btn) {
      btn.disabled = source === 'perairan';
      btn.className = source === 'perairan'
        ? 'pill-param-btn bg-white/5 border-2 border-white/10 text-white/30 px-6 py-3.5 rounded-full text-sm font-bold cursor-not-allowed opacity-30'
        : 'pill-param-btn bg-white/5 border-2 border-white/10 hover:bg-white/10 text-white/60 hover:text-white px-6 py-3.5 rounded-full text-sm font-bold transition-all hover:scale-105 active:scale-95';
    }
  });
  chartsModule.renderCharts();
};

// Ganti format tampilan (grafik visual / tabel prakiraan resmi)
window.onChartFormatChange = async () => {
  if (!chartsModule) chartsModule = await import('./charts/charts.js');
  const format = document.getElementById('chart-format-select')?.value || 'visual';
  const visualArea   = document.getElementById('charts-visual-area');
  const officialArea = document.getElementById('charts-official-area');
  if (visualArea)   visualArea.classList.toggle('hidden',   format !== 'visual');
  if (officialArea) officialArea.classList.toggle('hidden', format !== 'official');
  chartsModule.renderCharts();
};

// Download PDF halaman grafik dengan html2canvas + jsPDF
window.downloadPDF = async () => {
  const btn = document.getElementById('btn-download-pdf');
  if (!btn) return;
  
  // Cek library sudah loaded
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    alert('Library PDF belum siap. Tunggu beberapa detik dan coba lagi.');
    return;
  }
  
  const origText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyiapkan PDF...';
  btn.disabled = true;
  
  try {
    const { jsPDF } = window.jspdf;
    const source = document.getElementById('chart-source-select')?.value || 'pelabuhan';
    const now = new Date();
    
    // Selalu capture tabel prakiraan resmi (official area)
    const area = document.getElementById('charts-official-area');
    const bgColor = '#ffffff';
    
    if (!area) {
      throw new Error('Tabel prakiraan resmi tidak ditemukan');
    }
    
    // Pastikan area visible sementara untuk di-capture
    const wasHidden = area.classList.contains('hidden');
    if (wasHidden) {
      area.classList.remove('hidden');
    }
    
    // Capture area sebagai canvas
    const canvas = await html2canvas(area, {
      scale: 2,
      backgroundColor: bgColor,
      useCORS: true,
      logging: false,
      windowWidth: area.scrollWidth,
      windowHeight: area.scrollHeight
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height / canvas.width) * pdfW;
    
    // Tambahkan gambar ke PDF
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
    
    // Jika tinggi melebihi 1 halaman, tambahkan halaman baru
    if (pdfH > pdf.internal.pageSize.getHeight()) {
      const pageH = pdf.internal.pageSize.getHeight();
      let yOffset = pageH;
      while (yOffset < pdfH) {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, pdfH);
        yOffset += pageH;
      }
    }
    
    // Download PDF dengan nama file dinamis
    const timestamp = now.toISOString().slice(0, 10);
    const fileName = `SiMarBitung_Prakiraan_Resmi_${source}_${timestamp}.pdf`;
    pdf.save(fileName);
    
    // Kembalikan visibility jika sebelumnya hidden
    if (wasHidden) {
      setTimeout(() => area.classList.add('hidden'), 100);
    }
    
  } catch(err) {
    console.error('Error saat membuat PDF:', err);
    alert('Gagal membuat PDF. Pastikan koneksi internet aktif dan coba lagi.');
  } finally {
    btn.innerHTML = origText;
    btn.disabled = false;
  }
};

// ============================================================
// NAVIGATION
// ============================================================
const navMap = { home:'nav-home', map:'nav-map', water:'nav-water', ports:'nav-ports', guide:'nav-guide', charts:'nav-charts', history:'nav-history' };

function closeMobileMenu() {
  document.getElementById('mobile-menu')?.classList.add('hidden');
  const icon = document.getElementById('hamburger-icon');
  if (icon) icon.className = 'fas fa-bars';
}

function navigate(view) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('view-' + view)?.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.remove('active');
    l.removeAttribute('aria-current');
  });
  const link = document.getElementById(navMap[view]);
  if (link) { link.classList.add('active'); link.setAttribute('aria-current', 'page'); }

  closeMobileMenu();

      if (view === 'map') {
        setTimeout(async () => {
          if (!mapModule) {
            mapModule = await import('./map/init.js');
            mapModule.initMap();
            // Expose fungsi peta ke window setelah modul dimuat
            window.toggleMapTheme = () => mapModule.toggleMapTheme();
            window.resetMap       = () => mapModule.resetMap();
            window.toggleLayer    = (t) => mapModule.toggleLayer(t);
          } else {
            mapModule.invalidateMapSize();
          }
          if (nowcastState.active?.polygon && !nowcastState.polygon) {
            mapModule.addNowcastPolygon(nowcastState.active.polygon, nowcastState.active.title);
          }
        }, 150);
      }
  if (view === 'guide') debouncedUpdateSimulator();
  if (view === 'charts') {
    const tryRender = async () => {
      if (!chartsModule) chartsModule = await import('./charts/charts.js');
      chartsModule.renderCharts();
    };
    setTimeout(tryRender, 50);
  }
  if (view === 'history') {
    const tryRender = async () => {
      if (!historyModule) historyModule = await import('./pages/history.js');
      historyModule.renderHistory();
    };
    setTimeout(tryRender, 50);
  }
  window.scrollTo(0, 0);
}

// ============================================================
// FETCH BMKG DATA
// ============================================================
let countdownSeconds  = CONFIG.REFRESH_INTERVAL / 1000;
let countdownInterval = null;

function setCardsBusy(busy) {
  const c = document.getElementById('cards-container');
  if (c) c.setAttribute('aria-busy', busy ? 'true' : 'false');
}

function updateLastUpdateTime() {
  const el = document.getElementById('lastUpdate');
  if (!el) return;
  const now = new Date();
  el.innerText = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0') + ' WITA';
}

function updateFreshnessIndicator() {
  const el = document.getElementById('lastUpdateFreshness');
  if (!el || !stateData.lastFetchTime) return;
  const ageMin = Math.floor((Date.now() - stateData.lastFetchTime) / 60000);
  let text, cls;
  if (ageMin < 5)       { text = 'Data segar';          cls = 'freshness-fresh'; }
  else if (ageMin < 10) { text = `${ageMin} menit lalu`; cls = 'freshness-ok';   }
  else if (ageMin < 15) { text = `${ageMin} menit lalu`; cls = 'freshness-stale';}
  else                  { text = 'Data lama, perlu refresh'; cls = 'freshness-old'; }
  el.textContent = text;
  el.className = `text-[10px] mt-0.5 ${cls}`;
}

function startRefreshCountdown() {
  countdownSeconds = CONFIG.REFRESH_INTERVAL / 1000;
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdownSeconds--;
    const el = document.getElementById('refresh-countdown');
    if (el) {
      const mins = Math.floor(countdownSeconds / 60).toString().padStart(2,'0');
      const secs = (countdownSeconds % 60).toString().padStart(2,'0');
      el.textContent = `${mins}:${secs}`;
      el.className = countdownSeconds <= 60 ? 'font-bold font-mono freshness-stale'
                   : countdownSeconds <= 180 ? 'font-bold font-mono freshness-ok'
                   : 'font-bold font-mono text-white';
    }
    if (countdownSeconds % 60 === 0) updateFreshnessIndicator();
    if (countdownSeconds <= 0) countdownSeconds = CONFIG.REFRESH_INTERVAL / 1000;
  }, 1000);
}

async function fetchBMKGData() {
  const icon = document.getElementById('sync-icon');
  if (icon) icon.classList.add('fa-spin');
  setCardsBusy(true);

  try {
    const cachedPel = DataCache.get('pelabuhan_0356');
    const cachedPer = DataCache.get('perairan_N08');

    if (cachedPel && cachedPer && !navigator.onLine) {
      stateData.pelabuhan = cachedPel;
      stateData.perairan  = cachedPer;
      stateData.lastFetchTime = Date.now();
      showErrorNotification('Menggunakan data cache (offline)', 'info');
    } else {
      showLoadingState('cards-container', 'Mengambil data dari BMKG...');
      const [pelData, perData] = await Promise.all([
        fetchWithRetry('https://peta-maritim.bmkg.go.id/public_api/pelabuhan/' + encodeFileName('0356_PPS Bitung.json')),
        fetchWithRetry('https://peta-maritim.bmkg.go.id/public_api/perairan/'  + encodeFileName('N.08_Perairan Bitung - Likupang.json'))
      ]);
      stateData.pelabuhan = pelData;
      stateData.perairan  = perData;
      stateData.lastFetchTime = Date.now();
      DataCache.set('pelabuhan_0356', pelData);
      DataCache.set('perairan_N08', perData);
      showErrorNotification('Data berhasil diperbarui', 'success');
    }

    updateLastUpdateTime();
    updateFreshnessIndicator();
    renderHome(); renderWater(); renderPorts();
    setCardsBusy(false);

    // Simpan snapshot ke history setiap kali data berhasil dimuat
    try { saveHistorySnapshot(); } catch(e) { console.warn('History snapshot gagal:', e); }

  } catch(err) {
    console.error('Gagal mengambil data BMKG:', err);
    setCardsBusy(false);

    const cachedPel = DataCache.get('pelabuhan_0356');
    const cachedPer = DataCache.get('perairan_N08');

    if (cachedPel && cachedPer) {
      stateData.pelabuhan = cachedPel;
      stateData.perairan  = cachedPer;
      stateData.lastFetchTime = Date.now();
      showErrorNotification('Gagal memuat data baru. Menggunakan data cache.', 'warning');
      updateFreshnessIndicator();
      renderHome(); renderWater(); renderPorts();
    } else {
      showErrorNotification('Gagal mengambil data dari BMKG. Periksa koneksi internet Anda.', 'error');
      updateFreshnessIndicator();
      const container = document.getElementById('cards-container');
      if (container) container.innerHTML = `
        <div class="col-span-full glass p-12 rounded-[2rem] text-center">
          <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
          <h3 class="text-2xl font-bold mb-2">Gagal Memuat Data</h3>
          <p class="text-white/60 mb-6">Tidak dapat terhubung ke server BMKG</p>
          <button onclick="refreshData()" class="bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-xl font-bold transition min-h-[44px]">
            <i class="fas fa-sync-alt mr-2"></i> Coba Lagi
          </button>
        </div>`;
    }
  } finally {
    if (icon) icon.classList.remove('fa-spin');
  }
}

function refreshData() {
  const selPer = document.getElementById('select-perairan');
  const selPel = document.getElementById('select-pelabuhan');
  if (selPer) selPer.value = 'N.08_Perairan Bitung - Likupang.json';
  if (selPel) selPel.value = '0356_PPS Bitung.json';
  fetchBMKGData();
}
window.refreshData = refreshData;

// ============================================================
// SIMULATOR (Panduan Aman)
// ============================================================
function updateSimulator() {
  const waveSlider = DOMCache.simWaveSlider || document.getElementById('sim-wave-slider');
  const windSlider = DOMCache.simWindSlider || document.getElementById('sim-wind-slider');
  if (!waveSlider || !windSlider) return;

  const wave = parseFloat(waveSlider.value);
  const wind = parseInt(windSlider.value);

  const waveValEl = document.getElementById('sim-wave-val');
  const windValEl = document.getElementById('sim-wind-val');
  if (waveValEl) waveValEl.innerText = `${wave.toFixed(1)} meter`;
  if (windValEl) windValEl.innerText = `${wind} knot`;

  if (waveSlider) { waveSlider.setAttribute('aria-valuenow', wave); waveSlider.setAttribute('aria-valuetext', `${wave.toFixed(1)} meter`); }
  if (windSlider) { windSlider.setAttribute('aria-valuenow', wind); windSlider.setAttribute('aria-valuetext', `${wind} knot`); }

  const getStatus = (waveMax, windMax) => {
    if (wave > waveMax || wind > windMax) return {
      label: 'BAHAYA', cardClass: 'border-red-500 bg-red-500/5',
      badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/30',
      desc: wave > waveMax ? `Sangat berbahaya! Gelombang ${wave.toFixed(1)}m melebihi batas aman (${waveMax.toFixed(1)}m).` : `Sangat berbahaya! Angin ${wind} knot melebihi batas kapal (${windMax} knot).`
    };
    if (wave > waveMax * 0.6 || wind > windMax * 0.6) return {
      label: 'WASPADA', cardClass: 'border-yellow-500 bg-yellow-500/5',
      badgeClass: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      desc: 'Harap hati-hati. Ombak bergulung dan tiupan angin dapat mengganggu keseimbangan kapal.'
    };
    return {
      label: 'AMAN', cardClass: 'border-green-500 bg-green-500/5',
      badgeClass: 'bg-green-500/20 text-green-400 border border-green-500/30',
      desc: 'Kondisi sangat aman untuk melakukan pelayaran.'
    };
  };

  ['small','medium','large'].forEach((size, i) => {
    const limits = [CONFIG.SHIP_LIMITS.SMALL, CONFIG.SHIP_LIMITS.MEDIUM, CONFIG.SHIP_LIMITS.LARGE][i];
    const s = getStatus(limits.wave, limits.wind);
    const card  = document.getElementById(`sim-card-${size}`);
    const badge = document.getElementById(`sim-badge-${size}`);
    const desc  = document.getElementById(`sim-desc-${size}`);
    if (card)  card.className  = `glass p-6 rounded-[2rem] border-t-4 ${s.cardClass} flex flex-col justify-between transition-all duration-300`;
    if (badge) { badge.innerText = s.label; badge.className = `px-2 py-0.5 rounded text-[8px] font-black uppercase ${s.badgeClass}`; }
    if (desc)  desc.innerText = s.desc;
  });

  // Animasi kapal simulator
  const simShipContainer = document.getElementById('sim-ship-container');
  const simWaterStatus   = document.getElementById('sim-water-status');

  // Warna SVG kapal berubah sesuai kondisi gelombang
  const simShipSvg = document.getElementById('sim-ship-svg');
  if (simShipSvg) _updateShipSvgColor(simShipSvg, wave);

  // Animasi kapal: 3 tingkat intensitas + kecepatan dinamis
  if (simShipContainer) {
    simShipContainer.classList.remove('ship-bobbing', 'ship-wobbling', 'ship-storming');
    if (wave <= 1.0) {
      const dur = wave <= 0.3 ? '4s' : '2.8s';
      simShipContainer.style.setProperty('--kapal-durasi', dur);
      simShipContainer.classList.add('ship-bobbing');
    } else if (wave <= 2.5) {
      const dur = wave <= 1.5 ? '2s' : '1.4s';
      simShipContainer.style.setProperty('--kapal-durasi', dur);
      simShipContainer.classList.add('ship-wobbling');
    } else {
      const dur = wave <= 3.5 ? '1s' : '0.7s';
      simShipContainer.style.setProperty('--kapal-durasi', dur);
      simShipContainer.classList.add('ship-storming');
    }
  }

  // Overall water status badge
  if (simWaterStatus) {
    const overallDanger = wave > CONFIG.SHIP_LIMITS.SMALL.wave || wind > CONFIG.SHIP_LIMITS.SMALL.wind;
    const overallWarn   = wave > CONFIG.SHIP_LIMITS.SMALL.wave * 0.6 || wind > CONFIG.SHIP_LIMITS.SMALL.wind * 0.6;
    if (overallDanger) {
      simWaterStatus.textContent  = 'BERBAHAYA';
      simWaterStatus.className    = 'px-3 py-1 rounded-full text-[9px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/30';
    } else if (overallWarn) {
      simWaterStatus.textContent  = 'WASPADA';
      simWaterStatus.className    = 'px-3 py-1 rounded-full text-[9px] font-black uppercase bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    } else {
      simWaterStatus.textContent  = 'AMAN';
      simWaterStatus.className    = 'px-3 py-1 rounded-full text-[9px] font-black uppercase bg-green-500/20 text-green-400 border border-green-500/30';
    }
  }

  // Wave SVG scale based on wave height
  const simWaveSvg = document.getElementById('sim-wave-svg');
  if (simWaveSvg) {
    const scale = Math.min(1 + wave * 0.3, 2.5);
    simWaveSvg.style.transform = `scaleY(${scale})`;

    // Wave animation speed
    const waveDuration = wave <= 0.5 ? '8s' : wave <= 1.5 ? '5s' : wave <= 3.0 ? '3s' : '1.8s';
    const paths = simWaveSvg.querySelectorAll('path');
    if (paths[0]) paths[0].style.animationDuration = waveDuration;
    if (paths[1]) paths[1].style.animationDuration = `${parseFloat(waveDuration) * 0.7}s`;
  }
}
window.updateSimulator = updateSimulator;
const debouncedUpdateSimulator = debounce(updateSimulator, 150);
window.debouncedUpdateSimulator = debouncedUpdateSimulator;

// ============================================================
// ONLINE/OFFLINE STATUS
// ============================================================
function updateOnlineStatus() {
  const indicator = document.getElementById('online-indicator');
  if (!navigator.onLine) {
    indicator?.classList.remove('hidden');
    showErrorNotification('Koneksi internet terputus. Data ditampilkan dari cache.', 'warning');
  } else {
    indicator?.classList.add('hidden');
  }
}
window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  const shortcuts = {
    '1':'home', '2':'map', '3':'water', '4':'ports', '5':'charts', '6':'guide', '7':'history',
    'r': () => refreshData(),
    'Escape': () => closeMobileMenu()
  };
  const action = shortcuts[e.key];
  if (typeof action === 'string')   { e.preventDefault(); navigate(action); }
  else if (typeof action === 'function') { e.preventDefault(); action(); }
});

// ============================================================
// INITIALIZATION
// ============================================================
window.onload = async () => {
  DOMCache.init();
  updateOnlineStatus();

  // Map di-init saat user navigate ke tab PETA (bukan di sini)
  // karena Leaflet tidak bisa render di element yang display:none

  fetchBMKGData();
  fetchNowcast();
  updateSimulator();
  startRefreshCountdown();

  // Mobile menu
  const mobileBtn = document.getElementById('mobile-btn');
  if (mobileBtn) {
    mobileBtn.onclick = () => {
      const menu = document.getElementById('mobile-menu');
      const icon = document.getElementById('hamburger-icon');
      if (menu && icon) {
        const hidden = menu.classList.toggle('hidden');
        icon.className = hidden ? 'fas fa-bars' : 'fas fa-times';
      }
    };
  }

  // Auto-refresh
  setInterval(() => {
    fetchBMKGData();
    startRefreshCountdown();
  }, CONFIG.REFRESH_INTERVAL);

  setInterval(() => {
    nowcastState.dismissed = false;
    fetchNowcast();
  }, 10 * 60 * 1000);

  window.addEventListener('pagehide', () => {
    if (countdownInterval) clearInterval(countdownInterval);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (countdownInterval) clearInterval(countdownInterval); }
    else startRefreshCountdown();
  });

  console.log('SIMAR Bitung v3 initialized successfully');
};
