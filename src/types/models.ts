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
  /** id смены из skazka (историческое поле старого автоимпорта — такие операции вычищаются миграцией). */
  skazkaId?: number
  /** К какой цели относится накопительная операция (income в копилку / «из копилки»).
   *  Расходы «мимо копилки» — глобальные, без goalId. Старые операции без goalId
   *  принадлежат первой цели (проставляется миграцией). */
  goalId?: string
}

/**
 * Снимок данных из skazka — это ЗАРАБОТОК (смены и чай), а не отложенное.
 * Обновляется автосинхронизацией при каждом открытии внутри Telegram.
 */
export interface SkazkaSnapshot {
  /** Когда обновлено (мс). */
  fetchedAt: number
  /** Фактических смен в месяц (норма за 30 дней). */
  shiftsPerMonth: number
  /** Средний чай за смену, ₽. */
  avgTips: number
  /** Смены текущего календарного месяца. */
  monthShifts: { id: number; date: string; tips: number }[]
  /** Чай за текущий месяц суммарно, ₽. */
  monthTips: number
}

export interface Goal {
  /** Уникальный id цели. */
  id: string
  /** Целевая сумма, ₽. */
  target: number
  /** Дедлайн, ISO-дата. */
  deadline: string
  /** Название цели. */
  title: string
  /** Дата старта накопления, ISO-дата. */
  startDate: string
  /** Наибольшая отпразднованная веха этой цели (25/50/75/100%). */
  celebratedPct: number
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
  /** Список целей (минимум одна). */
  goals: Goal[]
  /** id активной цели — её показывают Главная/План/Цель. */
  activeGoalId: string
  settings: Settings
  transactions: Transaction[]
  onboarded: boolean
  /** Последние данные заработка из skazka (null — ещё не синхронизировались). */
  skazka: SkazkaSnapshot | null
}
