// Интеграция со skazka (бот учёта смен и чаевых, проект bibi).
// Read-only: копилка подтягивает фактический ритм работы за последние 30 дней,
// чтобы стратегия считалась по реальным сменам и чаевым, а не по ручным оценкам.
// Персональная интеграция — авторизация общим секретом.

const SKAZKA_URL = 'https://tips-bot-production-946d.up.railway.app'
const KEY = '1af63f815b64644de04b47705c328a16634f24ab'

export interface SkazkaShift {
  /** id смены в skazka — для идемпотентности (одну смену не предложить дважды). */
  id: number
  /** ISO-дата смены. */
  date: string
  /** Чаевые за смену, ₽. */
  tips: number
}

export interface SkazkaSummary {
  days: number
  /** Смен за период. */
  shifts: number
  /** Сумма чаевых за период, ₽. */
  tipsTotal: number
  /** Средние чаевые за смену, ₽. */
  avgTips: number
  /** Нормировка на месяц — сразу в настройки копилки. */
  shiftsPerMonth: number
  lastShift: { date: string; tips: number } | null
  /** Смены текущего календарного месяца. */
  monthShifts: SkazkaShift[]
  /** Сумма чаевых за текущий месяц, ₽. */
  monthTips: number
  /** Реальный оклад БЕЗ чая за прошлый полный месяц (0 — не было смен). */
  monthBase: number
  /** ISO-дата начала месяца, за который посчитан monthBase. */
  monthBaseFrom: string
}

export type SkazkaResult =
  | { ok: true; data: SkazkaSummary }
  | { ok: false; reason: string }

/** Полный вызов с причиной ошибки — для ручного синка (показать пользователю). */
export async function fetchSkazkaResult(telegramId: number): Promise<SkazkaResult> {
  try {
    const r = await fetch(
      `${SKAZKA_URL}/api/kopilka/summary?telegram_id=${telegramId}&key=${KEY}`
    )
    if (!r.ok) {
      return { ok: false, reason: `сервер ответил ${r.status}${r.status === 404 ? ' (пользователь не найден в skazka)' : r.status === 401 ? ' (ключ не принят)' : ''}` }
    }
    return { ok: true, data: (await r.json()) as SkazkaSummary }
  } catch (e) {
    return { ok: false, reason: `сеть недоступна (${e instanceof Error ? e.message : 'ошибка запроса'})` }
  }
}

/** Упрощённый вызов — для автосинхронизации (data или null). */
export async function fetchSkazkaSummary(telegramId: number): Promise<SkazkaSummary | null> {
  const res = await fetchSkazkaResult(telegramId)
  return res.ok ? res.data : null
}
