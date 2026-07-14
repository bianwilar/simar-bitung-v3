/**
 * js/pages/home.js
 * Render halaman beranda: parameter cards, MWI, aktivitas, kalender mingguan
 */
import { CONFIG, stateData } from '../config.js';
import { sanitizeHTML } from '../utils/security.js';
import { parseWaveNum, getWeatherIcon, getWeatherEmoji, calculateMWI } from '../utils/share.js';
import { applyMaritimeTooltips } from '../utils/tooltip.js';

export function makeStatusBadge(status) {
  const map = {
    'Aman':    { bg: 'bg-green-500/20',  text: 'text-green-400',  border: 'border-green-500/30' },
    'Waspada': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    'Bahaya':  { bg: 'bg-red-500/20',    text: 'text-red-400',    border: 'border-red-500/30' }
  };
  const s = map[status] || map['Aman'];
  return `<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${s.bg} ${s.text} border ${s.border}">${sanitizeHTML(status)}</span>`;
}

export function makeParamRow(label, value, color = 'text-cyan-400') {
  return `<div class="flex justify-between text-[10px] font-bold">
    <span class="text-white/30 uppercase">${sanitizeHTML(label)}</span>
    <span class="${color}">${sanitizeHTML(String(value))}</span>
  </div>`;
}

export function makeStatCard(icon, label, value, unit, colorClass, badge = '') {
  return `
    <div class="glass p-5 rounded-2xl">
      <div class="flex items-center justify-between mb-2">
        <i class="${sanitizeHTML(icon)} ${colorClass} text-lg"></i>
        ${badge}
      </div>
      <p class="text-[10px] text-white/40 uppercase font-bold">${sanitizeHTML(label)}</p>
      <p class="text-2xl font-black ${colorClass}">${sanitizeHTML(String(value))}<span class="text-xs font-normal ml-1 text-white/50">${sanitizeHTML(unit)}</span></p>
    </div>`;
}

export function renderMWI(pData) {
  const section = document.getElementById('mwi-section');
  if (!section) return;
  const mwi = calculateMWI(pData);
  section.classList.remove('hidden');

  const scoreEl = document.getElementById('mwi-score');
  const arcEl   = document.getElementById('mwi-arc');
  const labelEl = document.getElementById('mwi-label');
  const subEl   = document.getElementById('mwi-sublabel');

  if (scoreEl) scoreEl.textContent = mwi.score.toFixed(1);
  if (labelEl) { labelEl.textContent = mwi.label; labelEl.style.color = mwi.color; }
  if (subEl)   subEl.textContent = mwi.sublabel;
  if (arcEl) {
    arcEl.style.strokeDashoffset = 251.2 - (mwi.score / 10) * 251.2;
    arcEl.style.stroke = mwi.color;
  }

  [
    { key: 'wave', barId: 'mwi-bar-wave', valId: 'mwi-val-wave' },
    { key: 'wind', barId: 'mwi-bar-wind', valId: 'mwi-val-wind' },
    { key: 'vis',  barId: 'mwi-bar-vis',  valId: 'mwi-val-vis'  },
    { key: 'weather', barId: 'mwi-bar-weather', valId: 'mwi-val-weather' }
  ].forEach(({ key, barId, valId }) => {
    const c = mwi.components[key];
    const bar = document.getElementById(barId);
    const val = document.getElementById(valId);
    if (bar) { bar.style.width = `${c.pct}%`; bar.style.backgroundColor = c.color; }
    if (val) val.textContent = `${c.val} (${c.score}/10)`;
  });

  stateData.mwi = mwi;
}

