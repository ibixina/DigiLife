import { defineConfig } from 'vite'

export default defineConfig({
  base: '/DigiLife/', // Change this to your actual repository name or use environment variables
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
})