import { useMemo } from 'react'
import { useStore } from '../store/store'
import { calcPlan, calcProgress, calcStrategy } from '../utils/calc'
import { activeGoal } from '../utils/storage'
import { Card } from '../components/Card'
import { StatTile } from '../components/StatTile'
import { formatCompact } from '../utils/format'
import { formatDay, formatMonthYear } from '../utils/date'
import { haptic, alertNative } from '../hooks/useTelegram'

export function Plan() {
  const { state, dispatch } = useStore()
  const goal = activeGoal(state)
  const progress = useMemo(() => calcProgress(state), [state])
  const plan = useMemo(() => calcPlan(state), [state])
  const strategy = useMemo(() => calcStrategy(state), [state])

  const deadlineTxt = formatDay(goal.deadline)
  const ratePct = Math.round(state.settings.savingRate * 100)
  const tight = strategy.verdict === 'tight' || strategy.verdict === 'unreal'

  // Одним тапом сдвинуть дедлайн активной цели до реально достижимого срока.
  const moveDeadline = async () => {
    if (!strategy.realisticDate) return
    haptic.impact('light')
    dispatch({ type: 'SET_GOAL', goal: { deadline: strategy.realisticDate } })
    haptic.success()
    await alertNative(`Срок цели «${goal.title}» сдвинут на ${formatMonthYear(strategy.realisticDate)}.`)
  }

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-[calc(var(--safe-bottom)+104px)]" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
      <h1 className="mb-3 text-[19px] font-bold">План</h1>

      {/* Вердикт достижимости — главная мысль экрана */}
      <section
        className={`rise rounded-lg2 border p-4 ${
          tight ? 'border-expense/25 bg-expense/[0.08]' : 'border-line bg-surface'
        }`}
      >
        <div className="text-[12px] font-semibold uppercase tracking-wide text-muted">
          {progress.reached ? 'Готово' : tight ? 'Цель под угрозой' : 'Успеваешь'}
        </div>
        <p className="mt-1.5 text-[15px] font-medium leading-snug text-ink">
          {progress.reached ? (
            '🎉 Цель достигнута — план выполнен.'
          ) : strategy.verdict === 'unreal' ? (
            <>
              К {deadlineTxt} не успеть даже откладывая всё. Реальный срок —{' '}
              <b className="text-expense">{formatMonthYear(strategy.realisticDate ?? goal.deadline)}</b>. Подвинь дедлайн или уменьши сумму во вкладке «Цель».
            </>
          ) : strategy.verdict === 'tight' ? (
            <>
              При норме {ratePct}% реальный срок —{' '}
              <b className="text-expense">{formatMonthYear(strategy.realisticDate ?? goal.deadline)}</b>, а не {deadlineTxt}. Подними норму или сдвинь срок.
            </>
          ) : (
            <>
              Успеешь к <b className="text-accent">{deadlineTxt}</b>, если откладывать столько с каждого поступления:
            </>
          )}
        </p>
        {tight && strategy.realisticDate && (
          <button
            onClick={moveDeadline}
            className="btn-grad press mt-3 w-full rounded-pill py-2.5 text-[13.5px] font-semibold"
          >
            Сдвинуть срок на {formatMonthYear(strategy.realisticDate)}
          </button>
        )}
      </section>

      {/* Сколько откладывать с каждого типа поступления */}
      {!progress.reached && (
        <div className="rise mt-4" style={{ animationDelay: '60ms' }}>
          <h2 className="mb-2 px-1 text-[15px] font-bold">Сколько откладывать</h2>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="С зарплаты" value={formatCompact(strategy.perSalary)} hint="₽" />
            <StatTile label="С аванса" value={formatCompact(strategy.perAdvance)} hint="₽" />
            <StatTile label="За смену" value={formatCompact(strategy.perShift)} hint="₽" accent />
          </div>
          <p className="mt-2 px-1 text-[11.5px] text-muted">
            Впереди до дедлайна: {strategy.salaries + strategy.advances} выплат и ≈{strategy.shifts} смен.
          </p>
        </div>
      )}

      {/* Контрольные точки — путь к цели по датам */}
      <h2 className="mb-2.5 mt-5 px-1 text-[15px] font-bold">Контрольные точки</h2>
      {plan.length === 0 ? (
        <Card className="p-6 text-center text-[15px] text-ink-muted">
          {progress.reached
            ? 'Все точки пройдены — цель закрыта.'
            : 'Установи дедлайн в будущем, чтобы построить план.'}
        </Card>
      ) : (
        <ol className="rise relative ml-1 px-1" style={{ animationDelay: '120ms' }}>
          {plan.map((p, i) => {
            const done = progress.saved >= p.amount
            const isNext = !done && plan.slice(0, i).every((q) => progress.saved >= q.amount)
            const isLast = i === plan.length - 1
            return (
              <li key={p.date} className="relative flex gap-3.5 pb-4 last:pb-0">
                {!isLast && (
                  <span
                    className="absolute left-[10px] top-[26px] bottom-0 w-[2px]"
                    style={{ background: 'var(--ring-track)' }}
                  />
                )}
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
                  <div className="glass -mt-1 flex flex-1 items-center justify-between gap-3 rounded-card p-3.5 shadow-card">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-ink">
                        {isLast ? 'Финиш — вся цель' : 'Следующая точка'}
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-muted">
                        к {formatDay(p.date)} · внести ещё {formatCompact(p.amount - progress.saved)} ₽
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
    </div>
  )
}
