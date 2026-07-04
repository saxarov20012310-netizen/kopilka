// localStorage persistence. Приложение стартует с чистого листа (без операций).
import type { AppState } from '../types/models'
import { todayISO } from './date'

// v2 — сброс старых демо-данных: у существующих пользователей копилка обнулится.
const KEY = 'kopilka:v2'

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

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      // Первый запуск — чистая копилка, без операций.
      return { ...DEFAULT_STATE }
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
    return { ...DEFAULT_STATE }
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