export function renderWeeklyCalendar() {
  if (!stateData.pelabuhan) return;
  const section = document.getElementById('weekly-calendar-section');
  const grid    = document.getElementById('weekly-calendar-grid');
  if (!section || !grid) return;

  const rows = stateData.pelabuhan.data;
  if (!rows || rows.length === 0) return;

  const dayMap = {};
  rows.forEach(r => {
    try {
      const clean = (r.valid_from || '').replace(' UTC','Z').replace(' ','T');
      const d = new Date(clean);
      if (isNaN(d.getTime())) return;
      const dayKey   = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'short', day: 'numeric', month: 'short' });
      const dayShort = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', weekday: 'short' });
      const dayNum   = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: 'numeric' });
      const monthShort = d.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', month: 'short' });
      if (!dayMap[dayKey]) dayMap[dayKey] = { label: dayKey, dayShort, dayNum, monthShort, date: d, waves: [], winds: [], weathers: [], items: [] };
      dayMap[dayKey].waves.push(parseWaveNum(r.wave_desc));
      dayMap[dayKey].winds.push(parseFloat(r.wind_speed_max) || 0);
      dayMap[dayKey].weathers.push(r.weather || 'Cerah');
      dayMap[dayKey].items.push(r);
    } catch(e) {}
  });

  const days = Object.values(dayMap).slice(0, 7);
  if (days.length === 0) return;

  section.classList.remove('hidden');
  grid.innerHTML = '';

  days.forEach((day, idx) => {
    const maxWave = Math.max(...day.waves);
    const avgWind = day.winds.reduce((a,b) => a+b, 0) / day.winds.length;
    const wxCount = {};
    day.weathers.forEach(w => { wxCount[w] = (wxCount[w] || 0) + 1; });
    const domWeather = Object.keys(wxCount).sort((a,b) => wxCount[b] - wxCount[a])[0];

    const isToday = idx === 0;
    const isGood  = maxWave <= CONFIG.WAVE_THRESHOLDS.RENDAH && avgWind <= CONFIG.WIND_THRESHOLDS.SEDANG;
    const isBad   = maxWave > CONFIG.WAVE_THRESHOLDS.SEDANG  || avgWind > CONFIG.WIND_THRESHOLDS.KENCANG;

    const borderColor = isBad ? 'border-red-500/40' : isGood ? 'border-green-500/30' : 'border-yellow-500/30';
    const bgColor     = isBad ? 'bg-red-500/5'      : isGood ? 'bg-green-500/5'      : 'bg-yellow-500/5';
    const statusDot   = isBad ? 'bg-red-500'        : isGood ? 'bg-green-500'        : 'bg-yellow-500';
    const todayRing   = isToday ? 'ring-2 ring-cyan-400/50' : '';

    grid.innerHTML += `
      <button onclick="window.showWeeklyDayDetail(${idx})"
              class="glass p-3 rounded-2xl border ${borderColor} ${bgColor} ${todayRing} text-center hover:scale-105 transition-all cursor-pointer min-h-[44px]"
              aria-label="Detail cuaca ${sanitizeHTML(day.label)}">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[9px] font-black uppercase opacity-50">${sanitizeHTML(day.dayShort)}</span>
          <span class="w-2 h-2 rounded-full ${statusDot} flex-shrink-0"></span>
        </div>
        <p class="text-xl font-black leading-none mb-1">${sanitizeHTML(day.dayNum)}</p>
        <p class="text-[9px] opacity-40 mb-3">${sanitizeHTML(day.monthShort)}</p>
        <div class="text-2xl mb-2">${getWeatherEmoji(domWeather)}</div>
        <p class="text-[10px] font-bold text-cyan-400">${maxWave.toFixed(1)} m</p>
        <p class="text-[9px] opacity-50">${Math.round(avgWind)} kt</p>
        ${isToday ? '<p class="text-[8px] font-black text-cyan-400 mt-1 uppercase tracking-wider">Hari Ini</p>' : ''}
      </button>`;
  });

  stateData.calendarDays = days;
}

