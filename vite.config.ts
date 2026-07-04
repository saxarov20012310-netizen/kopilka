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
  build: {
    // Пониженный target — совместимость со старыми webview Telegram (iOS Safari, Android WebView).
    target: 'es2015',
    // Стабильные имена файлов (без хэша): закэшированный Telegram-ом index.html
    // всегда ссылается на существующий бандл — не будет «белого экрана» после деплоя.
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})
