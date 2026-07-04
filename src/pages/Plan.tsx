import { useMemo } from 'react'
import { useStore } from '../store/store'
import { calcPlan, calcProgress, calcBalanceSeries } from '../utils/calc'
import { Card } from '../components/Card'
import { Sparkline } from '../components/Sparkline'
import { StatTile } from '../components/StatTile'
import { formatRub, formatCompact, daysWord } from '../utils/format'
import { formatDay } from '../utils/date'

export function Plan() {
  const { state } = useStore()
  const progress = useMemo(() => calcProgress(state), [state])
  const plan = useMemo(() => calcPlan(state), [state])
  const series = useMemo(() => calcBalanceSeries(state.transactions), [state.transactions])

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-32" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
      <h1 className="mb-4 text-2xl font-bold">План накопления</h1>

      {/* Динамика баланса */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] text-ink-muted">Баланс копилки</div>
            <div className="text-2xl font-extrabold tabular">{formatRub(progress.saved)}</div>
          </div>
          <div className="rounded-full bg-brand-50 px-3 py-1 text-[13px] font-bold text-brand-700 tabular">
            {Math.round(progress.percent)}%
          </div>
        </div>
        <div className="mt-4">
          <Sparkline points={series.map((s) => s.value)} height={72} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <StatTile label="Осталось" value={formatRub(progress.remaining)} />
          <StatTile
            label="До дедлайна"
            value={`${Math.max(0, progress.daysLeft)} ${daysWord(progress.daysLeft)}`}
            accent
          />
        </div>
      </Card>

      {/* Контрольные точки */}
      <h2 className="mb-2 mt-5 px-1 text-[15px] font-bold">Контрольные точки</h2>
      {plan.length === 0 ? (
        <Card className="p-6 text-center text-[15px] text-ink-muted">
          {progress.reached
            ? '🎉 Цель уже достигнута — план выполнен!'
            : 'Установите дедлайн в будущем, чтобы построить план.'}
        </Card>
      ) : (
        <Card className="p-4">
          <ol className="relative ml-1">
            {plan.map((p, i) => {
              const done = progress.saved >= p.amount
              return (
                <li key={p.date} className="relative flex gap-3 pb-5 last:pb-0">
                  {/* линия */}
                  {i < plan.length - 1 && (
                    <span className="absolute left-[9px] top-5 h-full w-px bg-hairline" />
                  )}
                  <span
                    className={`z-10 mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                      done ? 'bg-brand-500 text-white' : 'bg-surface-2 text-ink-muted'
                    }`}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <div className="flex flex-1 items-center justify-between">
                    <div>
                      <div className="text-[15px] font-semibold">Накопить к цели</div>
                      <div className="text-[13px] text-ink-muted">{formatDay(p.date)}</div>
                    </div>
                    <div className="text-[15px] font-bold tabular">{formatCompact(p.amount)} ₽</div>
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      <p className="mt-4 px-2 text-center text-xs text-ink-muted">
        План рассчитан равномерно от сегодняшнего баланса до цели {formatRub(state.goal.target)} к{' '}
        {formatDay(state.goal.deadline)}.
      </p>
    </div>
  )
}
