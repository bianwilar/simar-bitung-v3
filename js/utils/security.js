/**
 * js/utils/security.js
 * Security utilities: sanitization, safe parsing
 */

/**
 * Sanitize HTML string to prevent XSS attacks
 * @param {string} str
 * @returns {string}
 */
export function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Safely parse a numeric value from API data
 * @param {*} val - Value to parse
 * @param {*} fallback - Fallback value if not finite
 * @returns {number|*}
 */
export function safeNum(val, fallback = '-') {
  const n = Number(val);
  return isFinite(n) ? n : fallback;
}

/**
 * Safe locale time formatter with try/catch
 * @param {string} dtStr - ISO date string
 * @param {object} opts - toLocaleString options
 * @returns {string}
 */
export function safeLocaleTime(dtStr, opts = {}) {
  try {
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', { timeZone: 'Asia/Makassar', ...opts });
  } catch(e) { return '-'; }
}

/**
 * Show error notification toast
 * @param {string} message
 * @param {'error'|'warning'|'info'|'success'} type
 */
export function showErrorNotification(message, type = 'error') {
  const container = document.getElementById('error-notification-container');
  if (!container) return;

  const colors = {
    error:   'bg-red-500/90 border-red-500 text-white',
    warning: 'bg-yellow-500/90 border-yellow-500 text-white',
    info:    'bg-blue-500/90 border-blue-500 text-white',
    success: 'bg-green-500/90 border-green-500 text-white'
  };
  const icons = {
    error: 'fa-exclamation-circle', warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle', success: 'fa-check-circle'
  };

  const notification = document.createElement('div');
  notification.className = `glass p-4 rounded-2xl border-2 ${colors[type]} mb-3 animate-slideInRight flex items-center gap-3 shadow-xl`;
  notification.style.pointerEvents = 'auto';
  notification.innerHTML = `
    <i class="fas ${icons[type]} text-xl flex-shrink-0"></i>
    <div class="flex-grow"><p class="text-sm font-bold">${sanitizeHTML(message)}</p></div>
    <button onclick="this.parentElement.remove()" class="text-white/80 hover:text-white transition flex-shrink-0" aria-label="Tutup notifikasi">
      <i class="fas fa-times"></i>
    </button>
  `;
  container.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'all 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

/**
 * Show loading skeleton in element
 * @param {string} elementId
 * @param {string} message
 */
export function showLoadingState(elementId, message = 'Memuat data...') {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.innerHTML = `
    <div class="loading-overlay py-12 text-center">
      <i class="fas fa-satellite-dish fa-3x mb-4 animate-pulse text-cyan-400"></i>
      <p class="text-sm font-bold text-white/70">${sanitizeHTML(message)}</p>
    </div>
  `;
}
