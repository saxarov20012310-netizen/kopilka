import { useMemo } from 'react'
import { useStore } from '../store/store'
import { calcProgress, calcStrategy, calcUpcoming } from '../utils/calc'
import { ProgressRing } from '../components/ProgressRing'
import { StatTile } from '../components/StatTile'
import { Motivation } from '../components/Motivation'
import { Card } from '../components/Card'
import { formatRub, formatCompact, daysWord } from '../utils/format'
import { formatDay } from '../utils/date'
import { haptic } from '../hooks/useTelegram'
import { CategoryIcon } from '../components/icons'
import type { TxKind } from '../types/models'

export function Home({ onAdd }: { onAdd: (kind: TxKind) => void }) {
  const { state } = useStore()
  const progress = useMemo(() => calcProgress(state), [state])
  const strategy = useMemo(() => calcStrategy(state), [state])
  const upcoming = useMemo(() => calcUpcoming(state), [state])

  const deadlineTxt = formatDay(state.goal.deadline)

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
      {/* Заголовок */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[12.5px] text-ink-muted">Цель накопления</div>
          <div className="text-[19px] font-bold leading-tight">{state.goal.title}</div>
        </div>
        <div className="rounded-pill bg-accent-soft px-3 py-1.5 text-[12.5px] font-semibold text-accent">
          до {deadlineTxt}
        </div>
      </div>

      {/* Кольцо прогресса */}
      <Card className="p-4">
        <div className="flex flex-col items-center">
          <ProgressRing percent={progress.percent} size={164} stroke={12}>
            <div className="text-[12px] text-muted">Накоплено</div>
            <div className="font-display text-[22px] font-semibold tabular leading-tight text-ink">
              {formatCompact(progress.saved)}
            </div>
            <div className="mt-0.5 rounded-pill bg-accent-soft px-2 py-0.5 text-[12.5px] font-bold text-accent tabular">
              {Math.round(progress.percent)}%
            </div>
          </ProgressRing>

          <div className="mt-3.5 grid w-full grid-cols-2 gap-2">
            <StatTile label="Цель" value={formatRub(state.goal.target)} />
            <StatTile
              label="Осталось"
              value={formatRub(progress.remaining)}
              accent
            />
          </div>
          <div className="mt-2 flex w-full items-center justify-center gap-1.5 text-[12.5px] text-muted">
            <span>
              {progress.overdue
                ? 'Дедлайн прошёл'
                : `Осталось ${progress.daysLeft} ${daysWord(progress.daysLeft)}`}
            </span>
            <span>·</span>
            <span>{deadlineTxt}</span>
          </div>
        </div>
      </Card>

      {/* Стратегия: сколько отложить с каждого типа поступления */}
      <div className="rise mt-3.5" style={{ animationDelay: '60ms' }}>
        <SectionTitle>Стратегия до дедлайна</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="С зарплаты" value={formatCompact(strategy.perSalary)} hint="₽" />
          <StatTile label="С аванса" value={formatCompact(strategy.perAdvance)} hint="₽" />
          <StatTile label="За смену" value={formatCompact(strategy.perShift)} hint="₽" accent />
        </div>
      </div>

      {/* Совет: статус + заработано/отложено/нужно */}
      <div className="rise mt-3" style={{ animationDelay: '120ms' }}>
        <Motivation />
      </div>

      {/* Ближайшие поступления */}
      <div className="rise mt-4" style={{ animationDelay: '180ms' }}>
        <SectionTitle>Ближайшие поступления</SectionTitle>
        <Card className="divide-y divide-line px-4">
          {upcoming.map((e) => (
            <div key={e.source} className="flex items-center gap-3 py-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
                <CategoryIcon name={e.source} size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-ink">{e.title}</div>
                <div className="text-[13px] text-muted">
                  {e.source === 'tips'
                    ? `≈ ${formatRub(e.expected)} · после каждой смены`
                    : `≈ ${formatRub(e.expected)} · ${formatDay(e.date)}`}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted">отложить</div>
                <div className="text-[15px] font-bold text-accent tabular">
                  {formatRub(e.suggested)}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Быстрые действия */}
      <div className="rise mt-4 grid grid-cols-2 gap-3" style={{ animationDelay: '240ms' }}>
        <button
          onClick={() => {
            haptic.impact('light')
            onAdd('income')
          }}
          className="press rounded-card bg-accent py-3 text-[15px] font-semibold text-onaccent shadow-float"
        >
          + Поступление
        </button>
        <button
          onClick={() => {
            haptic.impact('light')
            onAdd('expense')
          }}
          className="press rounded-card border border-line bg-surface py-3 text-[15px] font-semibold text-ink shadow-card"
        >
          − Расход
        </button>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 px-1 text-[15px] font-bold">{children}</h2>
}
