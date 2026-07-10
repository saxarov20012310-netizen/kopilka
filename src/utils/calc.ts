// Централизованные расчёты накоплений. Здесь вся математика приложения.
import type { AppState, Transaction, IncomeSource } from '../types/models'
import { daysBetween, todayISO, nextPayday, addDays, addMonths, paydayInMonth, monthNameNom, monthNamePrep, fromISO } from './date'
import { activeGoal } from './storage'

export interface Progress {
  saved: number
  remaining: number
  percent: number // 0..100
  daysLeft: number
  overdue: boolean
  reached: boolean
}

/**
 * Влияет ли операция на баланс копилки.
 * Поступления — зачисляются; из расходов баланс уменьшает только «Из копилки»
 * (category 'goal'). Обычная трата — просто журнал «потратил вместо того,
 * чтобы отложить»: деньги шли мимо копилки, баланс не трогаем.
 */
export function affectsSavings(t: Transaction): boolean {
  if (!t.counts) return false
  return t.kind === 'income' || t.category === 'goal'
}

/**
 * Накоплено = поступления − списания «Из копилки».
 * Если задан goalId — считаем только по этой цели (у каждой цели своя копилка).
 */
export function calcSaved(transactions: Transaction[], goalId?: string): number {
  return transactions.reduce((acc, t) => {
    if (!affectsSavings(t)) return acc
    if (goalId != null && t.goalId !== goalId) return acc
    return acc + (t.kind === 'income' ? t.amount : -t.amount)
  }, 0)
}

export function calcProgress(state: AppState): Progress {
  const goal = activeGoal(state)
  const saved = calcSaved(state.transactions, goal.id)
  const target = goal.target
  const remaining = Math.max(0, target - saved)
  const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0
  const daysLeft = daysBetween(todayISO(), goal.deadline)
  return {
    saved,
    remaining,
    percent,
    daysLeft,
    overdue: daysLeft < 0,
    reached: saved >= target,
  }
}

export interface MonthPace {
  /** Название месяца в предложном падеже («июле»). */
  monthName: string
  /** Ровная месячная норма к активной цели, ₽. */
  needed: number
  /** Отложено в активную цель в этом месяце, ₽. */
  saved: number
  /** Сколько ещё доложить до нормы месяца, ₽ (0 — норма выполнена). */
  remaining: number
  /** Сколько в день/неделю, чтобы добить норму до конца месяца. */
  perDay: number
  perWeek: number
  /** Дней до конца месяца (включая сегодня). */
  daysLeft: number
  /** Прогресс к норме месяца, 0..100. */
  percent: number
  /** Норма месяца выполнена. */
  met: boolean
}

/**
 * Темп текущего месяца по активной цели: сколько уже отложено против ровной
 * месячной нормы и сколько нужно откладывать в день/неделю, чтобы добить норму
 * до конца месяца.
 */
export function calcMonthPace(state: AppState): MonthPace {
  const goal = activeGoal(state)
  const prog = calcProgress(state)
  const today = todayISO()
  const now = fromISO(today)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = lastDay - now.getDate() + 1

  // Ровная месячная норма: остаток цели, размазанный по месяцам до дедлайна.
  const needed = prog.reached ? 0 : Math.round((prog.remaining * 30) / Math.max(1, prog.daysLeft))

  // Отложено в этом месяце именно в активную цель.
  const monthStart = today.slice(0, 8) + '01'
  const savedRaw = state.transactions.reduce((acc, t) => {
    if (!affectsSavings(t) || t.goalId !== goal.id) return acc
    if (t.date < monthStart || t.date > today) return acc
    return acc + (t.kind === 'income' ? t.amount : -t.amount)
  }, 0)
  const saved = Math.max(0, savedRaw)

  const remaining = Math.max(0, needed - saved)
  const perDay = remaining > 0 ? Math.ceil(remaining / daysLeft) : 0
  const perWeek = remaining > 0 ? Math.ceil(remaining / Math.max(1, daysLeft / 7)) : 0
  const percent = needed > 0 ? Math.min(100, (saved / needed) * 100) : 100

  return {
    monthName: monthNamePrep(today),
    needed,
    saved,
    remaining,
    perDay,
    perWeek,
    daysLeft,
    percent,
    met: remaining === 0,
  }
}

export interface Pace {
  perDay: number
  perWeek: number
  perMonth: number
}

/** Сколько нужно откладывать, чтобы успеть к дедлайну. */
export function calcPace(state: AppState): Pace {
  const { remaining, daysLeft } = calcProgress(state)
  const safeDays = Math.max(1, daysLeft)
  const perDay = remaining / safeDays
  return {
    perDay,
    perWeek: perDay * 7,
    perMonth: perDay * 30,
  }
}

