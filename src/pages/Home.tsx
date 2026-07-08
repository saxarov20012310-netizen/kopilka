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
import type { OpenAdd } from '../App'

export function Home({ onAdd }: { onAdd: OpenAdd }) {
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

      {/* Накопления — фирменная тёмная карта: кольцо слева, цифры справа */}
      <section className="rise rounded-lg2 bg-inverse p-5">
        <div className="flex items-center gap-5">
          <ProgressRing
            percent={progress.percent}
            size={112}
            stroke={10}
            color="#C6F245"
            track="#23264A"
          >
            <div className="font-display text-[19px] font-semibold tabular text-lime">
              {Math.round(progress.percent)}
              <span className="text-[12px]">%</span>
            </div>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-[#83869E]">Накоплено</div>
            <div className="mt-0.5 font-display text-[26px] font-semibold tabular leading-tight text-[#EFF0FA]">
              {formatRub(progress.saved)}
            </div>
            <div className="mt-1.5 text-[12.5px] leading-snug text-[#83869E]">
              из {formatRub(state.goal.target)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[12.5px]">
          <span className="text-[#83869E]">Осталось накопить</span>
          <span className="font-bold tabular text-lime">{formatRub(progress.remaining)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[12.5px]">
          <span className="text-[#83869E]">До дедлайна</span>
          <span className="font-semibold tabular text-[#EFF0FA]">
            {progress.overdue
              ? 'дедлайн прошёл'
              : `${progress.daysLeft} ${daysWord(progress.daysLeft)} · ${deadlineTxt}`}
          </span>
        </div>
      </section>

      {/* Стратегия: сколько отложить с каждого типа поступления */}
      <div className="rise mt-3.5" style={{ animationDelay: '60ms' }}>
        <SectionTitle>Стратегия до дедлайна</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <StatTile label="С зарплаты" value={formatCompact(strategy.perSalary)} hint="₽" />
          <StatTile label="С аванса" value={formatCompact(strategy.perAdvance)} hint="₽" />
          <StatTile label="За смену" value={formatCompact(strategy.perShift)} hint="₽" accent />
        </div>
      </div>

      {/* Совет: статус + заработано/отложено/нужно (тап по «доложите» — отложить) */}
      <div className="rise mt-3" style={{ animationDelay: '120ms' }}>
        <Motivation onAdd={onAdd} />
      </div>

      {/* Ближайшие поступления — тап по строке откладывает рекомендованную сумму */}
      <div className="rise mt-4" style={{ animationDelay: '180ms' }}>
        <SectionTitle>Ближайшие поступления</SectionTitle>
        <Card className="divide-y divide-line px-2">
          {upcoming.map((e) => (
            <button
              key={e.source}
              onClick={() => {
                haptic.impact('light')
                onAdd('income', {
                  amount: e.suggested,
                  category: e.source,
                  note: `Отложил с «${e.title.toLowerCase()}»`,
                })
              }}
              className="press flex w-full items-center gap-3 px-2 py-3 text-left"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <CategoryIcon name={e.source} size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold text-ink">{e.title}</div>
                <div className="truncate text-[13px] text-muted">
                  {e.source === 'tips'
                    ? `≈ ${formatRub(e.expected)} · после каждой смены`
                    : `≈ ${formatRub(e.expected)} · ${formatDay(e.date)}`}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1.5">
                <span className="text-[14px] font-bold text-accent tabular">
                  {formatRub(e.suggested)}
                </span>
                <span className="text-[15px] leading-none text-accent">+</span>
              </div>
            </button>
          ))}
        </Card>
        <p className="mt-1.5 px-1 text-[11.5px] text-muted">Коснись строки, чтобы отложить эту сумму</p>
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
