import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' — чтобы приложение работало из любого пути (важно для хостинга Mini App)
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    // PORT задаёт превью-харнесс (Claude Code preview); иначе стандартный 5173.
    port: Number(process.env.PORT) || 5173,
    strictPort: !!process.env.PORT,
    // Дев-запуск через npm --prefix даёт 8.3-путь (KIRILL~1) — обходим строгий allow-list.
    fs: { strict: false },
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
