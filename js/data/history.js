/**
 * js/data/history.js
 * Historical data storage menggunakan localStorage
 * Mendukung klasifikasi: hari, minggu, bulan
 */
import { stateData } from '../config.js';

const HISTORY_KEY_PREFIX = 'simar_history_';
const MAX_DAYS_STORED = 90;

// ============================================================
// PUBLIC: SIMPAN SNAPSHOT
// ============================================================

export function saveHistorySnapshot() {
  const now = new Date();
  const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timestamp = now.toISOString();

  // Simpan pelabuhan
  if (stateData.pelabuhan?.data?.[0]) {
    const p = stateData.pelabuhan.data[0];
    _saveToLocalStorage('pelabuhan', dateKey, {
      date: dateKey,
      timestamp,
      location: 'pelabuhan',
      location_name: stateData.pelabuhan.name || 'PPS Bitung',
      wave_avg: _parseWaveNum(p.wave_desc),
      wave_desc: p.wave_desc || '-',
      wave_cat: p.wave_cat || '-',
      wind_avg: parseFloat(p.wind_speed_max) || 0,
      wind_from: p.wind_from || '-',
      temp_avg: (p.temp_min && p.temp_max)
        ? (parseFloat(p.temp_min) + parseFloat(p.temp_max)) / 2
        : null,
      weather: p.weather || '-',
    });
  }

  // Simpan perairan
  if (stateData.perairan?.data?.[0]) {
    const p = stateData.perairan.data[0];
    _saveToLocalStorage('perairan', dateKey, {
      date: dateKey,
      timestamp,
      location: 'perairan',
      location_name: stateData.perairan.name || 'Perairan Bitung',
      wave_avg: _parseWaveNum(p.wave_desc),
      wave_desc: p.wave_desc || '-',
      wave_cat: p.wave_cat || '-',
      wind_avg: parseFloat(p.wind_speed_max) || 0,
      wind_from: p.wind_from || '-',
      temp_avg: null,
      weather: p.weather || '-',
    });
  }

  _cleanupOldHistory();
}

// ============================================================
// PUBLIC: AMBIL DATA
// ============================================================

/**
 * Ambil data harian mentah N hari terakhir
 */
