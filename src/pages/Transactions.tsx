import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { TransactionRow } from '../components/TransactionRow'
import { Card } from '../components/Card'
import { Segmented } from '../components/Segmented'
import { confirmNative, haptic } from '../hooks/useTelegram'
import { formatRub } from '../utils/format'
import { formatDay } from '../utils/date'
import type { Transaction, TxKind } from '../types/models'

type Filter = 'all' | TxKind

export function Transactions({ onAdd }: { onAdd: (kind: TxKind) => void }) {
  const { state, dispatch } = useStore()
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const list = [...state.transactions].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt
    )
    return filter === 'all' ? list : list.filter((t) => t.kind === filter)
  }, [state.transactions, filter])

  const groups = useMemo(() => groupByDate(filtered), [filtered])

  const handleDelete = async (tx: Transaction) => {
    const ok = await confirmNative(
      `Удалить операцию на ${formatRub(tx.amount)}? Это действие нельзя отменить.`
    )
    if (ok) {
      dispatch({ type: 'DELETE_TX', id: tx.id })
      haptic.success()
    }
  }

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">История</h1>
        <button
          onClick={() => {
            haptic.impact('light')
            onAdd('income')
          }}
          className="press rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-float"
        >
          + Добавить
        </button>
      </div>

      <Segmented
        options={[
          { value: 'all', label: 'Все' },
          { value: 'income', label: 'Поступления' },
          { value: 'expense', label: 'Расходы' },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {filtered.length === 0 ? (
        <EmptyState onAdd={() => onAdd('income')} />
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((g) => (
            <div key={g.date}>
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="text-[13px] font-medium text-ink-muted">{formatDay(g.date)}</span>
                <span className="text-[13px] font-semibold tabular text-ink-muted">
                  {g.net >= 0 ? '+' : '−'}
                  {formatRub(Math.abs(g.net))}
                </span>
              </div>
              <Card className="divide-y divide-hairline px-4">
                {g.items.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} onClick={() => handleDelete(tx)} />
                ))}
              </Card>
            </div>
          ))}
          <p className="px-2 text-center text-xs text-ink-muted">
            Нажмите на операцию, чтобы удалить её
          </p>
        </div>
      )}
    </div>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-16 flex flex-col items-center text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-50 text-4xl">🪙</div>
      <div className="mt-4 text-lg font-bold">Пока нет операций</div>
      <p className="mt-1 max-w-[260px] text-[15px] text-ink-muted">
        Добавьте первое поступление — зарплату, аванс или чаевые, и копилка начнёт расти.
      </p>
      <button
        onClick={onAdd}
        className="press mt-5 rounded-2xl bg-brand-500 px-6 py-3 text-[15px] font-semibold text-white shadow-float"
      >
        Добавить поступление
      </button>
    </div>
  )
}

interface Group {
  date: string
  items: Transaction[]
  net: number
}

function groupByDate(list: Transaction[]): Group[] {
  const map = new Map<string, Group>()
  for (const tx of list) {
    let g = map.get(tx.date)
    if (!g) {
      g = { date: tx.date, items: [], net: 0 }
      map.set(tx.date, g)
    }
    g.items.push(tx)
    g.net += tx.kind === 'income' ? tx.amount : -tx.amount
  }
  return [...map.values()]
}
