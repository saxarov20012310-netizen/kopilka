// Типизированные модели данных приложения.

export type TxKind = 'income' | 'expense'

// Категория поступления помогает давать умные подсказки по накоплению.
export type IncomeSource = 'salary' | 'advance' | 'tips' | 'other'
export type ExpenseCategory = 'goal' | 'spending' | 'other'

export interface Transaction {
  id: string
  kind: TxKind
  /** Сумма в рублях, всегда положительная. */
  amount: number
  /** ISO-дата (YYYY-MM-DD). */
  date: string
  /** Источник для income / категория для expense. */
  category: IncomeSource | ExpenseCategory
  note?: string
  /** Учитывается ли в накоплениях (для income по умолчанию true). */
  counts: boolean
  createdAt: number
  /** id смены из skazka, если операция создана автосинхронизацией (для идемпотентности). */
  skazkaId?: number
}

export interface Goal {
  /** Целевая сумма, ₽. */
  target: number
  /** Дедлайн, ISO-дата. */
  deadline: string
  /** Название цели. */
  title: string
  /** Дата старта накопления, ISO-дата. */
  startDate: string
}

export interface Settings {
  /** Примерная зарплата (выплата в день зарплаты), ₽. */
  salaryAmount: number
  /** Примерный аванс, ₽. */
  advanceAmount: number
  /** День зарплаты. */
  salaryDay: number
  /** День аванса. */
  advanceDay: number
  /** Доля дохода, которую пользователь готов откладывать (0..1). */
  savingRate: number
  /** Сколько смен в месяц (для оценки потока чаевых). */
  shiftsPerMonth: number
  /** Средние чаевые за смену, ₽. */
  tipsPerShift: number
}

export interface AppState {
  goal: Goal
  settings: Settings
  transactions: Transaction[]
  onboarded: boolean
}
