// localStorage persistence + начальные (моковые) данные для демонстрации.
import type { AppState, Transaction } from '../types/models'
import { todayISO, addDays } from './date'

const KEY = 'kopilka:v1'

export const DEFAULT_STATE: AppState = {
  goal: {
    title: 'Моя цель',
    target: 464_000,
    deadline: '2027-01-18',
    startDate: todayISO(),
  },
  settings: {
    monthlyIncome: 100_000,
    salaryDay: 5,
    advanceDay: 20,
    savingRate: 0.4,
  },
  transactions: [],
  onboarded: false,
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

/** Демо-операции, чтобы приложение не было пустым при первом запуске. */
export function makeMockTransactions(): Transaction[] {
  const now = Date.now()
  const mk = (
    kind: Transaction['kind'],
    amount: number,
    daysAgo: number,
    category: Transaction['category'],
    note?: string
  ): Transaction => ({
    id: uid(),
    kind,
    amount,
    date: addDays(todayISO(), -daysAgo),
    category,
    note,
    counts: true,
    createdAt: now - daysAgo * 86_400_000,
  })

  return [
    mk('income', 55_000, 12, 'salary', 'Зарплата'),
    mk('income', 3_200, 10, 'tips', 'Чаевые за смену'),
    mk('income', 2_800, 8, 'tips', 'Чаевые за смену'),
    mk('income', 45_000, 4, 'advance', 'Аванс'),
    mk('expense', 6_000, 3, 'spending', 'Незапланированные траты'),
    mk('income', 4_100, 1, 'tips', 'Чаевые за смену'),
  ]
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      // Первый запуск — заполняем демо-данными.
      return { ...DEFAULT_STATE, transactions: makeMockTransactions() }
    }
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      ...DEFAULT_STATE,
      ...parsed,
      goal: { ...DEFAULT_STATE.goal, ...parsed.goal },
      settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
      transactions: parsed.transactions ?? [],
    }
  } catch {
    return { ...DEFAULT_STATE, transactions: makeMockTransactions() }
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Хранилище недоступно — тихо игнорируем (приложение остаётся рабочим в памяти).
  }
}

export function newId(): string {
  return uid()
}
