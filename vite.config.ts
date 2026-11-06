import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // leva (live material tuning, `?tune`) is dev-only; production gets a no-UI stub
  resolve: mode === 'production' ? { alias: { leva: fileURLToPath(new URL('./src/leva-stub.ts', import.meta.url)) } } : {},
}))
