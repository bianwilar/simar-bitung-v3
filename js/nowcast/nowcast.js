/**
 * js/nowcast/nowcast.js
 * Nowcast / Peringatan Dini BMKG
 */
import { nowcastState } from '../config.js';
import { sanitizeHTML } from '../utils/security.js';

export async function fetchNowcast() {
  const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)
                   || window.location.protocol === 'file:';
  if (isLocalhost) {
    console.info('Nowcast: CORS tidak tersedia di localhost. Aktif saat deployed.');
    clearNowcastAlert();
    return;
  }
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch('https://www.bmkg.go.id/alerts/nowcast/id', { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    parseNowcastRSS(await res.text());
  } catch(err) {
    if (err.name !== 'AbortError') console.warn('Nowcast fetch failed:', err.message);
    clearNowcastAlert();
  }
}

function parseNowcastRSS(xmlText) {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    const items  = xmlDoc.querySelectorAll('item');
    let bitungAlert = null;

    items.forEach(item => {
      const title   = item.querySelector('title')?.textContent || '';
      const desc    = item.querySelector('description')?.textContent || '';
      const link    = item.querySelector('link')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const guid    = item.querySelector('guid')?.textContent || '';
      const isSulut = [title, desc].some(t => ['sulawesi utara','bitung','manado','minahasa'].some(k => t.toLowerCase().includes(k)));
      if (isSulut && !bitungAlert) bitungAlert = { title, desc, link, pubDate, guid };
    });

    if (bitungAlert) fetchNowcastDetail(bitungAlert);
    else clearNowcastAlert();
  } catch(e) {
    console.warn('Nowcast RSS parse error:', e);
    clearNowcastAlert();
  }
}

async function fetchNowcastDetail(alertInfo) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(alertInfo.link, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    parseNowcastCAP(await res.text(), alertInfo);
  } catch(err) {
    showNowcastFromRSS(alertInfo);
  }
}

function parseNowcastCAP(xmlText, fallbackInfo) {
  try {
    const xmlDoc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const info   = xmlDoc.querySelector('info');
    if (!info) { showNowcastFromRSS(fallbackInfo); return; }

    const event    = info.querySelector('event')?.textContent    || fallbackInfo.title;
    const effective = info.querySelector('effective')?.textContent || '';
    const expires  = info.querySelector('expires')?.textContent  || '';
    const headline = info.querySelector('headline')?.textContent  || fallbackInfo.title;
    const description = info.querySelector('description')?.textContent || fallbackInfo.desc;

    const expiresDate = expires ? new Date(expires) : null;
    if (expiresDate && expiresDate < new Date()) { clearNowcastAlert(); return; }

    let polygonCoords = null;
    const polygonEl = xmlDoc.querySelector('polygon');
    if (polygonEl) {
      try {
        polygonCoords = polygonEl.textContent.trim().split(' ').map(pair => {
          const parts = pair.split(',');
          return [parseFloat(parts[0]), parseFloat(parts[1])];
        }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
      } catch(e) {}
    }

    const fmtWITA = (isoStr) => {
      if (!isoStr) return '-';
      try {
        return new Date(isoStr).toLocaleString('id-ID', {
          timeZone: 'Asia/Makassar', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        }) + ' WITA';
      } catch(e) { return isoStr; }
    };

    showNowcastAlert({
      id: fallbackInfo.guid, title: headline || event, desc: description, event,
      effective: fmtWITA(effective), expires: fmtWITA(expires),
      expiresRaw: expiresDate, polygon: polygonCoords, pubDate: fallbackInfo.pubDate
    });
  } catch(e) {
    showNowcastFromRSS(fallbackInfo);
  }
}

function showNowcastFromRSS(info) {
  showNowcastAlert({ id: info.guid, title: info.title, desc: info.desc, event: info.title,
    effective: '-', expires: '-', expiresRaw: null, polygon: null, pubDate: info.pubDate });
}

export function showNowcastAlert(alertData) {
  nowcastState.active = alertData;

  if (!nowcastState.dismissed) {
    const banner = document.getElementById('nowcast-banner');
    if (banner) {
      document.getElementById('nowcast-title').textContent = alertData.title;
      const descEl = document.getElementById('nowcast-desc');
      if (descEl) descEl.textContent = alertData.desc.substring(0, 120) + '...';
      const expiresEl = document.getElementById('nowcast-expires');
      if (expiresEl && alertData.expires !== '-') {
        expiresEl.textContent = 'Berlaku hingga: ' + alertData.expires;
        expiresEl.classList.remove('hidden');
      }
      banner.classList.remove('hidden');
      document.body.classList.add('has-nowcast');
    }
  }

  const modalTitle = document.getElementById('nowcast-modal-title');
  if (modalTitle) modalTitle.textContent = alertData.title;
  const modalDesc = document.getElementById('nowcast-modal-desc');
  if (modalDesc) modalDesc.textContent = alertData.desc;
  const modalEff = document.getElementById('nowcast-modal-effective');
  if (modalEff) modalEff.textContent = alertData.effective;
  const modalExp = document.getElementById('nowcast-modal-expires');
  if (modalExp) modalExp.textContent = alertData.expires;

  const navDot = document.getElementById('nav-nowcast-dot');
  if (navDot) navDot.classList.remove('hidden');

  if (alertData.id !== nowcastState.lastAlertId) {
    nowcastState.lastAlertId = alertData.id;
    const toast = document.getElementById('nowcast-toast');
    const toastText = document.getElementById('nowcast-toast-text');
    if (toast && toastText) {
      toastText.textContent = alertData.desc.substring(0, 150) + '...';
      toast.classList.remove('hidden');
      setTimeout(() => toast.classList.add('hidden'), 8000);
    }
  }
}

export function clearNowcastAlert() {
  nowcastState.active = null;
  const banner = document.getElementById('nowcast-banner');
  if (banner) banner.classList.add('hidden');
  document.body.classList.remove('has-nowcast');
  const toast = document.getElementById('nowcast-toast');
  if (toast) toast.classList.add('hidden');
  const navDot = document.getElementById('nav-nowcast-dot');
  if (navDot) navDot.classList.add('hidden');
}

export function showNowcastDetail() {
  const modal = document.getElementById('nowcast-modal');
  if (modal) modal.classList.remove('hidden');
}

export function dismissNowcastBanner() {
  nowcastState.dismissed = true;
  const banner = document.getElementById('nowcast-banner');
  if (banner) banner.classList.add('hidden');
  document.body.classList.remove('has-nowcast');
}
