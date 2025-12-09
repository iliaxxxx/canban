import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Expose environment variables to the browser
    'process.env.ANTHROPIC_API_KEY': JSON.stringify(process.env.VITE_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY),
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY || process.env.API_KEY),
  },
  server: {
    port: 3000,
    open: true,
  },
});
