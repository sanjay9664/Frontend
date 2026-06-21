import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true
      },
      '/sochiot-auth': {
        target: 'https://app.sochiot.com/api/auth-engine',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sochiot-auth/, '')
      },
      '/sochiot-config': {
        target: 'https://app.sochiot.com/api/config-engine',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sochiot-config/, '')
      },
      '/sochiot-location': {
        target: 'https://app.sochiot.com/api/location-engine',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sochiot-location/, '')
      },
      '/sochiot-triggers': {
        target: 'https://app.sochiot.com/api/triggers',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/sochiot-triggers/, '')
      }
    }
  }
})
