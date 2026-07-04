import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' — чтобы приложение работало из любого пути (важно для хостинга Mini App)
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
  },
})