export function showWeeklyDayDetail(idx) {
  const day = stateData.calendarDays?.[idx];
  if (!day) return;
  const detailSection = document.getElementById('weekly-day-detail');
  const titleEl       = document.getElementById('weekly-detail-title');
  const contentEl     = document.getElementById('weekly-detail-content');
  if (!detailSection || !titleEl || !contentEl) return;

  titleEl.textContent = day.label;
  contentEl.innerHTML = '';

  day.items.forEach(item => {
    try {
      const clean = (item.valid_from || '').replace(' UTC','Z').replace(' ','T');
      const d = new Date(clean);
      const timeStr = isNaN(d.getTime()) ? item.time_desc : d.toLocaleString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' });
      const wave = parseWaveNum(item.wave_desc);
      const isWarn = wave > CONFIG.WAVE_THRESHOLDS.RENDAH;
      contentEl.innerHTML += `
        <div class="glass p-3 rounded-xl border ${isWarn ? 'border-yellow-500/20' : 'border-white/5'}">
          <p class="text-[9px] font-black uppercase opacity-50 mb-1">${sanitizeHTML(timeStr)} WITA</p>
          <div class="text-xl mb-1">${getWeatherEmoji(item.weather)}</div>
          <p class="text-[10px] font-bold mb-2">${sanitizeHTML(item.weather)}</p>
          ${makeParamRow('Gelombang', `${sanitizeHTML(item.wave_desc)} m`)}
          ${makeParamRow('Angin', `${item.wind_speed_min}–${item.wind_speed_max} kt`)}
        </div>`;
    } catch(e) {}
  });

  detailSection.classList.remove('hidden');
  detailSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

export function renderHome() {
  if (!stateData.pelabuhan || !stateData.perairan) return;
  const pData = stateData.pelabuhan.data[0];

  // Helper: konversi arah angin ke deskripsi Indonesia
  const getWindDesc = (from, to) => {
    const dirMap = {
      'N':'Utara', 'NNE':'Utara-Timur Laut', 'NE':'Timur Laut', 'ENE':'Timur-Timur Laut',
      'E':'Timur', 'ESE':'Timur-Tenggara', 'SE':'Tenggara', 'SSE':'Selatan-Tenggara',
      'S':'Selatan', 'SSW':'Selatan-Barat Daya', 'SW':'Barat Daya', 'WSW':'Barat-Barat Daya',
      'W':'Barat', 'WNW':'Barat-Barat Laut', 'NW':'Barat Laut', 'NNW':'Utara-Barat Laut'
    };
    const fromID = dirMap[from] || from || '-';
    const toID   = dirMap[to]   || to   || '';
    return toID ? `dari ${fromID} → ${toID}` : `dari ${fromID}`;
  };

  const cardsData = [
    {
      label: 'Kecepatan Angin',
      value: pData.wind_speed_max,
      unit: 'knot',
      icon: 'fas fa-wind',
      desc: getWindDesc(pData.wind_from, pData.wind_to),
      level: parseFloat(pData.wind_speed_max) > CONFIG.WIND_THRESHOLDS.KENCANG ? 'danger'
           : parseFloat(pData.wind_speed_max) > CONFIG.WIND_THRESHOLDS.SEDANG  ? 'warn' : 'safe',
      anim: 'drift'
    },
    {
      label: 'Tinggi Gelombang',
      value: parseWaveNum(pData.wave_desc).toFixed(1),
      unit: 'meter',
      icon: 'fas fa-water',
      desc: pData.wave_cat,
      level: parseWaveNum(pData.wave_desc) > CONFIG.WAVE_THRESHOLDS.SEDANG  ? 'danger'
           : parseWaveNum(pData.wave_desc) > CONFIG.WAVE_THRESHOLDS.RENDAH  ? 'warn' : 'safe',
      anim: ''
    },
    {
      label: 'Suhu Permukaan',
      value: pData.temp_max,
      unit: '°C',
      icon: 'fas fa-temperature-high',
      desc: 'Suhu Maks.',
      level: parseFloat(pData.temp_max) > 33 ? 'warn' : 'safe',
      anim: 'spin'
    },
    {
      label: 'Kelembaban',
      value: pData.rh_max,
      unit: '%',
      icon: 'fas fa-tint',
      desc: 'Udara Lembab',
      level: 'safe',
      anim: 'raindrop'
    },
    {
      label: 'Visibilitas',
      value: (pData.visibility/1000).toFixed(1),
      unit: 'km',
      icon: 'fas fa-eye',
      desc: pData.weather,
      level: pData.visibility < 3000 ? 'danger' : pData.visibility < 5000 ? 'warn' : 'safe',
      anim: ''
    },
    {
      label: 'Kecepatan Arus',
      value: (pData.current_speed_max * 100).toFixed(0),
      unit: 'cm/s',
      icon: 'fas fa-location-arrow',
      desc: 'Arus ke ' + (pData.current_to || '-'),
      level: 'safe',
      anim: ''
    }
  ];

  const container = document.getElementById('cards-container');
  if (!container) return;
  container.setAttribute('aria-busy', 'false');
  container.innerHTML = '';
  cardsData.forEach(item => {
    const borderColor = item.level === 'danger' ? '#f87171'
                      : item.level === 'warn'   ? '#facc15'
                      : '#22d3ee';
    const iconColor = item.level === 'danger' ? 'text-red-400' : item.level === 'warn' ? 'text-yellow-400' : 'text-cyan-400';
    const iconBg    = item.level === 'danger' ? 'bg-red-500/10' : item.level === 'warn' ? 'bg-yellow-500/10' : 'bg-white/5';
    const valColor  = item.level === 'danger' ? 'text-red-400' : item.level === 'warn' ? 'text-yellow-400' : 'text-white';
    const descColor = item.level === 'danger' ? 'text-red-400/70' : item.level === 'warn' ? 'text-yellow-400/70' : 'text-cyan-400/60';
    const anim      = item.anim === 'spin' ? 'sun-icon' : item.anim === 'drift' ? 'cloud-icon' : item.anim === 'raindrop' ? 'raindrop' : '';
    container.innerHTML += `
      <div class="glass p-8 rounded-[2rem] flex items-center gap-6 transition hover:-translate-y-2"
           style="border-left: 4px solid ${borderColor};">
        <div class="text-4xl p-5 ${iconBg} rounded-2xl ${iconColor} flex-shrink-0">
          <i class="${sanitizeHTML(item.icon)} ${anim}" aria-hidden="true"></i>
        </div>
        <div>
          <p class="text-[10px] font-black uppercase text-white/30 tracking-widest">${sanitizeHTML(item.label)}</p>
          <p class="text-4xl font-black ${valColor}">${sanitizeHTML(item.value.toString())}<span class="text-sm font-normal ml-1 text-white/50">${sanitizeHTML(item.unit)}</span></p>
          <p class="text-[10px] ${descColor} mt-2 font-bold">${sanitizeHTML(item.desc)}</p>
        </div>
      </div>`;
  });

  const alertBox = document.getElementById('alerts-container');
  if (!alertBox) return;
  alertBox.innerHTML = '';
  const alerts = [];
  if (pData.warning_desc && pData.warning_desc !== 'NIL')
    alerts.push({ title: 'Peringatan Pelabuhan (' + stateData.pelabuhan.name + ')', msg: pData.warning_desc, level: 'warn' });
  if (stateData.perairan.data[0].warning_desc && stateData.perairan.data[0].warning_desc !== 'NIL')
    alerts.push({ title: 'Peringatan Laut — ' + stateData.perairan.name, msg: stateData.perairan.data[0].warning_desc, level: 'warn' });
  if (alerts.length === 0)
    alerts.push({ title: 'Kondisi Aman', msg: 'Tidak ada peringatan cuaca buruk dari BMKG untuk saat ini.', level: 'safe' });

  alerts.forEach(a => {
    const border = a.level === 'warn' ? 'border-yellow-500' : 'border-cyan-500';
    const iconColor = a.level === 'warn' ? 'text-yellow-400' : 'text-cyan-400';
    const badge = makeStatusBadge(a.level === 'warn' ? 'Waspada' : 'Aman');
    alertBox.innerHTML += `
      <div class="glass p-5 rounded-2xl border-l-4 ${border} flex gap-4">
        <i class="fas fa-exclamation-circle ${iconColor} text-2xl mt-1 flex-shrink-0" aria-hidden="true"></i>
        <div class="flex-grow">
          <div class="flex items-center gap-2 mb-1">
            <h4 class="font-black text-sm uppercase">${sanitizeHTML(a.title)}</h4>
            ${badge}
          </div>
          <p class="text-xs text-white/50">${sanitizeHTML(a.msg)}</p>
        </div>
      </div>`;
  });

  renderMWI(pData);
  renderActivityRecommendations(pData);
  renderLiveOceanVisualizer(pData);
  renderWeeklyCalendar();

  requestAnimationFrame(() => {
    applyMaritimeTooltips('cards-container');
    applyMaritimeTooltips('alerts-container');
  });
}

function renderActivityRecommendations(pData) {
  const box = document.getElementById('activity-recommendations');
  if (!box) return;

  const waveH = parseWaveNum(pData.wave_desc);
  const wind  = parseFloat(pData.wind_speed_max) || 0;
  const vis   = parseFloat(pData.visibility) || 0;

  // Determine status for each activity
  const activities = [
    {
      icon: 'fas fa-ship',
      label: 'Kapal Besar',
      desc: 'Feri & Kontainer',
      ok:   waveH <= CONFIG.SHIP_LIMITS.LARGE.wave && wind <= CONFIG.SHIP_LIMITS.LARGE.wind,
      warn: waveH <= CONFIG.SHIP_LIMITS.LARGE.wave * 1.3 && wind <= CONFIG.SHIP_LIMITS.LARGE.wind * 1.3,
      detail: `Gelombang ${pData.wave_desc} m · Angin ${wind} knot`,
    },
    {
      icon: 'fas fa-sailboat',
      label: 'Kapal Kecil',
      desc: 'Perahu & Nelayan',
      ok:   waveH <= CONFIG.SHIP_LIMITS.SMALL.wave && wind <= CONFIG.SHIP_LIMITS.SMALL.wind,
      warn: waveH <= CONFIG.SHIP_LIMITS.MEDIUM.wave && wind <= CONFIG.SHIP_LIMITS.MEDIUM.wind,
      detail: `Maks aman ${CONFIG.SHIP_LIMITS.SMALL.wave} m / ${CONFIG.SHIP_LIMITS.SMALL.wind} knot`,
    },
    {
      icon: 'fas fa-swimmer',
      label: 'Aktivitas Air',
      desc: 'Renang & Selam',
      ok:   waveH <= 0.5 && vis >= 5000,
      warn: waveH <= 1.0 && vis >= 3000,
      detail: `Visibilitas ${(vis / 1000).toFixed(1)} km · ${pData.weather}`,
    },
  ];

  box.innerHTML = activities.map(a => {
    const status = a.ok ? 'Aman' : a.warn ? 'Waspada' : 'Bahaya';
    const iconBg  = a.ok ? 'bg-green-500/15 text-green-400' : a.warn ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400';
    const border  = a.ok ? 'border-green-500/20' : a.warn ? 'border-yellow-500/20' : 'border-red-500/20';
    const rec     = a.ok
      ? 'Kondisi mendukung. Aktivitas dapat dilakukan.'
      : a.warn
      ? 'Perhatikan kondisi. Lanjutkan dengan hati-hati.'
      : 'Tidak disarankan. Hindari aktivitas ini.';

    return `
      <div class="glass p-5 rounded-[1.75rem] border ${border} flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="p-3 rounded-2xl ${iconBg}">
            <i class="${sanitizeHTML(a.icon)} text-xl" aria-hidden="true"></i>
          </div>
          ${makeStatusBadge(status)}
        </div>
        <div>
          <p class="font-black text-sm uppercase tracking-wide">${sanitizeHTML(a.label)}</p>
          <p class="text-[10px] text-white/40 font-bold uppercase">${sanitizeHTML(a.desc)}</p>
        </div>
        <p class="text-[10px] text-white/60 leading-relaxed">${sanitizeHTML(rec)}</p>
        <p class="text-[9px] text-cyan-400/60 font-bold">${sanitizeHTML(a.detail)}</p>
      </div>`;
  }).join('');
}

function renderLiveOceanVisualizer(pData) {
  const descEl      = document.getElementById('live-visual-desc');
  const turbineEl   = document.getElementById('live-wind-turbine');
  const windLabel   = document.getElementById('live-wind-label');
  const shipEl      = document.getElementById('live-ship-emoji');
  const shipContainer = document.getElementById('live-ship-container');
  const waveSvg     = document.getElementById('live-wave-svg');
  if (!descEl) return;

  const waveH = parseWaveNum(pData.wave_desc);
  const wind  = parseFloat(pData.wind_speed_max) || 0;

  // Description text
  const wx = getWeatherEmoji(pData.weather);
  descEl.textContent = `${wx} ${pData.weather} · Gelombang ${pData.wave_desc} m · Angin ${wind} knot dari ${pData.wind_from}`;

  // Wind label
  if (windLabel) windLabel.textContent = `${wind} Knot`;

  // Wind turbine: use CSS class + custom property (matches .turbine-active in styles.css)
  if (turbineEl) {
    const duration = wind <= 3 ? '6s' : wind <= 8 ? '3s' : wind <= 15 ? '1.5s' : '0.7s';
    turbineEl.style.setProperty('--wind-speed-duration', duration);
    turbineEl.classList.add('turbine-active');
  }

  // Warna SVG kapal berubah sesuai kondisi gelombang
  const liveSvg = document.getElementById('live-ship-svg');
  if (liveSvg) _updateShipSvgColor(liveSvg, waveH);

  // Animasi kapal: 3 tingkat intensitas + kecepatan dinamis
  if (shipContainer) {
    shipContainer.classList.remove('ship-bobbing', 'ship-wobbling', 'ship-storming');
    if (waveH <= 1.0) {
      const dur = waveH <= 0.3 ? '4s' : '2.8s';
      shipContainer.style.setProperty('--kapal-durasi', dur);
      shipContainer.classList.add('ship-bobbing');
    } else if (waveH <= 2.5) {
      const dur = waveH <= 1.5 ? '2s' : '1.4s';
      shipContainer.style.setProperty('--kapal-durasi', dur);
      shipContainer.classList.add('ship-wobbling');
    } else {
      const dur = waveH <= 3.5 ? '1s' : '0.7s';
      shipContainer.style.setProperty('--kapal-durasi', dur);
      shipContainer.classList.add('ship-storming');
    }
  }

  // SVG ombak: sesuaikan amplitudo dan kecepatan animasi
  if (waveSvg) {
    const amp = Math.min(Math.max(waveH * 3, 1), 12);
    const mid = 28 - amp * 1.5;
    const p1 = `M0 ${mid} Q 30 ${mid - amp}, 60 ${mid} T 120 ${mid} L 120 28 L 0 28 Z`;
    const p2 = `M0 ${mid + 2} Q 30 ${mid - amp + 3}, 60 ${mid + 2} T 120 ${mid + 2} L 120 28 L 0 28 Z`;
    const paths = waveSvg.querySelectorAll('path');
    if (paths[0]) paths[0].setAttribute('d', p1);
    if (paths[1]) paths[1].setAttribute('d', p2);

    // Kecepatan animasi ombak: laut tenang = lambat, badai = cepat
    const dur1 = waveH <= 0.5 ? '8s' : waveH <= 1.5 ? '5s' : waveH <= 3.0 ? '3s' : '1.5s';
    const dur2 = `${parseFloat(dur1) * 0.65}s`;
    waveSvg.style.setProperty('--ombak-durasi', dur1);
    if (paths[0]) paths[0].style.animationDuration = dur1;
    if (paths[1]) paths[1].style.animationDuration = dur2;
  }
}

/**
 * Ubah warna badan kapal SVG sesuai kondisi gelombang.
 * tenang = biru normal, waspada = kuning keemasan, bahaya = merah
 */
export function _updateShipSvgColor(svg, waveH) {
  if (!svg) return;
  // Badan kapal (path + rect dek)
  const paths = svg.querySelectorAll('path, rect, line, circle, ellipse');
  if (waveH <= 1.0) {
    // Tenang — biru laut
    svg.querySelectorAll('[fill="#1e40af"]').forEach(el => el.setAttribute('fill', '#1e40af'));
    svg.querySelectorAll('[fill="#2563eb"]').forEach(el => el.setAttribute('fill', '#2563eb'));
    svg.querySelectorAll('[fill="#1e3a8a"]').forEach(el => el.setAttribute('fill', '#1e3a8a'));
    svg.querySelectorAll('[stroke="#3b82f6"]').forEach(el => el.setAttribute('stroke', '#3b82f6'));
    svg.querySelectorAll('[stroke="#60a5fa"]').forEach(el => el.setAttribute('stroke', '#60a5fa'));
    svg.querySelectorAll('[stroke="#1d4ed8"]').forEach(el => el.setAttribute('stroke', '#1d4ed8'));
  } else if (waveH <= 2.5) {
    // Waspada — kuning keemasan
    svg.querySelectorAll('[fill="#1e40af"]').forEach(el => el.setAttribute('fill', '#92400e'));
    svg.querySelectorAll('[fill="#2563eb"]').forEach(el => el.setAttribute('fill', '#b45309'));
    svg.querySelectorAll('[fill="#1e3a8a"]').forEach(el => el.setAttribute('fill', '#78350f'));
    svg.querySelectorAll('[stroke="#3b82f6"]').forEach(el => el.setAttribute('stroke', '#f59e0b'));
    svg.querySelectorAll('[stroke="#60a5fa"]').forEach(el => el.setAttribute('stroke', '#fbbf24'));
    svg.querySelectorAll('[stroke="#1d4ed8"]').forEach(el => el.setAttribute('stroke', '#d97706'));
  } else {
    // Bahaya — merah
    svg.querySelectorAll('[fill="#1e40af"]').forEach(el => el.setAttribute('fill', '#7f1d1d'));
    svg.querySelectorAll('[fill="#2563eb"]').forEach(el => el.setAttribute('fill', '#991b1b'));
    svg.querySelectorAll('[fill="#1e3a8a"]').forEach(el => el.setAttribute('fill', '#450a0a'));
    svg.querySelectorAll('[stroke="#3b82f6"]').forEach(el => el.setAttribute('stroke', '#ef4444'));
    svg.querySelectorAll('[stroke="#60a5fa"]').forEach(el => el.setAttribute('stroke', '#fca5a5'));
    svg.querySelectorAll('[stroke="#1d4ed8"]').forEach(el => el.setAttribute('stroke', '#dc2626'));
  }
}
