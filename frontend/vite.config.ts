import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return defineConfig({
    plugins: [react()],
    server: {
      host: env.VITE_HOST || 'localhost',
      port: 3000,
      open: false,
      proxy: {
        '/api': 'http://host.docker.internal:8000'
      }
    }
  })
}
