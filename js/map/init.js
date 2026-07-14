/**
 * js/map/init.js
 * Leaflet map initialization, showPointDetails, buildRichMarinePopup
 * Migrated from web-v2.html
 */
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CONFIG, stateData } from '../config.js';
import { sanitizeHTML } from '../utils/security.js';
import { findNearestKelurahan, isWithinBitung } from '../data/kelurahan.js';
import { fetchWeatherByKelurahan } from '../data/api.js';
import { showErrorNotification } from '../utils/security.js';

let map = null;
let darkMapLayer = null;
let satMapLayer = null;
const mapLayers = { pelabuhan: [], bmkg: [], perairan: [] };

/**
 * Create a custom SVG DivIcon for Leaflet markers.
 * @param {string} color   - Hex/CSS color for the marker background
 * @param {string} emoji   - Emoji or text shown inside the marker
 * @param {number} size    - Pixel size of the marker (width & height)
 * @param {boolean} pulse  - Whether to show a pulsing ring animation
 */
function makeSvgIcon(color, emoji, size = 32, pulse = false) {
  const half = size / 2;
  const pulseEl = pulse
    ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color};opacity:0.35;animation:pulse-ring 1.6s ease-out infinite;pointer-events:none;"></div>`
    : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${pulseEl}
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color};border:2.5px solid rgba(255,255,255,0.8);
        box-shadow:0 2px 8px rgba(0,0,0,0.45);font-size:${Math.round(size * 0.45)}px;
        line-height:1;">${emoji}</div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half],
  });
}

