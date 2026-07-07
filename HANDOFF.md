# Копилка — HANDOFF (передача проекта)

Telegram Mini App для накопления денег к цели. Премиальный fintech-UI, React + TS + Vite + Tailwind.
Этот файл — точка входа, чтобы продолжить работу на другом компьютере.

## ✅ РЕДИЗАЙН «ЭЛЕКТРИК» — ВНЕДРЁН (июль 2026)
Дизайн-система из спецификации «Спецификация - Электрик.md» реализована полностью и задеплоена:
- **Токены двухрежимные** (`src/styles/index.css`): light — фон `#F1F2F7`, акцент индиго `#5A48E8`;
  dark — фон `#0C0E1C`, акцент лайм `#C6F245`. Tailwind-классы завязаны на CSS-переменные
  (`accent`, `onaccent`, `income`, `expense`, `line`, `surface2`, `inverse`...), см. `tailwind.config.js`.
  Старые классы (`brand-*`, `hairline`, `ink-muted`) — алиасы на новые токены.
- **Шрифты:** Onest (текст) + Unbounded (крупные суммы, `font-display`) с Google Fonts (`index.html`).
- **Иконки:** свой SVG-набор `src/components/icons.tsx` (зарплата/аванс/чаевые/цель/трата/другое/кошелёк) — эмодзи убраны.
- **Экраны по спеке:** таймлайн контрольных точек с состояниями (пройдена/следующая-карточка/будущая),
  Settings с полями-карточками и тёмной картой слайдера (лайм, свечение), живая мотивация с дельтой к плану
  (`calcPlanDelta` в calc.ts: опережение/в графике/отставание + «догоните +N ₽/день»).
- **Память:** Telegram CloudStorage (чанки по 3800 симв., ключи `k2m`, `k2_i`) + localStorage
  (формат `{updatedAt, state}`, старый формат мигрируется). Побеждает более свежая копия.
- **Вне Telegram** (браузер): фолбэк-кнопки «Добавить»/«Сохранить»/назад (MainButton/BackButton только в TG).
- **Семантика расходов** (`affectsSavings` в calc.ts): баланс копилки уменьшает ТОЛЬКО категория
  «Из копилки» ('goal'). «Трата»/«Другое» — журнальные записи («потратил вместо того, чтобы отложить»),
  баланс не трогают: в Истории приглушены с пометкой «не из копилки», в итог дня не входят.
- **Стратегия 2.0** (`calcStrategy` в calc.ts): Settings += `shiftsPerMonth`, `tipsPerShift` (онбординг
  спрашивает шагом-формой «Ваш ритм работы»). Остаток цели раскладывается по РЕАЛЬНЫМ будущим
  поступлениям до дедлайна (каждая зарплата 55% оклада, аванс 45%, смена = чаевые) →
  requiredShare = remaining/inflow. Вердикты: done/easy/fits/tight/unreal. На Главной — карта
  «Стратегия до дедлайна» (с зарплаты/с аванса/за смену + строка вердикта), в Настройках — живая
  сверка нормы со стратегией прямо при вводе (до сохранения). «Ближайшие поступления» тоже из стратегии.
- **Кнопки действий — В ПРИЛОЖЕНИИ, не Telegram MainButton** (решение пользователя): «Добавить N ₽»,
  «Сохранить» (виден только при dirty), кнопки онбординга — обычные кнопки в контенте.
  useMainButton в useTelegram.ts оставлен (исправлен от мигания: 3 эффекта, hide только на unmount),
  но НЕ используется. BackButton Telegram используется (в браузере — своя стрелка).
- **Клавиатура**: focusin на текстовый input → scrollIntoView(center) с задержкой 300мс
  (attachKeyboardScroll в useTelegram.ts) — поле не прячется под клавиатурой.
- **Доход раздельно**: Settings.salaryAmount (~25к) + advanceAmount (~12к) вместо monthlyIncome
  (реальная структура: маленький оклад, основное — чаевые). Кнопка добавления — просто «Добавить».
- **ИНТЕГРАЦИЯ СО SKAZKA (tips-bot, проект bibi)**: read-only. В bibi добавлен
  `GET /api/kopilka/summary?telegram_id=&key=` (bot/api/routes.py, свой секрет KOPILKA_KEY в env
  Railway tips-bot, путь в AUTH_EXEMPT, CORS для домена копилки в bot/main.py). Отдаёт за 30 дней:
  смены, чай всего/в среднем, shiftsPerMonth, lastShift. В копилке: `src/utils/skazka.ts` (URL+ключ
  в бандле — персональная интеграция) + кнопка «Подтянуть из skazka» в Настройках — заполняет
  «Смен в месяц»/«Чаевые за смену» фактом, сохранение обычной кнопкой. Работает только в Telegram
  (нужен user id из initDataUnsafe).
- `useTelegram.applyTheme` больше НЕ применяет themeParams клиента к токенам — палитра фирменная,
  из Telegram берётся только colorScheme. MainButton красится в акцент темы.
- Баг «невидимые цифры на янтарных плитках в тёмной теме» устранён самим редизайном (StatTile без заливки).

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
| Прод-URL (АКТУАЛЬНЫЙ) | https://kopilka-production-11aa.up.railway.app/ (Railway) |
| Прод-URL (зеркало) | https://kopilka.saxarov20012310.workers.dev/ (Cloudflare, в РФ у владельца блокируется) |
| Хостинг | Railway (Hobby-план). Деплой: `railway up` из папки kopilka (railway.exe в Desktop\bibi, CLI авторизован). Автодеплоя из git пока НЕТ — можно подключить репо в дашборде Railway. |
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

### 1. ~~[БАГ] Тёмная тема — не видно текст на «янтарных» плитках~~ ✅ ИСПРАВЛЕНО
Устранено редизайном «Электрик»: StatTile больше не заливается, значение красится акцентом темы.

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
- ~~Бэкенд для синхронизации между устройствами~~ ✅ сделано через Telegram CloudStorage (см. `src/utils/storage.ts`).
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
  components/  ProgressRing, Sparkline, TabBar (парящий), StatTile, Card, Segmented, Motivation (живая, по дельте к плану), TransactionRow, ErrorBoundary, icons (SVG-набор)
  pages/       Home, Plan, Transactions, Settings, Onboarding, AddTransaction
  hooks/       useTelegram (тема, safe area, MainButton, BackButton, haptic, popup)
  store/       store.tsx (useReducer + Context; автосохранение: localStorage + Telegram CloudStorage, гидратация из облака при старте)
  utils/       format (рубли), date, calc (вся математика накоплений + calcPlanDelta), storage (два слоя памяти)
  types/       models.ts, telegram.d.ts
  styles/      index.css (CSS-переменные темы: светлая + тёмная через [data-theme='dark'])
```
Цель по умолчанию: 464 000 ₽ к 18 января, доход 100 000 ₽/мес, зарплата 5-го, аванс 20-го, чаевые.
