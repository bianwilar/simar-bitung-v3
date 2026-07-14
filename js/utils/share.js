/**
 * js/utils/share.js
 * Share via WhatsApp and MWI calculation
 */
import { CONFIG, stateData } from '../config.js';
import { sanitizeHTML } from './security.js';
import { showErrorNotification } from './security.js';

export function parseWaveNum(waveDesc) {
  if (!waveDesc) return 0;
  const match = waveDesc.match(/([\d\.]+)\s*-\s*([\d\.]+)/);
  if (match) return parseFloat(match[2]);
  const single = waveDesc.match(/[\d\.]+/);
  return single ? parseFloat(single[0]) : 0;
}

export function getWeatherEmoji(w) {
  const s = (w || '').toLowerCase();
  if (s.includes('petir') || s.includes('badai')) return '⛈️';
  if (s.includes('hujan lebat')) return '🌧️';
  if (s.includes('hujan')) return '🌦️';
  if (s.includes('berawan tebal')) return '☁️';
  if (s.includes('cerah berawan')) return '⛅';
  if (s.includes('berawan')) return '🌤️';
  if (s.includes('kabut')) return '🌫️';
  return '☀️';
}

export function getWeatherIcon(w) {
  const s = (w || '').toLowerCase();
  if (s.includes('hujan lebat') || s.includes('badai')) return 'fas fa-cloud-showers-heavy text-blue-300';
  if (s.includes('hujan')) return 'fas fa-cloud-rain text-blue-400';
  if (s.includes('cerah berawan')) return 'fas fa-cloud-sun text-yellow-400';
  if (s.includes('berawan')) return 'fas fa-cloud text-gray-300';
  return 'fas fa-sun text-yellow-400';
}

export function calculateMWI(pData) {
  const waveH = parseWaveNum(pData.wave_desc);
  let waveScore = waveH <= 0.3 ? 10 : waveH <= 0.5 ? 9 : waveH <= 0.75 ? 8 : waveH <= 1.0 ? 7 :
    waveH <= 1.25 ? 6 : waveH <= 1.75 ? 5 : waveH <= 2.5 ? 3 : waveH <= 3.5 ? 2 : 1;

  const wind = parseFloat(pData.wind_speed_max) || 0;
  let windScore = wind <= 5 ? 10 : wind <= 10 ? 9 : wind <= 15 ? 7 : wind <= 20 ? 5 :
    wind <= 25 ? 3 : wind <= 30 ? 2 : 1;

  const vis = parseFloat(pData.visibility) || 0;
  let visScore = vis >= 10000 ? 10 : vis >= 7000 ? 8 : vis >= 5000 ? 6 : vis >= 3000 ? 4 : vis >= 1000 ? 2 : 1;

  const wx = (pData.weather || '').toLowerCase();
  let wxScore = wx.includes('cerah') && !wx.includes('berawan') ? 10 :
    wx.includes('cerah berawan') ? 8 : wx.includes('berawan') ? 6 :
    wx.includes('hujan ringan') ? 4 : wx.includes('hujan') || wx.includes('petir') ? 2 :
    wx.includes('badai') || wx.includes('lebat') ? 1 : 7;

  const score = Math.round(((waveScore * 0.4) + (windScore * 0.3) + (visScore * 0.2) + (wxScore * 0.1)) * 10) / 10;

  let label, sublabel, color;
  if (score >= 8.5)      { label = 'Sangat Baik'; sublabel = 'Kondisi ideal untuk semua aktivitas laut'; color = '#22c55e'; }
  else if (score >= 7)   { label = 'Baik';         sublabel = 'Aman untuk berlayar dengan persiapan normal'; color = '#4ade80'; }
  else if (score >= 5.5) { label = 'Cukup';        sublabel = 'Perhatikan perkembangan cuaca, siapkan perlengkapan'; color = '#facc15'; }
  else if (score >= 4)   { label = 'Kurang Baik';  sublabel = 'Tidak disarankan untuk kapal kecil (< 5 GT)'; color = '#fb923c'; }
  else if (score >= 2.5) { label = 'Buruk';         sublabel = 'Berbahaya, hindari berlayar jika tidak mendesak'; color = '#f87171'; }
  else                   { label = 'Sangat Buruk'; sublabel = 'Kondisi ekstrem, tetap di darat/pelabuhan'; color = '#ef4444'; }

  return {
    score, label, sublabel, color,
    components: {
      wave:    { score: waveScore,  pct: waveScore * 10,  val: `${waveH.toFixed(1)} m`,           color: '#38bdf8' },
      wind:    { score: windScore,  pct: windScore * 10,  val: `${wind} kt`,                       color: '#fb923c' },
      vis:     { score: visScore,   pct: visScore * 10,   val: `${(vis/1000).toFixed(1)} km`,      color: '#4ade80' },
      weather: { score: wxScore,    pct: wxScore * 10,    val: sanitizeHTML(pData.weather || '-'), color: '#facc15' }
    }
  };
}

export function shareToWhatsApp() {
  if (!stateData.pelabuhan || !stateData.perairan) {
    showErrorNotification('Data cuaca belum tersedia. Coba refresh terlebih dahulu.', 'warning');
    return;
  }
  const pData = stateData.pelabuhan.data[0];
  const mwi   = stateData.mwi || calculateMWI(pData);
  const now   = new Date().toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const statusEmoji = mwi.score >= 7 ? '✅' : mwi.score >= 4 ? '⚠️' : '🚫';
  const waveH = parseWaveNum(pData.wave_desc);

  const text = [
    `🌊 *SIMAR Bitung* — Kondisi Laut`,
    `📅 ${now} WITA`,
    ``,
    `📍 *${sanitizeHTML(stateData.pelabuhan.name)}*`,
    ``,
    `🌤️ Cuaca: *${sanitizeHTML(pData.weather)}*`,
    `🌊 Gelombang: *${sanitizeHTML(pData.wave_desc)} m* (${sanitizeHTML(pData.wave_cat)})`,
    `💨 Angin: *${pData.wind_speed_min}–${pData.wind_speed_max} knot* dari ${sanitizeHTML(pData.wind_from)}`,
    `🌡️ Suhu: *${pData.temp_min}–${pData.temp_max}°C*`,
    `💧 Kelembapan: *${pData.rh_max}%*`,
    `👁️ Visibilitas: *${(pData.visibility/1000).toFixed(1)} km*`,
    ``,
    `📊 *Marine Weather Index: ${mwi.score.toFixed(1)}/10 — ${mwi.label}*`,
    `${statusEmoji} ${mwi.sublabel}`,
    ``,
    `📡 _Data resmi BMKG | SIMAR Bitung_`
  ].join('\n');

  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}
