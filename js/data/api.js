/**
 * js/data/api.js
 * Data fetching, caching, and API utilities
 */
import { CONFIG, stateData } from '../config.js';
import { sanitizeHTML, showErrorNotification, showLoadingState } from '../utils/security.js';

export const DataCache = {
  EXPIRY_MS: CONFIG.CACHE_EXPIRY,
  VERSION: '71.72.v3',

  set(key, data) {
    try {
      localStorage.setItem(`simar_${key}`, JSON.stringify({
        data, timestamp: Date.now(), version: this.VERSION
      }));
    } catch(e) { console.warn('Cache write failed:', e); }
  },

  get(key) {
    try {
      const itemStr = localStorage.getItem(`simar_${key}`);
      if (!itemStr) return null;
      const item = JSON.parse(itemStr);
      if (item.version !== this.VERSION) { this.remove(key); return null; }
      if (Date.now() - item.timestamp > this.EXPIRY_MS) { this.remove(key); return null; }
      return item.data;
    } catch(e) { return null; }
  },

  remove(key) {
    try { localStorage.removeItem(`simar_${key}`); } catch(e) {}
  },

  clear() {
    try {
      Object.keys(localStorage).filter(k => k.startsWith('simar_')).forEach(k => localStorage.removeItem(k));
    } catch(e) {}
  },

  init() {
    try {
      Object.keys(localStorage).filter(k => k.startsWith('simar_')).forEach(k => {
        const itemStr = localStorage.getItem(k);
        if (itemStr) {
          const item = JSON.parse(itemStr);
          if (item.version !== this.VERSION) localStorage.removeItem(k);
        }
      });
    } catch(e) {}
  }
};
DataCache.init();

export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    } catch(error) {
      lastError = error;
      if (error.message.includes('HTTP 4')) break;
      if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
}

export function encodeFileName(filename) {
  return filename.split(' ').join('%20');
}

export function formatWITA(utcString) {
  try {
    const clean = utcString.replace(' UTC', 'Z').replace(' ', 'T');
    const d = new Date(clean);
    return d.toLocaleString('id-ID', { timeZone: 'Asia/Makassar', day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).replace(/\./g, ':') + ' WITA';
  } catch(e) { return utcString; }
}

export async function fetchWeatherByKelurahan(admCode) {
  const cacheKey = `weather_${admCode}`;
  const cached = DataCache.get(cacheKey);
  if (cached) return cached;
  const data = await fetchWithRetry(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${admCode}`);
  DataCache.set(cacheKey, data);
  return data;
}

export async function switchPerairan(filename, renderWater) {
  const tableBody = document.getElementById('water-table-body');
  if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="py-6 text-center opacity-50"><i class="fas fa-satellite-dish mr-2 animate-pulse"></i>Mengambil data zona baru...</td></tr>`;
  try {
    const cacheKey = 'perairan_' + filename.replace(/[^a-zA-Z0-9]/g, '_');
    const cached = DataCache.get(cacheKey);
    if (cached && !navigator.onLine) {
      stateData.perairan = cached;
      showErrorNotification('Menggunakan data cache (offline)', 'info');
    } else {
      const data = await fetchWithRetry('https://peta-maritim.bmkg.go.id/public_api/perairan/' + encodeFileName(filename));
      stateData.perairan = data;
      DataCache.set(cacheKey, data);
    }
    renderWater();
    showErrorNotification('Data zona perairan berhasil dimuat', 'success');
  } catch(err) {
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-red-400"><i class="fas fa-exclamation-triangle mr-2"></i>Gagal memuat data zona ini. ${sanitizeHTML(err.message)}</td></tr>`;
    showErrorNotification('Gagal memuat data zona perairan.', 'error');
  }
}

export async function switchPort(filename, onSuccess) {
  const box = document.getElementById('port-forecast-cards');
  if (box) box.innerHTML = `<div class="loading-overlay col-span-4"><i class="fas fa-satellite-dish animate-pulse"></i> Mengambil data pelabuhan...</div>`;
  try {
    const cacheKey = 'pelabuhan_' + filename.replace(/[^a-zA-Z0-9]/g, '_');
    const cached = DataCache.get(cacheKey);
    if (cached && !navigator.onLine) {
      stateData.pelabuhan = cached;
      showErrorNotification('Menggunakan data cache (offline)', 'info');
    } else {
      const data = await fetchWithRetry('https://peta-maritim.bmkg.go.id/public_api/pelabuhan/' + encodeFileName(filename));
      stateData.pelabuhan = data;
      DataCache.set(cacheKey, data);
    }
    if (typeof onSuccess === 'function') onSuccess();
    showErrorNotification('Data pelabuhan berhasil dimuat', 'success');
  } catch(err) {
    if (box) box.innerHTML = `<div class="loading-overlay col-span-4 text-red-400"><i class="fas fa-exclamation-triangle"></i> Gagal memuat data pelabuhan ini. ${sanitizeHTML(err.message)}</div>`;
    showErrorNotification('Gagal memuat data pelabuhan.', 'error');
  }
}