// ── Re-export stateData reference for use in showPointDetails ──
// (stateData is imported from config.js and is mutable)
function showPointDetails(type, data) {
      document.getElementById('map-detail-placeholder').classList.add('hidden');
      const content = document.getElementById('map-detail-content');
      content.classList.remove('hidden');

      const title = document.getElementById('map-detail-title');
      const subtitle = document.getElementById('map-detail-subtitle');
      const badge = document.getElementById('map-detail-badge');
      const coords = document.getElementById('map-detail-coords');
      const actionBtn = document.getElementById('map-detail-action');
      const paramsDiv = document.getElementById('map-detail-params');

      title.innerText = data.nama;
      subtitle.innerText = data.subtitle || '';
      coords.innerText = `${data.coords[0].toFixed(4)}°N, ${data.coords[1].toFixed(4)}°E`;

      if (type === 'pelabuhan') {
        badge.innerText = 'PELABUHAN';
        badge.className = 'px-2.5 py-0.5 rounded-full text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30';
        
        let dynamicInfo = '';
        if (stateData.pelabuhan && (data.nama.includes('PPS Bitung') || data.nama.includes('Samudera Bitung') || data.nama.includes('Pateten') || data.nama.includes('Petikemas'))) {
          const p = stateData.pelabuhan.data[0];
          dynamicInfo = `
            <div class="col-span-2 bg-cyan-500/5 p-3 rounded-2xl border border-cyan-500/10 text-[11px] space-y-1">
              <p class="font-bold text-[9px] text-cyan-400 uppercase">Kondisi Saat Ini (BMKG API)</p>
              <div class="flex justify-between"><span>Cuaca:</span><span class="font-bold text-white">${p.weather}</span></div>
              <div class="flex justify-between"><span>Angin:</span><span class="font-bold text-white">${p.wind_speed_max} Knots (${p.wind_from})</span></div>
              <div class="flex justify-between"><span>Gelombang:</span><span class="font-bold text-yellow-400">${p.wave_desc} (${p.wave_cat})</span></div>
            </div>
          `;
        }

        paramsDiv.innerHTML = `
          ${dynamicInfo}
          <div class="bg-white/5 p-3 rounded-2xl border border-white/5">
            <p class="text-[9px] opacity-40 uppercase font-black">Kedalaman</p>
            <p class="text-xs font-bold text-white">${data.nama.includes('Samudera') || data.nama.includes('Petikemas') ? '± 15 - 20 m' : '± 8 - 12 m'}</p>
          </div>
          <div class="bg-white/5 p-3 rounded-2xl border border-white/5">
            <p class="text-[9px] opacity-40 uppercase font-black">Klasifikasi</p>
            <p class="text-xs font-bold text-white">${data.nama.includes('Samudera') || data.nama.includes('Petikemas') || data.nama.includes('PPS') ? 'Internasional' : 'Lokal / Ferry'}</p>
          </div>
        `;

        actionBtn.onclick = () => {
          if (data.nama.includes('Likupang')) {
            document.getElementById('select-pelabuhan').value = '0465_Likupang.json';
            switchPort('0465_Likupang.json');
          } else {
            document.getElementById('select-pelabuhan').value = '0356_PPS Bitung.json';
            switchPort('0356_PPS Bitung.json');
          }
          navigate('ports');
        };
        actionBtn.innerHTML = '<i class="fas fa-anchor mr-1"></i> LIHAT CUACA PELABUHAN';

      } else if (type === 'bmkg') {
        badge.innerText = 'STASIUN BMKG';
        badge.className = 'px-2.5 py-0.5 rounded-full text-[9px] font-black bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';

        paramsDiv.innerHTML = `
          <div class="bg-white/5 p-3 rounded-2xl border border-white/5 col-span-2">
            <p class="text-[9px] opacity-40 uppercase font-black">Fungsi Stasiun</p>
            <p class="text-xs font-bold text-white leading-relaxed mt-0.5">
              ${data.nama.includes('Maritim') ? 'Rilis info cuaca perairan maritim, tinggi gelombang, pasang air laut, keselamatan jalur laut.' : data.nama.includes('Geofisika') ? 'Pengamatan aktivitas seismik, gempa bumi, radar tsunami, kelistrikan udara.' : 'Observasi curah hujan, iklim makro, cuaca agroklimatologi.'}
            </p>
          </div>
          <div class="bg-white/5 p-3 rounded-2xl border border-white/5">
            <p class="text-[9px] opacity-40 uppercase font-black">Status Operasional</p>
            <p class="text-[11px] font-bold text-green-400 flex items-center gap-1"><i class="fas fa-check-circle"></i> Aktif 24 Jam</p>
          </div>
          <div class="bg-white/5 p-3 rounded-2xl border border-white/5">
            <p class="text-[9px] opacity-40 uppercase font-black">Layanan data</p>
            <p class="text-xs font-bold text-white flex items-center gap-1"><i class="fas fa-satellite-dish text-cyan-400"></i> API Publik</p>
          </div>
        `;

        actionBtn.onclick = () => {
          window.open('https://maritim.bmkg.go.id/', '_blank');
        };
        actionBtn.innerHTML = '<i class="fas fa-external-link-alt mr-1"></i> KUNJUNGI WEB BMKG';

      } else if (type === 'perairan') {
        badge.innerText = 'ZONA PERAIRAN';
        badge.className = 'px-2.5 py-0.5 rounded-full text-[9px] font-black bg-green-500/20 text-green-300 border border-green-500/30';

        let file = 'N.08_Perairan Bitung - Likupang.json';
        if (data.nama.includes('Sitaro')) file = 'N.07_Perairan Kep. Sitaro.json';
        else if (data.nama.includes('Utara Sulawesi')) file = 'N.01_Perairan utara Sulawesi Utara.json';
        else if (data.nama.includes('Laut Sulawesi')) file = 'N.02_Laut Sulawesi bagian barat.json';
        else if (data.nama.includes('Laut Maluku')) file = 'N.10_Laut Maluku bagian selatan.json';

        let dynamicInfo = '';
        if (stateData.perairan && data.nama.includes(stateData.perairan.name.split('–')[0].trim())) {
          const w = stateData.perairan.data[0];
          dynamicInfo = `
            <div class="col-span-2 bg-green-500/5 p-3 rounded-2xl border border-green-500/10 text-[11px] space-y-1">
              <p class="font-bold text-[9px] text-green-400 uppercase">Kondisi Laut Real-time (BMKG)</p>
              <div class="flex justify-between"><span>Gelombang:</span><span class="font-bold text-yellow-400">${w.wave_desc}</span></div>
              <div class="flex justify-between"><span>Angin Laut:</span><span class="font-bold text-white">${w.wind_speed_max} Knots</span></div>
              <div class="flex justify-between"><span>Cuaca Laut:</span><span class="font-bold text-white">${w.weather}</span></div>
            </div>
          `;
        }

        paramsDiv.innerHTML = `
          ${dynamicInfo}
          <div class="bg-white/5 p-3 rounded-2xl border border-white/5 col-span-2">
            <p class="text-[9px] opacity-40 uppercase font-black">Informasi Navigasi</p>
            <p class="text-xs text-white/80 leading-relaxed mt-0.5">
              Meliputi jalur pelayaran kapal dagang menuju Indonesia Timur dan jalur perikanan tangkap Bitung.
            </p>
          </div>
        `;

        actionBtn.onclick = () => {
          document.getElementById('select-perairan').value = file;
          switchPerairan(file);
          navigate('water');
        };
        actionBtn.innerHTML = '<i class="fas fa-chart-area mr-1"></i> ANALISIS PERAIRAN ZONA';
      }
    }

    // === POPUP PETA KAYA DATA BMKG ===

