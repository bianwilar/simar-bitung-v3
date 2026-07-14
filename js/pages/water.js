/**
 * js/pages/water.js
 * Render halaman kondisi perairan
 */
import { stateData } from '../config.js';
import { sanitizeHTML } from '../utils/security.js';
import { formatWITA } from '../data/api.js';
import { getWeatherIcon } from '../utils/share.js';
import { makeStatusBadge } from './home.js';

export function renderWater() {
  if (!stateData.perairan) return;
  const d0       = stateData.perairan.data[0];
  const lastData = stateData.perairan.data[stateData.perairan.data.length - 1];
  const proxy    = stateData.pelabuhan ? stateData.pelabuhan.data[0] : null;

  document.getElementById('water-title').innerText = stateData.perairan.name || 'Perairan';
  document.getElementById('perairan-valid-until').innerText = formatWITA(lastData.valid_to);

  const banner = document.getElementById('water-warning-banner');
  if (d0.warning_desc && d0.warning_desc !== 'NIL') {
    banner.classList.remove('hidden');
    banner.className = banner.className.replace(/bg-\S+/g,'').replace(/border\s+border-\S+/g,'');
    banner.classList.add('bg-red-600/30', 'border', 'border-red-500/40');
    banner.querySelector('div:first-child').classList.add('bg-red-600', 'shadow-red-900/50');
    document.getElementById('water-warning-title').innerText = '⚠ Peringatan Cuaca Maritim';
    document.getElementById('water-warning-desc').innerText = d0.warning_desc;
  } else {
    banner.classList.add('hidden');
  }

  document.getElementById('water-weather-icon').className = getWeatherIcon(d0.weather) + ' text-8xl';
  document.getElementById('water-weather-name').innerText = d0.weather;
  document.getElementById('water-wind-dir').innerText   = d0.wind_from + ' → ' + d0.wind_to;
  document.getElementById('water-wind-speed').innerText = d0.wind_speed_min + ' - ' + d0.wind_speed_max;
  document.getElementById('water-wave-height').innerText = d0.wave_desc.replace('m','').trim();
  document.getElementById('water-wave-cat').innerText   = 'Kategori: ' + d0.wave_cat;

  // Suhu, kelembaban, dan visibilitas tidak tersedia di data perairan BMKG.
  // Ditampilkan dari data pelabuhan terdekat (PPS Bitung) sebagai referensi.
  if (proxy) {
    document.getElementById('water-temp').innerText = proxy.temp_max + '°C';
    document.getElementById('water-rh').innerHTML   = `<i class="fas fa-tint mr-1"></i>${proxy.rh_max}% RH <span style="font-size:8px;opacity:0.45;">(Ref. Pelabuhan)</span>`;
    document.getElementById('water-vis').innerHTML  = `<i class="fas fa-eye mr-1"></i>${(proxy.visibility/1000).toFixed(1)} KM <span style="font-size:8px;opacity:0.45;">(Ref. Pelabuhan)</span>`;
  } else {
    document.getElementById('water-temp').innerText = '— °C';
    document.getElementById('water-rh').innerHTML   = '<i class="fas fa-tint mr-1"></i>— % RH';
    document.getElementById('water-vis').innerHTML  = '<i class="fas fa-eye mr-1"></i>— KM';
  }

  const tableBody = document.getElementById('water-table-body');
  tableBody.innerHTML = '';
  stateData.perairan.data.forEach(row => {
    const isWarn = row.wave_cat !== 'Tenang' && row.wave_cat !== 'Rendah' && row.wave_cat !== 'Rendah - Sedang';
    const statusBadge = makeStatusBadge(isWarn ? 'Waspada' : 'Aman');
    tableBody.innerHTML += `
      <tr class="border-b border-white/5 hover:bg-white/5 transition">
        <td class="py-4 px-3 font-bold text-cyan-400 whitespace-nowrap">${row.time_desc}</td>
        <td class="py-4 px-3">
          <span class="flex items-center gap-2">
            <i class="${getWeatherIcon(row.weather).replace('text-8xl','text-lg')}" aria-hidden="true"></i>
            ${sanitizeHTML(row.weather)}
          </span>
        </td>
        <td class="py-4 px-3">${sanitizeHTML(row.wind_from)} → ${sanitizeHTML(row.wind_to)}</td>
        <td class="py-4 px-3">${row.wind_speed_min} – ${row.wind_speed_max} kt</td>
        <td class="py-4 px-3">${sanitizeHTML(row.wave_desc)} <span class="text-[10px] bg-white/10 px-2 py-0.5 rounded ml-1">${sanitizeHTML(row.wave_cat)}</span></td>
        <td class="py-4 px-3">${statusBadge}</td>
      </tr>`;
  });
}
