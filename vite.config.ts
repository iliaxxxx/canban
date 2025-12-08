import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/canban/', // GitHub Pages base URL
  server: {
    host: '0.0.0.0', // Разрешает доступ извне
    port: 5173,
    strictPort: false,
    open: false
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: false
  }
})
