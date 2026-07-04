// Работа с датами. Всё в локальном времени, ISO-строки без времени (YYYY-MM-DD).

const MS_DAY = 86_400_000

const MONTHS_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISO(new Date())
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Количество полных дней между двумя ISO-датами (b - a). Может быть отрицательным. */
export function daysBetween(aISO: string, bISO: string): number {
  const a = fromISO(aISO).getTime()
  const b = fromISO(bISO).getTime()
  return Math.round((b - a) / MS_DAY)
}

/** «18 января» */
export function formatDay(iso: string): string {
  const d = fromISO(iso)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`
}

/** «18 января 2027» */
export function formatDayYear(iso: string): string {
  const d = fromISO(iso)
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}`
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/**
 * Ближайшая дата с заданным днём месяца, не раньше fromISO.
 * Если день уже прошёл в этом месяце — берём следующий месяц.
 */
export function nextDayOfMonth(day: number, fromISOStr: string): string {
  const base = fromISO(fromISOStr)
  const y = base.getFullYear()
  const m = base.getMonth()
  // Ограничиваем день числом дней в месяце.
  const clamp = (yy: number, mm: number) => {
    const dim = new Date(yy, mm + 1, 0).getDate()
    return Math.min(day, dim)
  }
  let candidate = new Date(y, m, clamp(y, m))
  if (candidate.getTime() < base.getTime()) {
    const nm = m + 1
    candidate = new Date(y, nm, clamp(y, nm))
  }
  return toISO(candidate)
}

export const monthName = (iso: string): string => MONTHS_GEN[fromISO(iso).getMonth()]
