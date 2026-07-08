import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { TransactionRow } from '../components/TransactionRow'
import { Card } from '../components/Card'
import { Segmented } from '../components/Segmented'
import { confirmNative, haptic } from '../hooks/useTelegram'
import { formatRub } from '../utils/format'
import { formatDay, todayISO, monthNamePrep } from '../utils/date'
import { affectsSavings, calcMonthEarnings } from '../utils/calc'
import { CategoryIcon } from '../components/icons'
import type { Transaction, TxKind } from '../types/models'

type Filter = 'all' | TxKind
type Mode = 'savings' | 'earnings'

export function Transactions({ onAdd }: { onAdd: (kind: TxKind) => void }) {
  const { state, dispatch } = useStore()
  const [mode, setMode] = useState<Mode>('savings')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const list = [...state.transactions].sort((a, b) =>
      a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt
    )
    return filter === 'all' ? list : list.filter((t) => t.kind === filter)
  }, [state.transactions, filter])

  const groups = useMemo(() => groupByDate(filtered), [filtered])
  const earnings = useMemo(() => calcMonthEarnings(state), [state])

  const handleDelete = async (tx: Transaction) => {
    const ok = await confirmNative(
      `Удалить операцию на ${formatRub(tx.amount)}? Это действие нельзя отменить.`
    )
    if (ok) {
      dispatch({ type: 'DELETE_TX', id: tx.id })
      haptic.success()
    }
  }

  if (mode === 'earnings') {
    const mon = monthNamePrep(todayISO())
    const savedPct = Math.round(earnings.savedShare * 100)
    return (
      <div className="page-enter mx-auto max-w-md px-4 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
        <h1 className="mb-3 text-[19px] font-bold">История</h1>
        <Segmented
          options={[
            { value: 'savings', label: 'Копилка' },
            { value: 'earnings', label: 'Заработок' },
          ]}
          value={mode}
          onChange={setMode}
        />

        {/* Итог месяца: получено / отложено / ожидается */}
        <section className="rise mt-3.5 rounded-lg2 bg-inverse p-5" style={{ animationDelay: '40ms' }}>
          <div className="text-[12.5px] text-[#83869E]">Получено в {mon}</div>
          <div className="mt-1 font-display text-[26px] font-semibold tabular text-[#EFF0FA]">
            {formatRub(earnings.received)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-3 text-[12.5px]">
            <div>
              <div className="text-[#83869E]">Отложено</div>
              <div className="mt-0.5 font-bold tabular text-lime">
                {formatRub(Math.max(0, earnings.savedThisMonth))} · {savedPct}%
              </div>
            </div>
            <div>
              <div className="text-[#83869E]">Ещё придёт</div>
              <div className="mt-0.5 font-bold tabular text-[#EFF0FA]">
                {formatRub(earnings.expected)}
              </div>
            </div>
          </div>
        </section>

        {/* Выплаты и смены месяца */}
        <div className="rise mt-3.5" style={{ animationDelay: '100ms' }}>
          <Card className="divide-y divide-line px-4">
            {earnings.items.map((it, i) => (
              <div key={i} className={`flex items-center gap-3 py-3 ${it.received ? '' : 'opacity-60'}`}>
                <div
                  className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full ${
                    it.received ? 'bg-income/[0.12] text-income' : 'bg-surface2 text-muted'
                  }`}
                >
                  <CategoryIcon name={it.kind === 'shift' ? 'tips' : it.kind} size={19} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-ink">{it.title}</div>
                  <div className="truncate text-[13px] text-muted">
                    {it.sub} · {formatDay(it.date)}
                    {!it.received && ' · ожидается'}
                  </div>
                </div>
                <div
                  className={`shrink-0 text-[14.5px] font-bold tabular ${
                    it.received ? 'text-income' : 'text-muted'
                  }`}
                >
                  +{formatRub(it.amount)}
                </div>
              </div>
            ))}
          </Card>
          <p className="mt-2 px-2 text-center text-xs text-muted">
            {earnings.shiftsCount > 0
              ? `Смены и чай — из skazka (${earnings.shiftsCount} за месяц). Зарплата 5-го — за прошлый месяц.`
              : 'Смены подтянутся из skazka автоматически. Зарплата 5-го — за прошлый месяц.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-[19px] font-bold">История</h1>
        <button
          onClick={() => {
            haptic.impact('light')
            onAdd('income')
          }}
          className="press rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-onaccent shadow-float"
        >
          + Добавить
        </button>
      </div>

      <Segmented
        options={[
          { value: 'savings', label: 'Копилка' },
          { value: 'earnings', label: 'Заработок' },
        ]}
        value={mode}
        onChange={setMode}
      />

      <div className="mt-2.5">
        <Segmented
          options={[
            { value: 'all', label: 'Все' },
            { value: 'income', label: 'Поступления' },
            { value: 'expense', label: 'Расходы' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState onAdd={() => onAdd('income')} />
      ) : (
        <div className="mt-3.5 space-y-3.5">
          {groups.map((g) => (
            <div key={g.date}>
              <div className="mb-1 flex items-center justify-between px-1">
                <span className="text-[13px] font-medium text-muted">{formatDay(g.date)}</span>
                {/* Итог дня — дельта копилки; если день только из трат мимо копилки, итога нет */}
                {g.hasPiggy && (
                  <span
                    className={`text-[13px] font-semibold tabular ${
                      g.net >= 0 ? 'text-income' : 'text-expense'
                    }`}
                  >
                    {g.net >= 0 ? '+' : '−'}
                    {formatRub(Math.abs(g.net))}
                  </span>
                )}
              </div>
              <Card className="divide-y divide-line px-4">
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
      <div className="grid h-20 w-20 place-items-center rounded-full bg-accent-soft text-accent">
        <CategoryIcon name="wallet" size={34} strokeWidth={1.6} />
      </div>
      <div className="mt-4 text-lg font-bold text-ink">Пока нет операций</div>
      <p className="mt-1 max-w-[260px] text-[15px] text-muted">
        Добавьте первое поступление — зарплату, аванс или чаевые, и копилка начнёт расти.
      </p>
      <button
        onClick={onAdd}
        className="press mt-5 rounded-card bg-accent px-6 py-3 text-[15px] font-semibold text-onaccent shadow-float"
      >
        Добавить поступление
      </button>
    </div>
  )
}

interface Group {
  date: string
  items: Transaction[]
  /** Дельта копилки за день (траты «мимо копилки» не входят). */
  net: number
  /** Есть ли в дне операции, влияющие на копилку. */
  hasPiggy: boolean
}

function groupByDate(list: Transaction[]): Group[] {
  const map = new Map<string, Group>()
  for (const tx of list) {
    let g = map.get(tx.date)
    if (!g) {
      g = { date: tx.date, items: [], net: 0, hasPiggy: false }
      map.set(tx.date, g)
    }
    g.items.push(tx)
    if (affectsSavings(tx)) {
      g.hasPiggy = true
      g.net += tx.kind === 'income' ? tx.amount : -tx.amount
    }
  }
  return [...map.values()]
}
