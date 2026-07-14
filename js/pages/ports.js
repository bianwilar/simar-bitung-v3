/**
 * js/pages/ports.js
 * Render halaman kondisi pelabuhan
 */
import { stateData } from '../config.js';
import { sanitizeHTML } from '../utils/security.js';
import { formatWITA } from '../data/api.js';
import { getWeatherIcon } from '../utils/share.js';
import { makeStatusBadge, makeParamRow } from './home.js';

export function renderPorts() {
  if (!stateData.pelabuhan) return;
  const data  = stateData.pelabuhan;
  const pData = data.data[0];
  const lastD = data.data[data.data.length - 1];

  document.getElementById('pelabuhan-valid-period').innerText =
    'Periode Valid: ' + formatWITA(pData.valid_from).split('|')[0].trim() +
    ' — ' + formatWITA(lastD.valid_to).split('|')[0].trim();
  document.getElementById('hero-port-name').innerText = data.name;
  document.getElementById('hero-temp').innerText      = pData.temp_min + ' – ' + pData.temp_max + '°C';
  document.getElementById('hero-wind').innerText      = pData.wind_from + ' ' + pData.wind_speed_min + '–' + pData.wind_speed_max + ' kt';
  document.getElementById('hero-wave').innerText      = pData.wave_desc;
  document.getElementById('hero-wave-cat').innerText  = pData.wave_cat;
  document.getElementById('hero-current').innerText   = (pData.current_speed_max * 100).toFixed(0) + ' cm/s';
  document.getElementById('hero-current-dir').innerText = 'Arus ' + pData.current_from + ' → ' + pData.current_to;
  document.getElementById('hero-desc').innerText      = pData.weather;
  document.getElementById('hero-rh').innerText        = pData.rh_max + '% RH';
  document.getElementById('hero-icon').className      = getWeatherIcon(pData.weather).replace('text-8xl','text-5xl');
  document.getElementById('bg-text').innerText        = data.name.toUpperCase();

  // Visibilitas
  const visEl = document.getElementById('hero-vis');
  if (visEl) {
    const visKm = pData.visibility ? (pData.visibility / 1000).toFixed(1) : '-';
    const visColor = pData.visibility < 3000 ? 'text-red-400'
                   : pData.visibility < 5000 ? 'text-yellow-400'
                   : 'text-green-400';
    visEl.innerText  = visKm + ' km';
    visEl.className  = `text-xl font-black ${visColor}`;
  }

  // Kelembaban (kolom terpisah di baris 2)
  const humEl = document.getElementById('hero-humidity');
  if (humEl) {
    humEl.innerText = pData.rh_max + ' %';
    humEl.className = 'text-xl font-black text-cyan-300';
  }

  const box = document.getElementById('port-forecast-cards');
  box.innerHTML = '';
  data.data.forEach(item => {
    const timeWITA = formatWITA(item.valid_from);
    const isWarn   = item.wave_cat !== 'Tenang' && item.wave_cat !== 'Rendah';
    box.innerHTML += `
      <div class="glass p-6 rounded-[2rem] border-t border-white/10 hover:bg-white/10 transition-all group relative overflow-hidden">
        <div class="flex justify-between items-start mb-5">
          <div class="flex flex-col">
            <span class="text-[10px] font-bold opacity-50 uppercase">Mulai</span>
            <span class="font-mono font-black text-base text-cyan-400 leading-tight">${timeWITA.split(',')[0]}</span>
            <span class="font-mono font-black text-xs text-white/50">${timeWITA.split('|')[1] ? timeWITA.split('|')[1].trim() : ''}</span>
          </div>
          ${makeStatusBadge(isWarn ? 'Waspada' : 'Aman')}
        </div>
        <div class="text-center mb-5">
          <i class="${getWeatherIcon(item.weather).replace('text-8xl','text-4xl text-white/80')} mb-2 group-hover:scale-110 transition-transform block" aria-hidden="true"></i>
          <p class="font-bold text-xs uppercase tracking-tighter">${sanitizeHTML(item.weather)}</p>
        </div>
        <div class="space-y-2 border-t border-white/5 pt-4">
          ${makeParamRow('Angin', `${sanitizeHTML(item.wind_from)} ${item.wind_speed_min}–${item.wind_speed_max} kt`)}
          ${makeParamRow('Gelombang', sanitizeHTML(item.wave_desc))}
          ${makeParamRow('Arus', `${(item.current_speed_max * 100).toFixed(0)} cm/s`, 'text-cyan-400')}
          ${makeParamRow('Suhu', `${item.temp_min}–${item.temp_max}°C`)}
          ${makeParamRow('Kelembaban', `${item.rh_max}%`)}
          ${item.visibility ? makeParamRow('Visibilitas', `${(item.visibility/1000).toFixed(1)} km`) : makeParamRow('Visibilitas', '—')}
        </div>
      </div>`;
  });
}