export function getHistoricalData(location, days = 30) {
  const result = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const raw = localStorage.getItem(`${HISTORY_KEY_PREFIX}${location}_${dateKey}`);
    if (raw) {
      try { result.push(JSON.parse(raw)); } catch(e) {}
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Ambil data yang sudah diagregasi sesuai klasifikasi
 * @param {string} location - 'pelabuhan' | 'perairan'
 * @param {string} klasifikasi - 'hari' | 'minggu' | 'bulan'
 */
export function getAggregatedData(location, klasifikasi = 'hari') {
  // Tentukan jumlah hari yang diambil berdasarkan klasifikasi
  const daysMap = { hari: 30, minggu: 60, bulan: 90 };
  const days = daysMap[klasifikasi] || 30;
  let rawData = getHistoricalData(location, days);

  // Jika data nyata < 2 titik, tambahkan data demo agar chart bisa dirender
  if (rawData.length < 2) {
    rawData = _generateDemoData(location, days);
  }

  if (klasifikasi === 'hari') {
    return rawData.slice(-30).map(d => ({
      label: _formatDateLabel(d.date),
      wave_avg: d.wave_avg,
      wind_avg: d.wind_avg,
      temp_avg: d.temp_avg,
      weather: d.weather,
      date: d.date,
      isDemo: d.isDemo || false,
    }));
  }

  if (klasifikasi === 'minggu') {
    return _aggregateByWeek(rawData);
  }

  if (klasifikasi === 'bulan') {
    return _aggregateByMonth(rawData);
  }

  return rawData;
}

/**
 * Hitung statistik dari array data
 */
export function calculateHistoryStats(data) {
  if (!data || data.length === 0) return null;

  const waves = data.map(d => d.wave_avg).filter(v => v != null && !isNaN(v));
  const winds = data.map(d => d.wind_avg).filter(v => v != null && !isNaN(v));
  const temps = data.map(d => d.temp_avg).filter(v => v != null && !isNaN(v));

  return {
    wave: _calcStats(waves),
    wind: _calcStats(winds),
    temp: temps.length > 0 ? _calcStats(temps) : null,
    days_recorded: data.length,
  };
}

// ============================================================
// PRIVATE: AGREGASI
// ============================================================

function _aggregateByWeek(rawData) {
  const weekMap = {};

  rawData.forEach(d => {
    const date = new Date(d.date);
    // Hitung nomor minggu dalam tahun
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    const weekKey = `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = { waves: [], winds: [], temps: [], dates: [], weekKey };
    }
    weekMap[weekKey].waves.push(d.wave_avg);
    weekMap[weekKey].winds.push(d.wind_avg);
    if (d.temp_avg != null) weekMap[weekKey].temps.push(d.temp_avg);
    weekMap[weekKey].dates.push(d.date);
  });

  return Object.entries(weekMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekKey, d]) => {
      const firstDate = d.dates[0];
      const lastDate = d.dates[d.dates.length - 1];
      return {
        label: _formatWeekLabel(firstDate, lastDate),
        wave_avg: _avg(d.waves),
        wind_avg: _avg(d.winds),
        temp_avg: d.temps.length > 0 ? _avg(d.temps) : null,
        date: firstDate,
        date_end: lastDate,
        count: d.dates.length,
      };
    });
}

function _aggregateByMonth(rawData) {
  const monthMap = {};

  rawData.forEach(d => {
    const monthKey = d.date.slice(0, 7); // YYYY-MM

    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { waves: [], winds: [], temps: [], monthKey };
    }
    monthMap[monthKey].waves.push(d.wave_avg);
    monthMap[monthKey].winds.push(d.wind_avg);
    if (d.temp_avg != null) monthMap[monthKey].temps.push(d.temp_avg);
  });

  return Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, d]) => ({
      label: _formatMonthLabel(monthKey),
      wave_avg: _avg(d.waves),
      wind_avg: _avg(d.winds),
      temp_avg: d.temps.length > 0 ? _avg(d.temps) : null,
      date: monthKey + '-01',
      count: d.waves.length,
    }));
}

// ============================================================
// PRIVATE: HELPERS
// ============================================================

function _saveToLocalStorage(location, dateKey, snapshot) {
  const key = `${HISTORY_KEY_PREFIX}${location}_${dateKey}`;
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch(e) {
    if (e.name === 'QuotaExceededError') {
      _cleanupOldHistory();
      try { localStorage.setItem(key, JSON.stringify(snapshot)); } catch(e2) {}
    }
  }
}

function _cleanupOldHistory() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - MAX_DAYS_STORED);
  const cutoffKey = cutoff.toISOString().split('T')[0];

  // Kumpulkan keys dulu, baru hapus (hindari mutasi saat iterasi)
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(HISTORY_KEY_PREFIX)) {
      const match = key.match(/(\d{4}-\d{2}-\d{2})$/);
      if (match && match[1] < cutoffKey) toRemove.push(key);
    }
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}

function _calcStats(values) {
  if (!values.length) return { avg: 0, min: 0, max: 0, trend: 0 };
  const avg = _avg(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const trend = values.length > 1
    ? ((values[values.length - 1] - values[0]) / Math.max(values[0], 0.001)) * 100
    : 0;
  return {
    avg: parseFloat(avg.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    trend: parseFloat(trend.toFixed(1)),
  };
}

function _avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function _parseWaveNum(desc) {
  if (!desc) return 0;
  const match = desc.match(/([\d.]+)\s*-\s*([\d.]+)/);
  if (match) return parseFloat(match[2]);
  const single = desc.match(/[\d.]+/);
  return single ? parseFloat(single[0]) : 0;
}

function _formatDateLabel(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  } catch(e) { return dateStr; }
}

/**
 * Generate data demo saat localStorage masih kosong
 * Berdasarkan pola iklim laut Bitung (Sulawesi Utara)
 */
function _generateDemoData(location, days) {
  const result = [];
  const today = new Date();

  // Pola musiman Bitung: gelombang lebih tinggi Nov-Feb (musim barat)
  const waveBase    = location === 'perairan' ? 1.2 : 0.8;
  const windBase    = location === 'perairan' ? 12  : 8;
  const tempBase    = location === 'pelabuhan' ? 29  : null;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const month   = date.getMonth(); // 0-11

    // Variasi musiman: Nov(10)-Feb(1) lebih tinggi
    const seasonal = (month >= 10 || month <= 1) ? 0.4 : 0;
    // Variasi acak harian ±0.2
    const noise = (Math.sin(i * 2.3) * 0.15 + Math.cos(i * 1.7) * 0.1);

    result.push({
      date: dateKey,
      location,
      wave_avg: parseFloat(Math.max(0.1, waveBase + seasonal + noise).toFixed(2)),
      wind_avg: parseFloat(Math.max(1, windBase + seasonal * 3 + noise * 5).toFixed(1)),
      temp_avg: tempBase ? parseFloat((tempBase + noise * 2).toFixed(1)) : null,
      weather: 'Cerah Berawan',
      isDemo: true,
    });
  }

  return result;
}

function _formatWeekLabel(firstDate, lastDate) {
  try {
    const d1 = new Date(firstDate);
    const d2 = new Date(lastDate);
    const f1 = d1.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    const f2 = d2.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    return `${f1} – ${f2}`;
  } catch(e) { return firstDate; }
}

function _formatMonthLabel(monthKey) {
  try {
    const d = new Date(monthKey + '-01');
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } catch(e) { return monthKey; }
}
