// Централизованные расчёты накоплений. Здесь вся математика приложения.
import type { AppState, Transaction, IncomeSource } from '../types/models'
import { daysBetween, todayISO, nextDayOfMonth, addDays } from './date'

export interface Progress {
  saved: number
  remaining: number
  percent: number // 0..100
  daysLeft: number
  overdue: boolean
  reached: boolean
}

/** Накоплено = сумма учитываемых поступлений − учитываемые расходы. */
export function calcSaved(transactions: Transaction[]): number {
  return transactions.reduce((acc, t) => {
    if (!t.counts) return acc
    return acc + (t.kind === 'income' ? t.amount : -t.amount)
  }, 0)
}

export function calcProgress(state: AppState): Progress {
  const saved = calcSaved(state.transactions)
  const target = state.goal.target
  const remaining = Math.max(0, target - saved)
  const percent = target > 0 ? Math.min(100, (saved / target) * 100) : 0
  const daysLeft = daysBetween(todayISO(), state.goal.deadline)
  return {
    saved,
    remaining,
    percent,
    daysLeft,
    overdue: daysLeft < 0,
    reached: saved >= target,
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
 * Ближайшие поступления (зарплата, аванс) и рекомендация,
 * сколько отложить с каждого, чтобы идти по плану к цели.
 */
export function calcUpcoming(state: AppState): UpcomingEvent[] {
  const { salaryDay, advanceDay, monthlyIncome, savingRate } = state.settings
  const pace = calcPace(state)
  const today = todayISO()

  // Оценка выплат: зарплата ~55% месячного дохода, аванс ~45% (типичная схема).
  const salaryAmount = Math.round(monthlyIncome * 0.55)
  const advanceAmount = Math.round(monthlyIncome * 0.45)

  const salaryDate = nextDayOfMonth(salaryDay, today)
  const advanceDate = nextDayOfMonth(advanceDay, today)

  // Рекомендация с выплаты: доля дохода, но не больше половины месячной нормы.
  const suggestFrom = (amount: number) =>
    Math.min(Math.round(amount * savingRate), Math.round(pace.perMonth / 2))

  const events: UpcomingEvent[] = [
    {
      date: salaryDate,
      source: 'salary',
      title: 'Зарплата',
      expected: salaryAmount,
      suggested: Math.max(0, suggestFrom(salaryAmount)),
    },
    {
      date: advanceDate,
      source: 'advance',
      title: 'Аванс',
      expected: advanceAmount,
      suggested: Math.max(0, suggestFrom(advanceAmount)),
    },
    {
      date: addDays(today, 3),
      source: 'tips',
      title: 'Чаевые после смены',
      expected: 0,
      suggested: Math.max(0, Math.round(pace.perDay)),
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
    .filter((t) => t.counts)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.createdAt - b.createdAt))
  let running = 0
  const map = new Map<string, number>()
  for (const t of sorted) {
    running += t.kind === 'income' ? t.amount : -t.amount
    map.set(t.date, running)
  }
  return [...map.entries()].map(([date, value]) => ({ date, value }))
}
