import { cwd } from 'node:process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, cwd(), '')
  const backendTarget = env.VITE_DEV_BACKEND_URL || 'http://localhost:9000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5000,
      strictPort: true,
      allowedHosts: ['easycodetech.top'],
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