export interface PlanDelta {
  /** Сколько должно быть накоплено к сегодняшнему дню по линейному плану. */
  expected: number
  /** Факт − план: > 0 — опережение, < 0 — отставание. */
  delta: number
  status: 'start' | 'ahead' | 'onTrack' | 'behind' | 'reached' | 'overdue'
  /** Сколько добавлять в день, чтобы догнать план (окно до 7 дней). */
  catchUpPerDay: number
}

/** Положение относительно плана: линейная линия от startDate до дедлайна. */
export function calcPlanDelta(state: AppState): PlanDelta {
  const { saved, daysLeft, reached, overdue } = calcProgress(state)
  const goal = activeGoal(state)
  const target = goal.target
  const start = goal.startDate || todayISO()
  const totalDays = Math.max(1, daysBetween(start, goal.deadline))
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(start, todayISO())))
  const expected = (target * elapsed) / totalDays
  const delta = saved - expected

  // Допуск «в графике»: 1% цели, но не меньше 500 ₽ — чтобы не дёргать статус по мелочи.
  const tolerance = Math.max(500, target * 0.01)
  const catchWindow = Math.max(1, Math.min(7, daysLeft))
  const catchUpPerDay = delta < 0 ? Math.ceil(-delta / catchWindow) : 0

  let status: PlanDelta['status']
  if (reached) status = 'reached'
  else if (overdue) status = 'overdue'
  else if (elapsed <= 2 && saved === 0) status = 'start'
  else if (delta >= tolerance) status = 'ahead'
  else if (delta <= -tolerance) status = 'behind'
  else status = 'onTrack'

  return { expected, delta, status, catchUpPerDay }
}

// ───────────────────────── Заработок месяца ─────────────────────────

export interface EarningItem {
  kind: 'salary' | 'advance' | 'shift'
  title: string
  sub: string
  date: string
  amount: number
  /** Деньги уже на руках (или смена уже отработана). */
  received: boolean
}

export interface MonthEarnings {
  /** Строки: выплаты и смены текущего месяца (полученные и ожидаемые). */
  items: EarningItem[]
  /** Получено в этом месяце (чай отработанных смен + пришедшие выплаты), ₽. */
  received: number
  /** Ещё ожидается в этом месяце + зарплата за этот месяц (придёт 5-го следующего), ₽. */
  expected: number
  /** Отложено в копилку в этом месяце, ₽. */
  savedThisMonth: number
  /** Доля отложенного от полученного (0..1). */
  savedShare: number
  /** Сколько ещё доложить, чтобы выйти на требуемую долю стратегии, ₽. */
  topUp: number
  /** Потрачено в этом месяце (все расходы), ₽. */
  spentThisMonth: number
  /** Свободно из полученного: получено − отложено − потрачено (может быть < 0). */
  free: number
  shiftsCount: number
  tipsTotal: number
}

/**
 * Заработок текущего месяца по кассовому принципу: что реально пришло.
 * Зарплата, пришедшая 5-го ЭТОГО месяца, — за прошлый месяц (так и подписываем);
 * зарплата за текущий месяц придёт ~5-го следующего — показываем как ожидаемую.
 */
