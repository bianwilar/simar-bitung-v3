/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './js/**/*.js',
  ],
  theme: {
    extend: {
      // Custom animations yang dipakai di app
      animation: {
        'wave-rock-1': 'wave-rock-1 6s ease-in-out infinite',
        'wave-rock-2': 'wave-rock-2 4s ease-in-out infinite',
        'ship-bob':    'ship-bob 3s ease-in-out infinite',
        'ship-wobble': 'ship-wobble 1.5s ease-in-out infinite',
        'turbine':     'turbine-spin 4s linear infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-down':  'slideDown 0.4s ease-out',
        'nowcast-pulse': 'nowcastPulse 2s ease-in-out infinite',
        'skeleton':    'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        'wave-rock-1': {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '50%': { transform: 'translateX(-8px) rotate(1deg)' },
        },
        'wave-rock-2': {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '50%': { transform: 'translateX(8px) rotate(-1.5deg)' },
        },
        'ship-bob': {
          '0%, 100%': { transform: 'translate(-50%, 0) rotate(0deg)' },
          '50%': { transform: 'translate(-50%, -6px) rotate(1.5deg)' },
        },
        'ship-wobble': {
          '0%, 100%': { transform: 'translate(-50%, 0) rotate(-1.5deg)' },
          '50%': { transform: 'translate(-50%, -12px) rotate(6deg)' },
        },
        'turbine-spin': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        'slideInRight': {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',     opacity: '1' },
        },
        'slideDown': {
          from: { transform: 'translateY(-100%)', opacity: '0' },
          to:   { transform: 'translateY(0)',      opacity: '1' },
        },
        'nowcastPulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'skeleton': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.1' },
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
