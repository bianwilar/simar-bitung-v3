import { defineConfig } from 'vite';

export default defineConfig({
  // Root directory untuk development
  root: '.',

  // Build output
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      input: 'index.html',
      output: {
        // Code splitting: pisah vendor libraries
        manualChunks: {
          leaflet: ['leaflet'],
          chartjs: ['chart.js'],
        },
      },
    },
  },

  // Development server
  server: {
    port: 3000,
    open: true,
    host: true,
  },

  // Preview server (setelah build)
  preview: {
    port: 4173,
    open: true,
  },
});
