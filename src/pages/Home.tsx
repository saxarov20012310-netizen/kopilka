import { useMemo } from 'react'
import { useStore } from '../store/store'
import { calcProgress, calcUpcoming } from '../utils/calc'
import { activeGoal } from '../utils/storage'
import { ProgressRing } from '../components/ProgressRing'
import { Motivation } from '../components/Motivation'
import { Card } from '../components/Card'
import { formatRub, daysWord } from '../utils/format'
import { formatDay } from '../utils/date'
import { haptic } from '../hooks/useTelegram'
import { CategoryIcon } from '../components/icons'
import type { OpenAdd } from '../App'

export function Home({ onAdd }: { onAdd: OpenAdd }) {
  const { state, dispatch } = useStore()
  const goal = activeGoal(state)
  const progress = useMemo(() => calcProgress(state), [state])
  const upcoming = useMemo(() => calcUpcoming(state), [state])

  const deadlineTxt = formatDay(goal.deadline)

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
      {/* Свитчер целей — если целей несколько */}
      {state.goals.length > 1 && (
        <div className="no-scrollbar -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1">
          {state.goals.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                if (g.id !== state.activeGoalId) haptic.select()
                dispatch({ type: 'SET_ACTIVE_GOAL', id: g.id })
              }}
              className={`press shrink-0 rounded-pill px-3.5 py-1.5 text-[12.5px] font-semibold ${
                g.id === state.activeGoalId ? 'btn-grad' : 'glass text-muted'
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>
      )}

      {/* Заголовок */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[12.5px] text-ink-muted">Цель накопления</div>
          <div className="text-[19px] font-bold leading-tight">{goal.title}</div>
        </div>
        <div className="rounded-pill bg-accent-soft px-3 py-1.5 text-[12.5px] font-semibold text-accent">
          до {deadlineTxt}
        </div>
      </div>

      {/* Накопления — фирменная градиентная карта-герой */}
      <section className="card-hero rise rounded-lg2 p-5">
        <div className="relative z-10 flex items-center gap-5">
          <ProgressRing
            percent={progress.percent}
            size={112}
            stroke={10}
            color="#ffffff"
            track="rgba(255,255,255,0.24)"
          >
            <div className="font-display text-[19px] font-semibold tabular text-white">
              {Math.round(progress.percent)}
              <span className="text-[12px]">%</span>
            </div>
          </ProgressRing>

          <div className="min-w-0 flex-1">
            <div className="text-[12px] text-white/70">Накоплено</div>
            <div className="mt-0.5 font-display text-[27px] font-semibold tabular leading-tight text-white">
              {formatRub(progress.saved)}
            </div>
            <div className="mt-1.5 text-[12.5px] leading-snug text-white/70">
              из {formatRub(goal.target)}
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-4 flex items-center justify-between border-t border-white/20 pt-3 text-[12.5px]">
          <span className="text-white/70">Осталось накопить</span>
          <span className="font-bold tabular text-white">{formatRub(progress.remaining)}</span>
        </div>
        <div className="relative z-10 mt-2 flex items-center justify-between text-[12.5px]">
          <span className="text-white/70">До дедлайна</span>
          <span className="font-semibold tabular text-white">
            {progress.overdue
              ? 'дедлайн прошёл'
              : `${progress.daysLeft} ${daysWord(progress.daysLeft)} · ${deadlineTxt}`}
          </span>
        </div>
      </section>

      {/* Совет: статус + одно действие «Отложить N» */}
      <div className="rise mt-3.5" style={{ animationDelay: '80ms' }}>
        <Motivation onAdd={onAdd} />
      </div>

      {/* Ближайшие поступления — тап по строке откладывает рекомендованную сумму */}
      <div className="rise mt-4" style={{ animationDelay: '150ms' }}>
        <h2 className="mb-2 px-1 text-[15px] font-bold">Отложить с поступления</h2>
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
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <CategoryIcon name={e.source} size={17} />
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
        <p className="mt-1.5 px-1 text-[11.5px] text-muted">Коснись строки — сумма подставится сама</p>
      </div>

      {/* Быстрые действия */}
      <div className="rise mt-4 grid grid-cols-2 gap-3" style={{ animationDelay: '210ms' }}>
        <button
          onClick={() => {
            haptic.impact('light')
            onAdd('income')
          }}
          className="btn-grad press rounded-card py-3 text-[15px] font-semibold"
        >
          + Поступление
        </button>
        <button
          onClick={() => {
            haptic.impact('light')
            onAdd('expense')
          }}
          className="glass press rounded-card py-3 text-[15px] font-semibold text-ink"
        >
          − Расход
        </button>
      </div>
    </div>
  )
}
