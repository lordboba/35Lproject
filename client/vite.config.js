import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    open: false // Disable automatic browser opening to prevent xdg-open errors in deployment environments
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    // Ensure environment variables are available
    'process.env': {}
  }
}))
