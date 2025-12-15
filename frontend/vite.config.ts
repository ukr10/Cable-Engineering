import { defineConfig, loadEnv } from 'vite'
declare const process: any
import react from '@vitejs/plugin-react'

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return defineConfig({
    plugins: [react()],
    server: {
      // Bind to IPv4 localhost by default so dev tooling and curl behave consistently.
      host: env.VITE_HOST || '127.0.0.1',
      port: 3000,
      open: false,
      proxy: {
        // In local development default to the local backend; CI or Docker can set VITE_API_URL to a service name.
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          secure: false
        }
      }
    }
  })
}
