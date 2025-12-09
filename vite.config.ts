import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite automatically loads .env files and makes VITE_* variables available
  envPrefix: 'VITE_',
})
