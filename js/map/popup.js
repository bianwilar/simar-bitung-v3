/**
 * js/map/popup.js
 * Popup builder untuk kelurahan weather data
 */
import { sanitizeHTML } from '../utils/security.js';
import { safeNum, safeLocaleTime } from '../utils/security.js';
import { getWeatherEmoji } from '../utils/share.js';

/**
 * Build compact weather popup for kelurahan
 */
export function buildKelurahanWeatherPopup(lat, lng, kelurahan, weatherData) {
  if (!weatherData?.data?.[0]?.cuaca?.[0]?.[0]) {
    return `<div style="padding:15px;text-align:center;"><p style="color:#f87171;font-weight:bold;">Data tidak tersedia</p></div>`;
  }

  const currentWeather = weatherData.data[0].cuaca[0][0];

  const safeLocale = (dtStr, opts) => safeLocaleTime(dtStr, opts);
  const updateTime = safeLocale(currentWeather.local_datetime, { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  const safeT   = safeNum(currentWeather.t);
  const safeHu  = safeNum(currentWeather.hu);
  const safeWs  = safeNum(currentWeather.ws);
  const safeTcc = safeNum(currentWeather.tcc);

  const confidence = kelurahan.distance < 0.1
    ? { level: 'SANGAT TINGGI', color: '#22c55e' }
    : kelurahan.distance < 0.3
    ? { level: 'TINGGI', color: '#3b82f6' }
    : { level: 'SEDANG', color: '#eab308' };

  let forecastHtml = '';
  for (let i = 1; i < Math.min(4, weatherData.data[0].cuaca[0].length); i++) {
    const fc    = weatherData.data[0].cuaca[0][i];
    const time  = safeLocale(fc.local_datetime, { hour:'2-digit', minute:'2-digit' });
    const fcT   = safeNum(fc.t);
    forecastHtml += `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:0.65rem;opacity:0.7;min-width:38px;">${sanitizeHTML(time)}</span>
        <span style="font-size:0.65rem;font-weight:600;flex:1;text-align:center;">${sanitizeHTML(fc.weather_desc)}</span>
        <span style="font-size:0.75rem;font-weight:900;color:#22d3ee;">${fcT}°C</span>
      </div>`;
  }

  // Versi ringkas khusus smartphone
  const isMobileDevice = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (isMobileDevice) {
    return `
      <div style="padding:5px 2px;font-family:'Segoe UI',sans-serif;">
        <p style="font-size:0.55rem;opacity:0.4;text-transform:uppercase;margin:0 0 2px;">📍 ${sanitizeHTML(kelurahan.name)}</p>
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px;">
          <span style="font-size:1.2rem;">${getWeatherEmoji(currentWeather.weather_desc)}</span>
          <span style="font-size:0.65rem;font-weight:700;line-height:1.2;">${sanitizeHTML(currentWeather.weather_desc || '-')}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">
          <div style="background:rgba(255,255,255,0.06);border-radius:5px;padding:3px 5px;">
            <p style="font-size:0.5rem;opacity:0.4;margin:0;">Suhu</p>
            <p style="font-size:0.7rem;font-weight:900;margin:0;color:#f87171;">${safeNum(currentWeather.t)}°C</p>
          </div>
          <div style="background:rgba(255,255,255,0.06);border-radius:5px;padding:3px 5px;">
            <p style="font-size:0.5rem;opacity:0.4;margin:0;">Angin</p>
            <p style="font-size:0.7rem;font-weight:900;margin:0;color:#22d3ee;">${safeNum(currentWeather.ws)} km/j</p>
          </div>
        </div>
        <p style="font-size:0.5rem;opacity:0.3;margin:4px 0 0;text-align:center;">↙ detail di kartu info</p>
      </div>`;
  }

  return `
    <div style="padding:4px 0;font-family:'Segoe UI',sans-serif;max-width:260px;overflow:hidden;box-sizing:border-box;word-wrap:break-word;">
      <div style="border-bottom:1.5px solid rgba(34,211,238,0.2);padding-bottom:7px;margin-bottom:7px;">
        <p style="font-size:0.55rem;letter-spacing:0.1em;opacity:0.4;text-transform:uppercase;margin:0 0 2px 0;">📍 Cuaca Daratan</p>
        <h3 style="font-size:0.9rem;font-weight:900;line-height:1.2;margin:0 0 2px 0;">${sanitizeHTML(kelurahan.name)}</h3>
        <p style="font-size:0.65rem;opacity:0.6;margin:0;">Kec. ${sanitizeHTML(kelurahan.kecamatan)}, Kota Bitung</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px;background:rgba(34,211,238,0.05);border-radius:10px;padding:8px;margin-bottom:7px;">
        <div style="font-size:2.2rem;line-height:1;flex-shrink:0;">${getWeatherEmoji(currentWeather.weather_desc)}</div>
        <div>
          <p style="font-size:0.75rem;font-weight:900;margin:0 0 1px 0;">${sanitizeHTML(currentWeather.weather_desc)}</p>
          <p style="font-size:1.4rem;font-weight:900;color:#22d3ee;margin:0;line-height:1;">${safeT}°C</p>
          <p style="font-size:0.6rem;opacity:0.5;margin:0;">${sanitizeHTML(updateTime)} WITA</p>
        </div>
        <span style="margin-left:auto;font-size:0.55rem;padding:2px 6px;border-radius:99px;background:${confidence.color}22;color:${confidence.color};border:1px solid ${confidence.color}44;font-weight:900;white-space:nowrap;">${confidence.level}</span>
      </div>
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
      <div style="background:rgba(255,255,255,0.02);border-radius:8px;padding:7px;margin-bottom:6px;">
        <p style="font-size:0.6rem;font-weight:900;text-transform:uppercase;color:#22d3ee;margin:0 0 5px 0;">📅 Prakiraan Berikutnya</p>
        ${forecastHtml}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:5px;border-top:1px solid rgba(255,255,255,0.05);">
        <p style="font-size:0.55rem;opacity:0.4;margin:0;">${sanitizeHTML(kelurahan.info)}</p>
      </div>
    </div>`;
}