export function calcMonthEarnings(state: AppState): MonthEarnings {
  const today = todayISO()
  const { salaryAmount, advanceAmount, salaryDay, advanceDay } = state.settings
  const monthStart = today.slice(0, 8) + '01'
  const items: EarningItem[] = []

  // Зарплата этого месяца (за прошлый месяц работы).
  const salaryDate = paydayInMonth(salaryDay, today)
  items.push({
    kind: 'salary',
    title: 'Зарплата',
    sub: `за ${monthNameNom(addDays(monthStart, -1))}`,
    date: salaryDate,
    amount: salaryAmount,
    received: salaryDate <= today,
  })

  // Аванс этого месяца.
  const advanceDate = paydayInMonth(advanceDay, today)
  items.push({
    kind: 'advance',
    title: 'Аванс',
    sub: `за ${monthNameNom(today)}`,
    date: advanceDate,
    amount: advanceAmount,
    received: advanceDate <= today,
  })

  // Зарплата ЗА текущий месяц — придёт ~5-го следующего.
  const nextMonthDay = addDays(monthStart, 32)
  const nextSalaryDate = paydayInMonth(salaryDay, nextMonthDay)
  items.push({
    kind: 'salary',
    title: 'Зарплата',
    sub: `за ${monthNameNom(today)} · придёт позже`,
    date: nextSalaryDate,
    amount: salaryAmount,
    received: false,
  })

  // Смены месяца из skazka: чай уже на руках.
  const shifts = state.skazka?.monthShifts ?? []
  for (const s of shifts) {
    items.push({
      kind: 'shift',
      title: 'Смена',
      sub: 'чаевые',
      date: s.date,
      amount: Math.round(s.tips),
      received: true,
    })
  }

  items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const received = items.reduce((acc, it) => acc + (it.received ? it.amount : 0), 0)
  const expected = items.reduce((acc, it) => acc + (it.received ? 0 : it.amount), 0)

  // Отложено в копилку в этом месяце (поступления в копилку по дате).
  const savedThisMonth = state.transactions.reduce(
    (acc, t) =>
      affectsSavings(t) && t.date >= monthStart && t.date <= today
        ? acc + (t.kind === 'income' ? t.amount : -t.amount)
        : acc,
    0
  )

  // Потрачено в этом месяце — все расходы (реально ушедшие деньги).
  const spentThisMonth = state.transactions.reduce(
    (acc, t) =>
      t.kind === 'expense' && t.date >= monthStart && t.date <= today ? acc + t.amount : acc,
    0
  )

  const savedShare = received > 0 ? Math.max(0, savedThisMonth) / received : 0
  const { requiredShare } = calcStrategy(state)
  const share = Number.isFinite(requiredShare) ? Math.min(1, requiredShare) : 1
  const topUp = Math.max(0, Math.round(received * share - Math.max(0, savedThisMonth)))
  const free = received - Math.max(0, savedThisMonth) - spentThisMonth

  return {
    items,
    received,
    expected,
    savedThisMonth,
    savedShare,
    topUp,
    spentThisMonth,
    free,
    shiftsCount: shifts.length,
    tipsTotal: state.skazka?.monthTips ?? 0,
  }
}

// ───────────────────────── Стратегия накопления ─────────────────────────

export interface Strategy {
  /** Ожидаемый приток денег до дедлайна: зарплаты + авансы + чаевые, ₽. */
  expectedInflow: number
  /** Какую долю КАЖДОГО поступления надо откладывать, чтобы успеть (0..1+). */
  requiredShare: number
  /** Рекомендации в рублях. */
  perSalary: number
  perAdvance: number
  perShift: number
  /** Сколько событий каждого типа осталось до дедлайна. */
  salaries: number
  advances: number
  shifts: number
  /** Оценка размера выплат. */
  salaryAmount: number
  advanceAmount: number
  /** Траты «мимо копилки» за последние 30 дней — потенциал ускорения. */
  spent30: number
  /** Реалистичность цели при текущем ритме работы. */
  verdict: 'done' | 'easy' | 'fits' | 'tight' | 'unreal'
  /** Сколько реально можно откладывать в месяц при текущей норме, ₽. */
  monthlyAchievable: number
  /** Прогноз даты достижения цели при текущей норме (ISO). null — норма 0. */
  realisticDate: string | null
}

/** Сколько раз день месяца (зарплата/аванс) встретится в интервале (from, to]. */
function countPaydays(day: number, fromISO: string, toISO: string): number {
  const from = new Date(fromISO + 'T00:00:00')
  const to = new Date(toISO + 'T00:00:00')
  if (to <= from) return 0
  let n = 0
  const cur = new Date(from.getFullYear(), from.getMonth(), 1)
  while (cur <= to) {
    const daysInMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate()
    const occ = new Date(cur.getFullYear(), cur.getMonth(), Math.min(day, daysInMonth))
    if (occ > from && occ <= to) n++
    cur.setMonth(cur.getMonth() + 1)
  }
  return n
}

/**
 * Адаптивная стратегия: раскладывает остаток цели по РЕАЛЬНЫМ будущим
 * поступлениям (каждая зарплата, каждый аванс, каждая смена до дедлайна).
 * Пересчитывается на лету при любом изменении: цели, дедлайна, ритма смен,
 * фактических накоплений.
 */
