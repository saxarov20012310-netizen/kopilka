import type { Transaction, IncomeSource, ExpenseCategory } from '../types/models'
import { formatRub } from '../utils/format'
import { formatDay } from '../utils/date'
import { affectsSavings } from '../utils/calc'
import { CategoryIcon, type IconName } from './icons'

const SOURCE_META: Record<IncomeSource | ExpenseCategory, { label: string; icon: IconName }> = {
  salary: { label: 'Зарплата', icon: 'salary' },
  advance: { label: 'Аванс', icon: 'advance' },
  tips: { label: 'Чаевые', icon: 'tips' },
  goal: { label: 'В копилку', icon: 'goal' },
  spending: { label: 'Трата', icon: 'spending' },
  other: { label: 'Другое', icon: 'other' },
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
  // Трата «мимо копилки» — журнальная запись, баланс не трогает: приглушаем.
  const inPiggy = affectsSavings(tx)
  return (
    <button
      onClick={onClick}
      className="press flex w-full items-center gap-3 py-3 text-left"
    >
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          isIncome
            ? 'bg-income/[0.12] text-income'
            : inPiggy
              ? 'bg-expense/[0.12] text-expense'
              : 'bg-surface2 text-muted'
        }`}
      >
        <CategoryIcon name={meta.icon} size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold text-ink">{tx.note || meta.label}</div>
        <div className="truncate text-[13px] text-muted">
          {meta.label} · {formatDay(tx.date)}
          {!isIncome && !inPiggy && ' · не из копилки'}
        </div>
      </div>
      <div
        className={`shrink-0 text-[14.5px] font-bold tabular ${
          isIncome ? 'text-income' : inPiggy ? 'text-expense' : 'text-muted'
        }`}
      >
        {isIncome ? '+' : '−'}
        {formatRub(tx.amount)}
      </div>
    </button>
  )
}