function buildRichMarinePopup(title, subtitle, type, weatherData, sourceName) {
      const getWaveColor = (cat) => {
        if (!cat) return '#22d3ee';
        const c = cat.toLowerCase();
        if (c.includes('sangat tinggi') || c.includes('ekstrem')) return '#ef4444';
        if (c.includes('tinggi')) return '#f97316';
        if (c.includes('sedang')) return '#eab308';
        if (c.includes('rendah')) return '#22c55e';
        return '#22d3ee';
      };
      const getWeatherIcon = (w) => {
        const s = (w || '').toLowerCase();
        if (s.includes('petir') || s.includes('badai')) return '⛈️';
        if (s.includes('hujan lebat')) return '🌧️';
        if (s.includes('hujan')) return '🌦️';
        if (s.includes('berawan tebal')) return '☁️';
        if (s.includes('cerah berawan')) return '⛅';
        if (s.includes('berawan')) return '🌤️';
        if (s.includes('kabut')) return '🌫️';
        return '☀️';
      };
      const statusColor = weatherData && weatherData.wave_cat && (weatherData.wave_cat.includes('Tinggi') || weatherData.wave_cat.includes('Sangat')) ? '#f97316' : '#22c55e';
      const statusText  = weatherData && weatherData.wave_cat && (weatherData.wave_cat.includes('Tinggi') || weatherData.wave_cat.includes('Sangat')) ? '⚠ WASPADA' : '✓ AMAN';
      const waveColor = weatherData ? getWaveColor(weatherData.wave_cat) : '#22d3ee';

      let dataHtml = '';
      if (weatherData) {
        const weatherEmoji = getWeatherIcon(weatherData.weather);
        dataHtml = `
          <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <span style="font-size:1.8rem;line-height:1">${weatherEmoji}</span>
              <div style="text-align:right">
                <div style="font-size:0.7rem;opacity:0.5;text-transform:uppercase;letter-spacing:.08em">Kondisi</div>
                <div style="font-size:0.85rem;font-weight:900;color:white">${weatherData.weather || '—'}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px">
                <div style="font-size:0.62rem;opacity:0.45;text-transform:uppercase;margin-bottom:2px">Gelombang</div>
                <div style="font-size:0.92rem;font-weight:900;color:${waveColor}">${weatherData.wave_desc || '—'}</div>
                <div style="font-size:0.62rem;color:${waveColor};opacity:0.8">${weatherData.wave_cat || ''}</div>
              </div>
              <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px">
                <div style="font-size:0.62rem;opacity:0.45;text-transform:uppercase;margin-bottom:2px">Angin</div>
                <div style="font-size:0.92rem;font-weight:900;color:#22d3ee">${weatherData.wind_speed_max || '—'} kt</div>
                <div style="font-size:0.62rem;color:rgba(255,255,255,0.5)">${weatherData.wind_from || ''}</div>
              </div>
              ${type === 'pelabuhan' ? `
              <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px">
                <div style="font-size:0.62rem;opacity:0.45;text-transform:uppercase;margin-bottom:2px">Suhu Udara</div>
                <div style="font-size:0.92rem;font-weight:900;color:#f87171">${weatherData.temp_min || '—'}–${weatherData.temp_max || '—'}°C</div>
                <div style="font-size:0.62rem;color:rgba(255,255,255,0.5)">RH ${weatherData.rh_max || '—'}%</div>
              </div>
              <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px">
                <div style="font-size:0.62rem;opacity:0.45;text-transform:uppercase;margin-bottom:2px">Arus Laut</div>
                <div style="font-size:0.92rem;font-weight:900;color:#4ade80">${((weatherData.current_speed_max || 0) * 100).toFixed(0)} cm/s</div>
                <div style="font-size:0.62rem;color:rgba(255,255,255,0.5)">${weatherData.current_from ? 'Dari '+weatherData.current_from : ''}</div>
              </div>` : `
              <div style="background:rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px;grid-column:1/-1">
                <div style="font-size:0.62rem;opacity:0.45;text-transform:uppercase;margin-bottom:2px">Periode Gelombang</div>
                <div style="font-size:0.92rem;font-weight:900;color:#a78bfa">${weatherData.wave_period || '—'} detik</div>
              </div>`}
            </div>
            ${weatherData.warning_desc && weatherData.warning_desc !== 'NIL' ? `<div style="margin-top:8px;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:8px 10px;font-size:0.7rem;color:#fca5a5">
              ⚠️ ${weatherData.warning_desc}</div>` : ''}
            <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between">
              <span style="font-size:0.62rem;opacity:0.35">${sourceName ? 'Ref: ' + sanitizeHTML(sourceName) : 'Live · API BMKG'}</span>
              <span style="font-size:0.62rem;font-weight:900;padding:2px 8px;border-radius:99px;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">${statusText}</span>
            </div>
          </div>
        `;
      } else {
        dataHtml = `<div style="margin-top:10px;opacity:0.4;font-size:0.75rem;text-align:center">Data cuaca belum tersedia.</div>`;
      }

      return `<div style="min-width:220px;padding:0.25rem 0">
        <p style="font-size:0.65rem;letter-spacing:0.12em;opacity:0.5;text-transform:uppercase;margin-bottom:0.25rem">${subtitle}</p>
        <h4 style="font-size:1rem;font-weight:900;margin-bottom:0">${title}</h4>
        ${dataHtml}
      </div>`;
    }

