# Копилка — HANDOFF (передача проекта)

Telegram Mini App для накопления денег к цели. Премиальный fintech-UI, React + TS + Vite + Tailwind.
Этот файл — точка входа, чтобы продолжить работу на другом компьютере.

## Как продолжить на новом компьютере
```bash
git clone https://github.com/saxarov20012310-netizen/kopilka.git
cd kopilka
npm install
npm run dev            # локальная разработка: http://localhost:5173
```
Деплой: **просто `git push` в ветку `main`** — Cloudflare сам соберёт и выложит (автосборка из git).
НИКОГДА не заливай папку вручную (drag-drop) в Cloudflare — однажды так залился чужой бот вместо копилки.

## Где что живёт
| | |
|---|---|
| Код (этот комп) | `C:\Users\Kirill Sackharov\Desktop\kopilka` |
| Репозиторий | https://github.com/saxarov20012310-netizen/kopilka (публичный) |
| Прод-URL | https://kopilka.saxarov20012310.workers.dev/ |
| Хостинг | Cloudflare Workers (Static Assets), автодеплой из git при push в main |
| Бот | @SugarMoneyoffBot (id 8859739851) |
| GitHub аккаунт | saxarov20012310-netizen (gh CLI уже авторизован) |
| Cloudflare аккаунт | saxarov20012310@gmail.com |

## Статус: ЧТО РАБОТАЕТ
- ✅ Приложение задеплоено на Cloudflare, открывается в Telegram **без VPN** (github.io был заблокирован провайдером в РФ — поэтому ушли на workers.dev).
- ✅ Кнопка-меню бота (setChatMenuButton) настроена на workers.dev URL.
- ✅ Главный Mini App включён (has_main_web_app=true).
- ✅ Светлая тема доработана по контрасту (границы карточек/плиток/чипов).
- ✅ Старт с чистого листа (без демо-данных), парящий нижний бар.

## ЧТО ОСТАЛОСЬ (todo, по приоритету)

### 1. [БАГ] Тёмная тема — не видно текст на «янтарных» плитках
На скриншоте пользователя (Telegram dark mode) плитки с `accent` («Осталось», «В день») имеют светлый фон `bg-brand-50`, а текст `text-ink` в тёмной теме становится светлым → **цифры невидимы**.
- Файл: `src/components/StatTile.tsx` — вариант `accent` использует `bg-brand-50 text-ink`.
- Также проверить все места с `bg-brand-50` + текстом, зависящим от темы: чип «до 18 января» и «0%» (`text-brand-700` на `bg-brand-50` — там ок, тёмный текст на светлом), эмодзи-кружки (только фон — ок).
- **Фикс:** у accent-плитки фон всегда светлый (cream), значит текст должен быть всегда тёмным независимо от темы. Заменить `text-ink` → фиксированный тёмный (напр. `text-brand-900`), а лейбл — на тёмный приглушённый (напр. `text-brand-800/70`). Либо сделать accent-фон адаптивным к тёмной теме (`dark:bg-brand-500/15 dark:text-brand-100`) — но проще зафиксировать тёмный текст.
- После фикса ОБЯЗАТЕЛЬНО проверить в тёмной теме (эмуляция: `preview_resize` colorScheme dark, либо dev-стаб Telegram с `colorScheme:'dark'`).

### 2. BotFather — URL «главного» Mini App
Проверить, что в BotFather → /mybots → @SugarMoneyoffBot → Bot Settings → Configure Mini App → Edit Mini App URL стоит:
```
https://kopilka.saxarov20012310.workers.dev/
```
(меню-кнопка уже правильная; если «главный» app всё ещё указывает на github.io — с карточки бота будет вечная загрузка, т.к. github.io заблокирован).

### 3. [БЕЗОПАСНОСТЬ] Перевыпустить токен бота
Токен @SugarMoneyoffBot дважды светился в переписке. BotFather → выбрать бота → API Token → Revoke current token. Настройки Mini App при этом сохранятся.

### 4. Дальнейшие улучшения (по желанию)
- Пуш-напоминания в дни зарплаты (5) / аванса (20): «пора отложить N ₽».
- Несколько целей и переключение.
- Бэкенд для синхронизации между устройствами (сейчас данные только в localStorage браузера, ключ `kopilka:v2`).
- Прогноз даты достижения цели при текущем темпе.
- Редактирование операции (сейчас только удаление).

## Технические заметки (важно, чтобы не сломать деплой)
- **Vite должен быть >= 6** — Cloudflare wrangler требует это для авто-деплоя Vite-проекта (иначе `wrangler deploy` падает). Сейчас Vite 6.
- `wrangler.toml` — раздаёт `dist` как статику, `not_found_handling = "single-page-application"`.
- `vite.config.ts` — `base: './'`, `build.target: 'es2015'` (совместимость со старыми webview), **стабильные имена бандла без хэша** (`assets/index.js`) — чтобы кэш Telegram не ловил белый экран после деплоя.
- `.node-version` = 20.
- Есть `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) — показывает текст ошибки вместо белого экрана.
- Проверка деплоя: `npx wrangler deploy --dry-run` (локально, без авторизации) — должно прочитать файлы из dist.

## Архитектура
```
src/
  components/  ProgressRing, Sparkline, TabBar (парящий), StatTile, Card, Segmented, Motivation, TransactionRow, ErrorBoundary
  pages/       Home, Plan, Transactions, Settings, Onboarding, AddTransaction
  hooks/       useTelegram (тема, safe area, MainButton, BackButton, haptic, popup)
  store/       store.tsx (useReducer + Context, автосохранение в localStorage)
  utils/       format (рубли), date, calc (вся математика накоплений), storage
  types/       models.ts, telegram.d.ts
  styles/      index.css (CSS-переменные темы: светлая + тёмная через [data-theme='dark'])
```
Цель по умолчанию: 464 000 ₽ к 18 января, доход 100 000 ₽/мес, зарплата 5-го, аванс 20-го, чаевые.