export function calcStrategy(state: AppState): Strategy {
  const { remaining, daysLeft } = calcProgress(state)
  const { salaryAmount, advanceAmount, salaryDay, advanceDay, savingRate, shiftsPerMonth, tipsPerShift } =
    state.settings
  const today = todayISO()

  const horizon = Math.max(0, daysLeft)
  const deadline = activeGoal(state).deadline
  const salaries = countPaydays(salaryDay, today, deadline)
  const advances = countPaydays(advanceDay, today, deadline)
  const shifts = Math.round((shiftsPerMonth * horizon) / 30)

  const expectedInflow =
    salaries * salaryAmount + advances * advanceAmount + shifts * tipsPerShift

  const requiredShare = expectedInflow > 0 ? remaining / expectedInflow : Infinity

  // Рекомендация не может превышать само поступление.
  const clampShare = Math.min(1, Math.max(0, requiredShare))
  const perSalary = Math.round(salaryAmount * clampShare)
  const perAdvance = Math.round(advanceAmount * clampShare)
  const perShift = Math.round(tipsPerShift * clampShare)

  // Траты мимо копилки за 30 дней — сколько «утекло» потенциала.
  const cutoff = addDays(today, -30)
  const spent30 = state.transactions.reduce(
    (acc, t) =>
      t.kind === 'expense' && !affectsSavings(t) && t.date > cutoff ? acc + t.amount : acc,
    0
  )

  let verdict: Strategy['verdict']
  if (remaining <= 0) verdict = 'done'
  else if (requiredShare > 1) verdict = 'unreal'
  else if (requiredShare > savingRate) verdict = 'tight'
  else if (requiredShare > savingRate * 0.6) verdict = 'fits'
  else verdict = 'easy'

  // Реальный темп: сколько откладываем в месяц при текущей норме → прогноз даты.
  const monthlyIncomeTotal = salaryAmount + advanceAmount + shiftsPerMonth * tipsPerShift
  const monthlyAchievable = Math.round(monthlyIncomeTotal * savingRate)
  const realisticDate =
    remaining > 0 && monthlyAchievable > 0
      ? addMonths(today, Math.ceil(remaining / monthlyAchievable))
      : null

  return {
    expectedInflow,
    requiredShare,
    perSalary,
    perAdvance,
    perShift,
    salaries,
    advances,
    shifts,
    salaryAmount,
    advanceAmount,
    spent30,
    verdict,
    monthlyAchievable,
    realisticDate,
  }
}

export interface UpcomingEvent {
  date: string
  source: IncomeSource
  title: string
  /** Рекомендуемая сумма к откладыванию с этого поступления. */
  suggested: number
  /** Ожидаемая сумма поступления (оценка). */
  expected: number
}

/**
 * Ближайшие поступления и рекомендация с каждого — из стратегии,
 * а не из фиксированной нормы: сколько реально нужно, чтобы успеть.
 */
export function calcUpcoming(state: AppState): UpcomingEvent[] {
  const { salaryDay, advanceDay, shiftsPerMonth, tipsPerShift } = state.settings
  const s = calcStrategy(state)
  const today = todayISO()

  // Если день выплаты выпадает на выходной — деньги приходят в предыдущий рабочий день.
  const salaryDate = nextPayday(salaryDay, today)
  const advanceDate = nextPayday(advanceDay, today)
  // Ближайшая смена — в среднем через 30/сменность дней.
  const shiftDate = addDays(today, Math.max(1, Math.round(30 / Math.max(1, shiftsPerMonth))))

  const events: UpcomingEvent[] = [
    {
      date: salaryDate,
      source: 'salary',
      title: 'Зарплата',
      expected: s.salaryAmount,
      suggested: s.perSalary,
    },
    {
      date: advanceDate,
      source: 'advance',
      title: 'Аванс',
      expected: s.advanceAmount,
      suggested: s.perAdvance,
    },
    {
      date: shiftDate,
      source: 'tips',
      title: 'Чаевые за смену',
      expected: tipsPerShift,
      suggested: s.perShift,
    },
  ]

  return events.sort((a, b) => (a.date < b.date ? -1 : 1))
}

export interface PlanPoint {
  date: string
  label: string
  amount: number // накопленная сумма к этой дате по плану
}

/** План накопления по контрольным точкам от сегодня до дедлайна. */
export function calcPlan(state: AppState, points = 6): PlanPoint[] {
  const { saved, remaining, daysLeft } = calcProgress(state)
  if (daysLeft <= 0 || remaining <= 0) return []
  const step = Math.max(1, Math.floor(daysLeft / points))
  const perDay = remaining / daysLeft
  const result: PlanPoint[] = []
  for (let i = 1; i <= points; i++) {
    const d = Math.min(daysLeft, step * i)
    result.push({
      date: addDays(todayISO(), d),
      label: `Неделя ${i}`,
      amount: Math.round(saved + perDay * d),
    })
  }
  return result
}

/** Точки для мини-графика динамики баланса (накопительно по датам операций). */
export function calcBalanceSeries(transactions: Transaction[]): { date: string; value: number }[] {
  const sorted = [...transactions]
    .filter(affectsSavings)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
  let running = 0
  const map = new Map<string, number>()
  for (const t of sorted) {
    running += t.kind === 'income' ? t.amount : -t.amount
    map.set(t.date, running)
  }
  return [...map.entries()].map(([date, value]) => ({ date, value }))
}
