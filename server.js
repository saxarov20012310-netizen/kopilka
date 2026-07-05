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

// Статика: ассеты кэшируются, но с ETag — после деплоя обновятся (имена стабильные).
app.use(
  express.static(dist, {
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-cache')
      } else {
        // Ассеты можно держать в кэше час; ETag всё равно проверит свежесть.
        res.setHeader('Cache-Control', 'public, max-age=3600')
      }
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