export function initMap() {
      map = L.map('map', { zoomControl: false }).setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      darkMapLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com">CARTO</a>',
        maxZoom: 18
      });

      satMapLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, and the GIS User Community',
        maxZoom: 18
      });

      darkMapLayer.addTo(map);

      // ── TITIK FOKUS UTAMA (PPS Bitung) ──
      const getPelData = () => stateData.pelabuhan ? stateData.pelabuhan.data[0] : null;
      const getPerData = (keyword) => {
        if (!stateData.perairan) return null;
        if (stateData.perairan.name && stateData.perairan.name.toLowerCase().includes(keyword.toLowerCase()))
          return stateData.perairan.data[0];
        return null;
      };

      const mainFocus = L.marker(CONFIG.MAP.DEFAULT_CENTER, { icon: makeSvgIcon('#ef4444', '⚓', CONFIG.MAP.MARKER_SIZES.MAIN, true), zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(() => buildRichMarinePopup('PPS Bitung', '⚓ Pelabuhan Perikanan Samudera Utama', 'pelabuhan', getPelData()),
          { maxWidth: 280, className: 'bmkg-popup' });

      mainFocus.on('click', () => {
        showPointDetails('pelabuhan', {
          coords: CONFIG.MAP.DEFAULT_CENTER,
          nama: 'PPS Bitung',
          subtitle: 'Pelabuhan Perikanan Samudera (Pusat)',
          rows: []
        });
      });

      setTimeout(() => {
        showPointDetails('pelabuhan', {
          coords: CONFIG.MAP.DEFAULT_CENTER,
          nama: 'PPS Bitung',
          subtitle: 'Pelabuhan Perikanan Samudera (Pusat)',
          rows: []
        });
        mainFocus.openPopup();
      }, 500);

      // ── DATA PELABUHAN ──
      const pelabuhan = [
        {
          coords: [1.4467, 125.2081], nama: 'PPS Bitung',
          subtitle: 'Pelabuhan Perikanan Samudera',
          rows: [
            { label: 'Kode BMKG', value: '0356', color: '#22d3ee' },
            { label: 'Tipe', value: 'Utama' }
          ]
        },
        {
          coords: [1.4326, 125.1952], nama: 'Terminal Ferry Pateten',
          subtitle: 'Pelabuhan Penyeberangan',
          rows: [
            { label: 'Rute', value: 'Bitung – Ternate / Tobelo', color: '#22d3ee' },
            { label: 'Operator', value: 'ASDP Indonesia Ferry' }
          ]
        },
        {
          coords: [1.6735, 125.0618], nama: 'Pelabuhan Likupang',
          subtitle: 'Pelabuhan Penumpang',
          rows: [
            { label: 'Kode BMKG', value: '0465', color: '#22d3ee' },
            { label: 'Kawasan', value: 'KEK Likupang' }
          ]
        },
        {
          coords: [1.4420, 125.1980], nama: 'Pelabuhan Samudera Bitung',
          subtitle: 'Pelabuhan Kargo Internasional',
          rows: [
            { label: 'Pengelola', value: 'PT Pelindo', color: '#22d3ee' },
            { label: 'Fungsi', value: 'Ekspor / Impor' }
          ]
        },
        {
          coords: [1.4348, 125.2015], nama: 'Pelabuhan Rakyat Ruko Pateten',
          subtitle: 'Dermaga Penyeberangan Lembeh',
          rows: [
            { label: 'Fungsi', value: 'Perahu Taxiboat Lembeh', color: '#22d3ee' },
            { label: 'Tarif Rata-rata', value: 'Rp 10.000 / orang' }
          ]
        },
        {
          coords: [1.4400, 125.1945], nama: 'Terminal Petikemas Bitung (TPB)',
          subtitle: 'Hub Kontainer Maritim',
          rows: [
            { label: 'Kapasitas', value: '± 500.000 TEUs/tahun', color: '#22d3ee' },
            { label: 'Fasilitas', value: 'Gantry Crane Otomatis' }
          ]
        }
      ];

      pelabuhan.forEach(p => {
        if (p.nama === 'PPS Bitung') return;
        const m = L.marker(p.coords, { icon: makeSvgIcon('#22d3ee', '⚓', CONFIG.MAP.MARKER_SIZES.PORT, true) })
          .addTo(map)
          .bindPopup(() => buildRichMarinePopup(p.nama, p.subtitle, 'pelabuhan', getPelData()),
            { maxWidth: 280, className: 'bmkg-popup' });

        m.on('click', () => {
          showPointDetails('pelabuhan', p);
        });

        mapLayers.pelabuhan.push(m);
      });

      // ── STASIUN BMKG ──
      const stasiunBMKG = [
        {
          coords: [1.4520, 125.1750], nama: 'Stasiun Meteorologi Maritim Kelas II Bitung',
          subtitle: '📡 BMKG — Maritim Utama',
          rows: [
            { label: 'Instansi', value: 'BMKG Sulut', color: '#fbbf24' },
            { label: 'Fungsi', value: 'Rilis Prakiraan Cuaca Laut' },
            { label: 'Alamat', value: 'Aertembaga, Kota Bitung' }
          ]
        },
        {
          coords: [1.4550, 124.8430], nama: 'Stasiun Geofisika Kelas M Manado',
          subtitle: '📡 BMKG — Gempa & Tsunami',
          rows: [
            { label: 'Fungsi', value: 'Seismologi & Tsunami', color: '#fbbf24' },
            { label: 'Lokasi', value: 'Winangun, Manado' }
          ]
        },
        {
          coords: [1.4110, 124.9850], nama: 'Stasiun Klimatologi Sulawesi Utara',
          subtitle: '📡 BMKG — Iklim & Cuaca Hujan',
          rows: [
            { label: 'Fungsi', value: 'Informasi Musim & El Nino', color: '#fbbf24' },
            { label: 'Kawasan', value: 'Kab. Minahasa Utara' }
          ]
        }
      ];

      stasiunBMKG.forEach(s => {
        // Build a compact info popup for BMKG stations
        const bmkgPopupHtml = `<div style="min-width:200px;padding:0.25rem 0">
          <p style="font-size:0.65rem;letter-spacing:.1em;opacity:0.5;text-transform:uppercase;margin-bottom:0.25rem">${s.subtitle}</p>
          <h4 style="font-size:0.9rem;font-weight:900;margin-bottom:8px;line-height:1.3">${s.nama}</h4>
          <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;space-y:4px">
            ${s.rows.map(r => `<div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px;font-size:0.75rem">
              <span style="opacity:0.5">${r.label}</span>
              <span style="font-weight:700;color:${r.color || '#fbbf24'}">${r.value}</span>
            </div>`).join('')}
            <div style="margin-top:8px;font-size:0.65rem;color:#4ade80;font-weight:700">✓ Aktif 24 Jam</div>
          </div>
        </div>`;
        const m = L.marker(s.coords, { icon: makeSvgIcon('#fbbf24', '📡', CONFIG.MAP.MARKER_SIZES.BMKG, false) })
          .addTo(map)
          .bindPopup(bmkgPopupHtml, { maxWidth: 260, className: 'bmkg-popup' });

        m.on('click', () => {
          showPointDetails('bmkg', s);
        });

        mapLayers.bmkg.push(m);
      });

      // ── ZONA PERAIRAN ──
      const zonaPerairan = [
        {
          coords: [1.4600, 125.2500], nama: 'Selat Lembeh Utara',
          subtitle: '🌊 Selat & Area Diving',
          rows: [
            { label: 'Status Wisata', value: 'Sangat Ramai / Indah', color: '#4ade80' },
            { label: 'Kecepatan Angin', value: '± 5-12 Knots' }
          ]
        },
        {
          coords: [1.4100, 125.2400], nama: 'Selat Lembeh Selatan',
          subtitle: '🌊 Alur Pelayaran Utama',
          rows: [
            { label: 'Karakter Arus', value: 'Sangat Kuat / Pasang', color: '#4ade80' },
            { label: 'Lebar Selat', value: '± 1.2 km' }
          ]
        },
        {
          coords: [1.3900, 125.1500], nama: 'Perairan Aertembaga',
          subtitle: '🌊 Zona Penangkapan Ikan',
          rows: [
            { label: 'Kawasan', value: 'Sentra Perikanan', color: '#4ade80' },
            { label: 'Kedalaman Laut', value: '± 80 - 150 meter' }
          ]
        },
        {
          coords: [2.0000, 125.3000], nama: 'Laut Maluku Bagian Selatan',
          subtitle: '🌊 Zona BMKG N.10',
          rows: [
            { label: 'Kode BMKG', value: 'N.10', color: '#4ade80' },
            { label: 'Cakupan Gelombang', value: 'Hingga 2.0 Meter' }
          ]
        },
        {
          coords: [2.6000, 125.5000], nama: 'Perairan Utara Sulawesi Utara',
          subtitle: '🌊 Zona BMKG N.01',
          rows: [
            { label: 'Kode BMKG', value: 'N.01', color: '#4ade80' },
            { label: 'Cakupan Gelombang', value: 'Hingga 2.5 Meter' }
          ]
        },
        {
          coords: [2.4500, 125.0000], nama: 'Perairan Kep. Sitaro',
          subtitle: '🌊 Zona BMKG N.07',
          rows: [
            { label: 'Kode BMKG', value: 'N.07', color: '#4ade80' },
            { label: 'Cakupan Gelombang', value: 'Hingga 2.0 Meter' }
          ]
        }
      ];

      zonaPerairan.forEach(z => {
        const m = L.circleMarker(z.coords, {
          radius: 13, fillColor: '#4ade80', color: 'white',
          weight: 2.5, fillOpacity: 0.85
        }).addTo(map).bindPopup(() => {
          // Selalu tampilkan data perairan yang sedang aktif untuk semua zona
          const perData = stateData.perairan ? stateData.perairan.data[0] : null;
          const sourceName = stateData.perairan ? stateData.perairan.name : null;
          return buildRichMarinePopup(z.nama, z.subtitle, 'perairan', perData, sourceName);
        }, { maxWidth: 280, className: 'bmkg-popup' });

        m.on('click', () => {
          showPointDetails('perairan', z);
        });

        mapLayers.perairan.push(m);
      });

      // ── MAP CLICK HANDLER for DARATAN (Kelurahan Weather) ──
      map.on('click', async function(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Check if within Bitung boundaries
        if (!isWithinBitung(lat, lng)) {
          L.popup({ maxWidth: 300, className: 'bmkg-popup' })
            .setLatLng(e.latlng)
            .setContent(`
              <div style="text-align:center;padding:15px;">
                <i class="fas fa-map-marker-alt fa-2x mb-3 text-yellow-400"></i>
                <p style="font-size:0.85rem;font-weight:bold;margin-bottom:5px;">Lokasi di Luar Kota Bitung</p>
                <p style="font-size:0.7rem;opacity:0.6;">${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</p>
                <p style="font-size:0.7rem;margin-top:8px;opacity:0.5;">Data cuaca hanya tersedia untuk area Kota Bitung</p>
              </div>
            `)
            .openOn(map);
          return;
        }
        
        // Find nearest kelurahan
        const nearest = findNearestKelurahan(lat, lng);
        
        if (!nearest) {
          return;
        }
        
        // ALWAYS fetch weather data (no distance limit!)
        // Show loading popup first
        L.popup({ maxWidth: 350, className: 'bmkg-popup' })
          .setLatLng(e.latlng)
          .setContent(`
            <div style="text-align:center;padding:20px;">
              <i class="fas fa-satellite-dish fa-3x mb-3 animate-pulse text-cyan-400"></i>
              <p style="font-size:0.85rem;font-weight:bold;margin-bottom:5px;">Mengambil Data Cuaca...</p>
              <p style="font-size:0.75rem;color:#22d3ee;">${sanitizeHTML(nearest.name)}</p>
              <p style="font-size:0.7rem;opacity:0.5;margin-top:3px;">Kec. ${sanitizeHTML(nearest.kecamatan)}</p>
            </div>
          `)
          .openOn(map);
        
        try {
          // Fetch weather data
          const weatherData = await fetchWeatherByKelurahan(nearest.code);
          
          // Build detailed popup
          const popupContent = buildKelurahanWeatherPopup(lat, lng, nearest, weatherData);
          
          // Update popup with actual data
          L.popup({ maxWidth: 280, className: 'bmkg-popup' })
            .setLatLng(e.latlng)
            .setContent(popupContent)
            .openOn(map);
          
        } catch (err) {
          console.error('Failed to fetch kelurahan weather:', err);
          
          // Show error with fallback to maritime data if available
          let fallbackHtml = '';
          if (stateData.pelabuhan && stateData.pelabuhan.data[0]) {
            const pelData = stateData.pelabuhan.data[0];
            fallbackHtml = `
              <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;margin-top:10px;">
                <p style="font-size:0.7rem;opacity:0.6;margin-bottom:8px;">Data Alternatif dari PPS Bitung:</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                  <div style="background:rgba(255,255,255,0.05);padding:6px;border-radius:6px;">
                    <p style="font-size:0.6rem;opacity:0.5;">Cuaca</p>
                    <p style="font-size:0.75rem;font-weight:bold;">${sanitizeHTML(pelData.weather)}</p>
                  </div>
                  <div style="background:rgba(255,255,255,0.05);padding:6px;border-radius:6px;">
                    <p style="font-size:0.6rem;opacity:0.5;">Suhu</p>
                    <p style="font-size:0.75rem;font-weight:bold;">${pelData.temp_max}°C</p>
                  </div>
                  <div style="background:rgba(255,255,255,0.05);padding:6px;border-radius:6px;">
                    <p style="font-size:0.6rem;opacity:0.5;">Angin</p>
                    <p style="font-size:0.75rem;font-weight:bold;">${pelData.wind_speed_max} kt</p>
                  </div>
                  <div style="background:rgba(255,255,255,0.05);padding:6px;border-radius:6px;">
                    <p style="font-size:0.6rem;opacity:0.5;">Kelembapan</p>
                    <p style="font-size:0.75rem;font-weight:bold;">${pelData.rh_max}%</p>
                  </div>
                </div>
                <p style="font-size:0.65rem;opacity:0.4;margin-top:8px;">⚠️ Data maritim sebagai referensi umum</p>
              </div>
            `;
          }
          
          L.popup({ maxWidth: 350, className: 'bmkg-popup' })
            .setLatLng(e.latlng)
            .setContent(`
              <div style="padding:15px;">
                <div style="text-align:center;margin-bottom:10px;">
                  <i class="fas fa-exclamation-triangle fa-2x mb-3 text-yellow-400"></i>
                  <p style="font-size:0.85rem;font-weight:bold;color:#eab308;">Data Kelurahan Tidak Tersedia</p>
                </div>
                <div style="background:rgba(251,191,36,0.1);border-left:3px solid #fbbf24;padding:8px;border-radius:6px;margin-bottom:10px;">
                  <p style="font-size:0.75rem;font-weight:600;margin-bottom:3px;">${sanitizeHTML(nearest.name)}</p>
                  <p style="font-size:0.7rem;opacity:0.7;">Kec. ${sanitizeHTML(nearest.kecamatan)} • ${nearest.distance.toFixed(2)} km dari titik klik</p>
                </div>
                <p style="font-size:0.7rem;opacity:0.6;margin-bottom:5px;">${sanitizeHTML(err.message)}</p>
                ${fallbackHtml}
              </div>
            `)
            .openOn(map);
          
          showErrorNotification('Data BMKG sementara tidak tersedia, menggunakan data alternatif', 'warning');
        }
      });
    }

    /**
     * Build detailed weather popup for kelurahan
     */
    function buildKelurahanWeatherPopup(lat, lng, kelurahan, weatherData) {
      if (!weatherData || !weatherData.data || !weatherData.data[0]) {
        return `<div style="padding:15px;text-align:center;">
          <p class="text-red-400 font-bold">Data tidak tersedia</p>
        </div>`;
      }
      
      const currentWeather = weatherData.data[0].cuaca[0][0]; // First forecast
      const lokasi = weatherData.lokasi;
      
      // Get confidence level based on distance
      const getConfidence = (dist) => {
        if (dist < 0.1) return { level: 'SANGAT TINGGI', color: '#22c55e', desc: 'Data spesifik untuk kelurahan ini' };
        if (dist < 0.3) return { level: 'TINGGI', color: '#3b82f6', desc: 'Data akurat untuk area ini' };
        return { level: 'SEDANG', color: '#eab308', desc: 'Estimasi dari kelurahan terdekat' };
      };
      
      const confidence = getConfidence(kelurahan.distance);
      
      // Helper: format tanggal lokal dengan fallback aman
      const safeLocaleTime = (dtStr, opts) => {
        try {
          const d = new Date(dtStr);
          if (isNaN(d.getTime())) return '-';
          return d.toLocaleString('id-ID', { timeZone: 'Asia/Makassar', ...opts });
        } catch(e) { return '-'; }
      };

      // Helper: validasi & sanitize nilai numerik dari API
      const safeNum = (val, fallback = '-') => {
        const n = Number(val);
        return isFinite(n) ? n : fallback;
      };

      // Format waktu (fix: try/catch untuk Date parsing)
      const updateTime = safeLocaleTime(currentWeather.local_datetime, {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      });

      // Sanitize numeric fields dari API (fix: prevent XSS dari nilai tak terduga)
      const safeT   = safeNum(currentWeather.t);
      const safeHu  = safeNum(currentWeather.hu);
      const safeWs  = safeNum(currentWeather.ws);
      const safeTcc = safeNum(currentWeather.tcc);
      
      // Get next 3 forecasts
      let forecastHtml = '';
      for (let i = 1; i < Math.min(4, weatherData.data[0].cuaca[0].length); i++) {
        const fc = weatherData.data[0].cuaca[0][i];
        const time = safeLocaleTime(fc.local_datetime, { hour: '2-digit', minute: '2-digit' });
        const fcT   = safeNum(fc.t);
        forecastHtml += `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:0.65rem;opacity:0.7;min-width:38px;">${sanitizeHTML(time)}</span>
            <span style="font-size:0.65rem;font-weight:600;flex:1;text-align:center;">${sanitizeHTML(fc.weather_desc)}</span>
            <span style="font-size:0.75rem;font-weight:900;color:#22d3ee;">${fcT}°C</span>
          </div>
        `;
      }
      
      return `
        <div style="width:260px;padding:4px 0;font-family:'Segoe UI',sans-serif;">
          <!-- Header -->
          <div style="border-bottom:1.5px solid rgba(34,211,238,0.2);padding-bottom:7px;margin-bottom:7px;">
            <p style="font-size:0.55rem;letter-spacing:0.1em;opacity:0.4;text-transform:uppercase;margin:0 0 2px 0;">📍 Cuaca Daratan</p>
            <h3 style="font-size:0.9rem;font-weight:900;line-height:1.2;margin:0 0 2px 0;">${sanitizeHTML(kelurahan.name)}</h3>
            <p style="font-size:0.65rem;opacity:0.6;margin:0;">Kec. ${sanitizeHTML(kelurahan.kecamatan)}, Kota Bitung</p>
          </div>
          
          <!-- Current Weather -->
          <div style="display:flex;align-items:center;gap:10px;background:rgba(34,211,238,0.05);border-radius:10px;padding:8px;margin-bottom:7px;">
            <div style="font-size:2.2rem;line-height:1;flex-shrink:0;">${getWeatherEmoji(currentWeather.weather_desc)}</div>
            <div>
              <p style="font-size:0.75rem;font-weight:900;margin:0 0 1px 0;">${sanitizeHTML(currentWeather.weather_desc)}</p>
              <p style="font-size:1.4rem;font-weight:900;color:#22d3ee;margin:0;line-height:1;">${safeT}°C</p>
              <p style="font-size:0.6rem;opacity:0.5;margin:0;">${sanitizeHTML(updateTime)} WITA</p>
            </div>
            <span style="margin-left:auto;font-size:0.55rem;padding:2px 6px;border-radius:99px;background:${confidence.color}22;color:${confidence.color};border:1px solid ${confidence.color}44;font-weight:900;white-space:nowrap;">${confidence.level}</span>
          </div>
          
          <!-- Parameters Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:7px;">
            <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:5px 7px;">
              <p style="font-size:0.55rem;opacity:0.4;text-transform:uppercase;margin:0 0 1px 0;">💧 Kelembapan</p>
              <p style="font-size:0.85rem;font-weight:900;margin:0;">${safeHu}%</p>
            </div>
            <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:5px 7px;">
              <p style="font-size:0.55rem;opacity:0.4;text-transform:uppercase;margin:0 0 1px 0;">🌬️ Angin</p>
              <p style="font-size:0.85rem;font-weight:900;margin:0;">${safeWs} <span style="font-size:0.6rem;font-weight:400;">km/j</span></p>
              <p style="font-size:0.6rem;opacity:0.5;margin:0;">dari ${sanitizeHTML(currentWeather.wd)}</p>
            </div>
            <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:5px 7px;">
              <p style="font-size:0.55rem;opacity:0.4;text-transform:uppercase;margin:0 0 1px 0;">☁️ Awan</p>
              <p style="font-size:0.85rem;font-weight:900;margin:0;">${safeTcc}%</p>
            </div>
            <div style="background:rgba(255,255,255,0.04);border-radius:6px;padding:5px 7px;">
              <p style="font-size:0.55rem;opacity:0.4;text-transform:uppercase;margin:0 0 1px 0;">👁️ Pandang</p>
              <p style="font-size:0.85rem;font-weight:900;margin:0;">${sanitizeHTML(currentWeather.vs_text)}</p>
            </div>
          </div>
          
          <!-- Forecast -->
          <div style="background:rgba(255,255,255,0.02);border-radius:8px;padding:7px;margin-bottom:6px;">
            <p style="font-size:0.6rem;font-weight:900;text-transform:uppercase;color:#22d3ee;margin:0 0 5px 0;">📅 Prakiraan Berikutnya</p>
            ${forecastHtml}
          </div>
          
          <!-- Footer -->
          <div style="display:flex;justify-content:space-between;align-items:center;padding-top:5px;border-top:1px solid rgba(255,255,255,0.05);">
            <p style="font-size:0.55rem;opacity:0.4;margin:0;">${sanitizeHTML(kelurahan.info)}</p>
          </div>
        </div>
      `;
    }
export function invalidateMapSize() {
  if (map) map.invalidateSize();
}

export function addNowcastPolygon(coords, title) {
  if (!map || !coords || coords.length < 3) return;
  try {
    return L.polygon(coords, {
      color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15,
      weight: 2, dashArray: '6, 4', className: 'nowcast-polygon'
    }).addTo(map).bindPopup(
      '<div style="padding:8px;"><p style="font-size:0.6rem;opacity:0.5;text-transform:uppercase;margin-bottom:4px;">Peringatan BMKG</p><p style="font-size:0.85rem;font-weight:900;">' + sanitizeHTML(title) + '</p></div>',
      { maxWidth: 250, className: 'bmkg-popup' });
  } catch(e) { console.warn('Failed to add nowcast polygon:', e); }
}

export function toggleLayer(type) {
  const layers = mapLayers[type];
  if (!layers) return;
  const visible = layers.length > 0 && map.hasLayer(layers[0]);
  layers.forEach(l => visible ? map.removeLayer(l) : l.addTo(map));
}

let isSatelliteMode = false;

export function toggleMapTheme() {
  if (!map || !darkMapLayer || !satMapLayer) return;
  
  const btn   = document.getElementById('map-theme-btn');
  const label = document.getElementById('map-theme-label');

  if (isSatelliteMode) {
    // Kembali ke dark map
    map.removeLayer(satMapLayer);
    darkMapLayer.addTo(map);
    isSatelliteMode = false;
    if (label) label.textContent = 'Peta Satelit';
    if (btn) btn.style.borderColor = '';
  } else {
    // Beralih ke satelit
    map.removeLayer(darkMapLayer);
    satMapLayer.addTo(map);
    isSatelliteMode = true;
    if (label) label.textContent = 'Peta Gelap';
    if (btn) btn.style.borderColor = '#f59e0b';
  }
}

export function resetMap() {
  if (!map) return;
  map.flyTo(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM, {
    animate: true,
    duration: 1
  });
}