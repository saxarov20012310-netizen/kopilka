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
}

export async function fetchSkazkaSummary(telegramId: number): Promise<SkazkaSummary | null> {
  try {
    const r = await fetch(
      `${SKAZKA_URL}/api/kopilka/summary?telegram_id=${telegramId}&key=${KEY}`
    )
    if (!r.ok) return null
    return (await r.json()) as SkazkaSummary
  } catch {
    return null
  }
}
