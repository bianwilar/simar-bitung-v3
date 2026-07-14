/**
 * js/config.js
 * Konfigurasi global dan constants untuk SIMAR Bitung
 */

export const CONFIG = {
  WAVE_THRESHOLDS: { TENANG: 0.5, RENDAH: 1.25, SEDANG: 2.5, TINGGI: 4.0 },
  WIND_THRESHOLDS: { NORMAL: 10, SEDANG: 15, KENCANG: 20, BADAI: 30 },
  SHIP_LIMITS: {
    SMALL:  { wave: 1.0, wind: 12 },
    MEDIUM: { wave: 2.0, wind: 20 },
    LARGE:  { wave: 3.5, wind: 28 }
  },
  MAP: {
    DEFAULT_CENTER: [1.446, 125.208],
    DEFAULT_ZOOM: 12,
    MARKER_SIZES: { MAIN: 42, PORT: 34, BMKG: 34, WATER: 32 }
  },
  COLORS: {
    WAVE: 'rgb(56, 189, 248)', WIND: 'rgb(249, 115, 22)',
    TEMP: 'rgb(248, 113, 113)', CURRENT: 'rgb(74, 222, 128)',
    DANGER: 'rgb(239, 68, 68)', WARNING: 'rgb(251, 191, 36)', SAFE: 'rgb(34, 197, 94)'
  },
  REFRESH_INTERVAL: 15 * 60 * 1000,
  CACHE_EXPIRY: 10 * 60 * 1000
};

/** Shared mutable state */
export const stateData = {
  pelabuhan: null,
  perairan: null,
  lastFetchTime: null,
  weatherCache: {},
  mwi: null,
  calendarDays: null
};

export const nowcastState = {
  active: null,
  lastAlertId: null,
  polygon: null,
  dismissed: false
};

export const bitungCoords = CONFIG.MAP.DEFAULT_CENTER;
