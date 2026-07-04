import { useMemo } from 'react'
import { useStore } from '../store/store'
import { calcProgress, calcPace, calcUpcoming } from '../utils/calc'
import { ProgressRing } from '../components/ProgressRing'
import { StatTile } from '../components/StatTile'
import { Motivation } from '../components/Motivation'
import { Card } from '../components/Card'
import { formatRub, formatCompact, daysWord } from '../utils/format'
import { formatDay } from '../utils/date'
import { haptic } from '../hooks/useTelegram'
import type { TxKind } from '../types/models'

export function Home({ onAdd }: { onAdd: (kind: TxKind) => void }) {
  const { state } = useStore()
  const progress = useMemo(() => calcProgress(state), [state])
  const pace = useMemo(() => calcPace(state), [state])
  const upcoming = useMemo(() => calcUpcoming(state), [state])

  const deadlineTxt = formatDay(state.goal.deadline)

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-32" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
      {/* Заголовок */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[13px] text-ink-muted">Цель накопления</div>
          <div className="text-xl font-bold">{state.goal.title}</div>
        </div>
        <div className="rounded-full bg-brand-50 px-3 py-1.5 text-[13px] font-semibold text-brand-700">
          до {deadlineTxt}
        </div>
      </div>

      {/* Кольцо прогресса */}
      <Card className="p-6">
        <div className="flex flex-col items-center">
          <ProgressRing percent={progress.percent}>
            <div className="text-[13px] text-ink-muted">Накоплено</div>
            <div className="text-[26px] font-extrabold tabular leading-tight">
              {formatCompact(progress.saved)}
            </div>
            <div className="mt-0.5 rounded-full bg-brand-50 px-2 py-0.5 text-[13px] font-bold text-brand-700 tabular">
              {Math.round(progress.percent)}%
            </div>
          </ProgressRing>

          <div className="mt-4 grid w-full grid-cols-2 gap-2">
            <StatTile label="Цель" value={formatRub(state.goal.target)} />
            <StatTile
              label="Осталось"
              value={formatRub(progress.remaining)}
              accent
            />
          </div>
          <div className="mt-2 flex w-full items-center justify-center gap-1.5 text-[13px] text-ink-muted">
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

      {/* Сколько откладывать */}
      <div className="mt-4">
        <SectionTitle>Сколько откладывать</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="В месяц" value={formatCompact(pace.perMonth)} hint="₽" />
          <StatTile label="В неделю" value={formatCompact(pace.perWeek)} hint="₽" />
          <StatTile label="В день" value={formatCompact(pace.perDay)} hint="₽" accent />
        </div>
      </div>

      {/* Мотивация */}
      <div className="mt-4">
        <Motivation progress={progress} />
      </div>

      {/* Ближайшие поступления */}
      <div className="mt-5">
        <SectionTitle>Ближайшие поступления</SectionTitle>
        <Card className="divide-y divide-hairline px-4">
          {upcoming.map((e) => (
            <div key={e.source} className="flex items-center gap-3 py-3.5">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-50 text-lg">
                {e.source === 'salary' ? '💼' : e.source === 'advance' ? '📅' : '🪙'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">{e.title}</div>
                <div className="text-[13px] text-ink-muted">
                  {e.source === 'tips' ? 'после каждой смены' : formatDay(e.date)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-ink-muted">отложить</div>
                <div className="text-[15px] font-bold text-brand-600 tabular">
                  {formatRub(e.suggested)}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Быстрые действия */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => {
            haptic.impact('light')
            onAdd('income')
          }}
          className="press rounded-2xl bg-brand-500 py-3.5 text-[15px] font-semibold text-white shadow-float"
        >
          + Поступление
        </button>
        <button
          onClick={() => {
            haptic.impact('light')
            onAdd('expense')
          }}
          className="press rounded-2xl bg-surface py-3.5 text-[15px] font-semibold text-ink shadow-card"
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
