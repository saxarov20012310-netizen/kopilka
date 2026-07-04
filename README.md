# Копилка — Telegram Mini App для накоплений

Премиальный fintech-интерфейс для достижения денежной цели: цель, прогресс, план накопления по датам, история операций и умные подсказки «сколько отложить с зарплаты, аванса и чаевых».

## Запуск

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # прод-сборка в dist/
npm run preview  # предпросмотр сборки
```

Приложение открывается и в обычном браузере (с безопасными заглушками вместо Telegram SDK), и внутри Telegram.

## Стек

React 18 + TypeScript + Vite + Tailwind CSS. Без тяжёлых зависимостей — графики и кольцо прогресса нарисованы на SVG.

## Архитектура

```
src/
  components/   переиспользуемые UI-блоки (ProgressRing, Sparkline, TabBar, StatTile, ...)
  pages/        экраны: Home, Plan, Transactions, Settings, Onboarding, AddTransaction
  hooks/        useTelegram — обёртка над Telegram WebApp SDK (тема, safe area, MainButton, BackButton, haptic, popup)
  store/        глобальный стор (useReducer + Context) с автосохранением
  utils/        format (рубли), date (даты/склонения), calc (вся математика накоплений), storage (localStorage + моки)
  types/        модели данных и типы Telegram SDK
  styles/       Tailwind + CSS-переменные темы
```

- **Данные** хранятся локально в `localStorage` (ключ `kopilka:v1`), при первом запуске подставляются демо-операции.
- **Все расчёты** (прогресс, темп в месяц/неделю/день, план по датам, рекомендации по выплатам) вынесены в `utils/calc.ts`.
- **Тема** светлая по умолчанию, но подхватывает `themeParams` и `colorScheme` Telegram, включая тёмную тему.

## Поведение в Telegram

- `ready()` + `expand()` при запуске, покраска header/background под экран.
- **MainButton** — основное действие на экранах «Добавить операцию», «Цель и настройки», онбординге.
- **BackButton** — возврат с экрана добавления операции.
- **Popup API** — подтверждение удаления и сообщения (fallback на `window.confirm/alert` вне Telegram).
- **HapticFeedback** — на переключениях, добавлении и успешных действиях.
- Учтены **safe area** и **content safe area** (CSS-переменные `--safe-top` / `--safe-bottom`), нижняя навигация не перекрывается системным UI.

## Деплой Mini App

1. `npm run build` → задеплойте `dist/` на любой статический хостинг по HTTPS (Vercel, Netlify, GitHub Pages, Railway).
2. В [@BotFather](https://t.me/BotFather): `/newapp` (или Bot Settings → Menu Button / Web App) — укажите URL приложения.
3. `manifest.json` в `public/` можно расширить под свои нужды.

## Куда расти (UX и конверсия)

- Пуш-напоминания в дни зарплаты/аванса: «пора отложить N ₽».
- Несколько целей и переключение между ними.
- Автосписание фиксированной суммы по расписанию.
- Синхронизация с бэкендом по `initData` (сейчас данные только локальные).
- Прогноз даты достижения цели при текущем темпе и «что будет, если откладывать больше».
- Достижения/стрики за регулярные взносы.
- Редактирование операции (сейчас — только удаление).
