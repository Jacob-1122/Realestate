import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/census': {
        target: 'https://api.census.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/census/, '')
      }
    }
  },
})

