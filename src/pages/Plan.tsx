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
            <div className="text-[13px] text-muted">Баланс копилки</div>
            <div className="font-display text-[26px] font-semibold tabular text-ink">{formatRub(progress.saved)}</div>
          </div>
          <div className="rounded-pill bg-accent-soft px-3 py-1 text-[13px] font-bold text-accent tabular">
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

      {/* Контрольные точки — вертикальный таймлайн (пройдена / следующая / будущая) */}
      <h2 className="mb-3 mt-5 px-1 text-[15px] font-bold">Контрольные точки</h2>
      {plan.length === 0 ? (
        <Card className="p-6 text-center text-[15px] text-ink-muted">
          {progress.reached
            ? '🎉 Цель уже достигнута — план выполнен!'
            : 'Установите дедлайн в будущем, чтобы построить план.'}
        </Card>
      ) : (
        <ol className="relative ml-1 px-1">
          {plan.map((p, i) => {
            const done = progress.saved >= p.amount
            // Первая непройденная точка — «следующая», подсвечена карточкой.
            const isNext = !done && plan.slice(0, i).every((q) => progress.saved >= q.amount)
            const isLast = i === plan.length - 1
            return (
              <li key={p.date} className="relative flex gap-3.5 pb-4 last:pb-0">
                {/* линия к следующей точке */}
                {!isLast && (
                  <span
                    className="absolute left-[10px] top-[26px] bottom-0 w-[2px]"
                    style={{ background: 'var(--ring-track)' }}
                  />
                )}
                {/* точка 22px: залитая / контур-акцент / контур-трек */}
                <span
                  className={`z-10 mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${
                    done
                      ? 'bg-accent text-onaccent'
                      : isNext
                        ? 'border-2 border-accent bg-surface text-accent'
                        : 'border-2 border-[color:var(--ring-track)] bg-surface text-muted'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </span>

                {isNext ? (
                  <div className="-mt-1 flex flex-1 items-center justify-between gap-3 rounded-card border border-line bg-surface p-3.5 shadow-card">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-ink">
                        {isLast ? 'Финиш — вся цель' : 'Следующая точка'}
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-muted">
                        {formatDay(p.date)} · внести ещё {formatCompact(p.amount - progress.saved)} ₽
                      </div>
                    </div>
                    <div className="shrink-0 text-[15px] font-bold tabular text-accent">
                      {formatCompact(p.amount)} ₽
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 items-center justify-between py-0.5">
                    <div>
                      <div className={`text-[14px] font-semibold ${done ? 'text-ink' : 'text-muted'}`}>
                        {isLast ? 'Финиш — вся цель' : formatDay(p.date)}
                      </div>
                      <div className="text-[12.5px] text-muted">
                        {done ? 'пройдена' : isLast ? formatDay(p.date) : `точка ${i + 1} из ${plan.length}`}
                      </div>
                    </div>
                    <div
                      className={`text-[14.5px] font-bold tabular ${done ? 'text-income' : 'text-muted'}`}
                    >
                      {formatCompact(p.amount)} ₽
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <p className="mt-4 px-2 text-center text-xs text-ink-muted">
        План рассчитан равномерно от сегодняшнего баланса до цели {formatRub(state.goal.target)} к{' '}
        {formatDay(state.goal.deadline)}.
      </p>
    </div>
  )
}
