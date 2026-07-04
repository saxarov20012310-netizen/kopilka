import type { Transaction, IncomeSource, ExpenseCategory } from '../types/models'
import { formatRub } from '../utils/format'
import { formatDay } from '../utils/date'

const SOURCE_META: Record<IncomeSource | ExpenseCategory, { label: string; emoji: string }> = {
  salary: { label: 'Зарплата', emoji: '💼' },
  advance: { label: 'Аванс', emoji: '📅' },
  tips: { label: 'Чаевые', emoji: '🪙' },
  goal: { label: 'В копилку', emoji: '🎯' },
  spending: { label: 'Трата', emoji: '🛍️' },
  other: { label: 'Другое', emoji: '✳️' },
}

export function TransactionRow({
  tx,
  onClick,
}: {
  tx: Transaction
  onClick?: () => void
}) {
  const meta = SOURCE_META[tx.category] ?? SOURCE_META.other
  const isIncome = tx.kind === 'income'
  return (
    <button
      onClick={onClick}
      className="press flex w-full items-center gap-3 py-3 text-left"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2 text-xl">
        {meta.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{tx.note || meta.label}</div>
        <div className="text-[13px] text-ink-muted">
          {meta.label} · {formatDay(tx.date)}
        </div>
      </div>
      <div
        className={`shrink-0 text-[15px] font-bold tabular ${
          isIncome ? 'text-emerald-600' : 'text-ink'
        }`}
      >
        {isIncome ? '+' : '−'}
        {formatRub(tx.amount)}
      </div>
    </button>
  )
}
