/**
 * js/utils/performance.js
 * Performance utilities: debounce, throttle, DOM cache
 */

/**
 * Debounce function
 * @param {Function} func
 * @param {number} wait
 * @returns {Function}
 */
export function debounce(func, wait = 100) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

/**
 * Throttle function
 * @param {Function} func
 * @param {number} limit
 * @returns {Function}
 */
export function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/** DOM element cache */
export const DOMCache = {
  navLinks: null,
  mobileMenu: null,
  cardsContainer: null,
  activityRecommendations: null,
  alertsContainer: null,
  lastUpdate: null,
  mapDetailPlaceholder: null,
  mapDetailContent: null,
  chartsStatCards: null,
  chartCanvas: null,
  simWaveSlider: null,
  simWindSlider: null,

  init() {
    this.navLinks = document.querySelectorAll('.nav-link');
    this.mobileMenu = document.getElementById('mobile-menu');
    this.cardsContainer = document.getElementById('cards-container');
    this.activityRecommendations = document.getElementById('activity-recommendations');
    this.alertsContainer = document.getElementById('alerts-container');
    this.lastUpdate = document.getElementById('lastUpdate');
    this.mapDetailPlaceholder = document.getElementById('map-detail-placeholder');
    this.mapDetailContent = document.getElementById('map-detail-content');
    this.chartsStatCards = document.getElementById('charts-stat-cards');
    this.chartCanvas = document.getElementById('chart-bmkg-main');
    this.simWaveSlider = document.getElementById('sim-wave-slider');
    this.simWindSlider = document.getElementById('sim-wind-slider');
  },

  get(key) {
    return this[key] || document.getElementById(key);
  }
};
