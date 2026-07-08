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

export function addMonths(iso: string, n: number): string {
  const d = fromISO(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  // Кламп к длине целевого месяца (31 янв + 1 мес → 28/29 фев, не 3 марта).
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, dim))
  return toISO(d)
}

/** «январь 2027» — месяц и год (для прогноза срока). */
export function formatMonthYear(iso: string): string {
  const d = fromISO(iso)
  return `${MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`
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

const MONTHS_NOM = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

/** «июль» — именительный падеж (для «за июль»). */
export const monthNameNom = (iso: string): string => MONTHS_NOM[fromISO(iso).getMonth()]

const MONTHS_PREP = [
  'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре',
]

/** «июле» — предложный падеж (для «в июле»). */
export const monthNamePrep = (iso: string): string => MONTHS_PREP[fromISO(iso).getMonth()]

/** Выходной ли день (сб/вс). */
export function isWeekend(iso: string): boolean {
  const d = fromISO(iso).getDay()
  return d === 0 || d === 6
}

/** Сдвигает дату на предыдущий рабочий день, если она попадает на выходные. */
export function prevBusinessDay(iso: string): string {
  let cur = iso
  while (isWeekend(cur)) cur = addDays(cur, -1)
  return cur
}

/**
 * Ближайшая дата выплаты с заданным днём месяца, с учётом переноса:
 * если день выпадает на выходной — выплата в предыдущий рабочий день (ТК РФ, ст. 136).
 * Если такая дата уже прошла — берём выплату следующего месяца.
 */
/**
 * Дата выплаты в месяце заданной даты (кламп к длине месяца,
 * выходной → предыдущий рабочий день). Может уже быть в прошлом.
 */
export function paydayInMonth(day: number, anyDayISO: string): string {
  const d = fromISO(anyDayISO)
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return prevBusinessDay(toISO(new Date(d.getFullYear(), d.getMonth(), Math.min(day, dim))))
}

export function nextPayday(day: number, fromISOStr: string): string {
  const nominal = nextDayOfMonth(day, fromISOStr)
  const shifted = prevBusinessDay(nominal)
  if (shifted >= fromISOStr) return shifted
  // Сдвиг увёл дату в прошлое — берём следующий месяц.
  const nextMonthNominal = nextDayOfMonth(day, addDays(nominal, 1))
  return prevBusinessDay(nextMonthNominal)
}
