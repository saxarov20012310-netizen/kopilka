// Лёгкий статический сервер для прода (Railway): gzip-сжатие + кэш + SPA-fallback.
import express from 'express'
import compression from 'compression'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, 'dist')
const app = express()

// Сжимаем всё (JS/CSS/HTML) на лету — трафик втрое меньше.
app.use(compression())

// Имена бандла стабильные (assets/index.js без хэша — против «белого экрана»
// от кэша Telegram). Из-за этого нельзя держать max-age: webview кэшировал бы
// старый бандл и не показывал обновления после деплоя. Ставим no-cache —
// клиент КАЖДЫЙ раз ревалидирует по ETag: не менялось → 304 (быстро, без
// перекачки), задеплоили новое → полная отдача. Всегда свежая версия.
app.use(
  express.static(dist, {
    etag: true,
    lastModified: true,
    setHeaders(res) {
      res.setHeader('Cache-Control', 'no-cache')
    },
  })
)

// SPA-fallback: любой путь → index.html.
app.get('*', (_req, res) => {
  res.sendFile(path.join(dist, 'index.html'))
})

const port = process.env.PORT || 3000
app.listen(port, '0.0.0.0', () => {
  console.log(`Копилка слушает на :${port}`)
})
