import { useMemo } from 'react'
import { useStore } from '../store/store'
import {
  calcPlanDelta,
  calcProgress,
  calcStrategy,
  calcMonthEarnings,
  type PlanDelta,
  type Progress,
} from '../utils/calc'
import { formatRub } from '../utils/format'
import { monthNamePrep, todayISO } from '../utils/date'

/**
 * Карточка «Совет» — вместо лозунгов конкретика:
 * статус относительно плана + сравнение «заработано / отложено / нужно»
 * по текущему месяцу. Спокойная поверхность без цветной заливки —
 * тоном выделяются только цифры.
 */
export function Motivation() {
  const { state } = useStore()
  const progress = useMemo(() => calcProgress(state), [state])
  const pd = useMemo(() => calcPlanDelta(state), [state])
  const strategy = useMemo(() => calcStrategy(state), [state])
  const earnings = useMemo(() => calcMonthEarnings(state), [state])

  const seed = new Date().getDate() + state.transactions.length
  const headline = pickHeadline(pd, progress, seed)

  const sharePct = Number.isFinite(strategy.requiredShare)
    ? Math.round(Math.min(1, strategy.requiredShare) * 100)
    : 100
  const savedPct = Math.round(earnings.savedShare * 100)
  const mon = monthNamePrep(todayISO())

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] text-accent">
          ✦
        </span>
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Совет</span>
      </div>

      <p className={`mt-2.5 text-[14.5px] font-medium leading-snug ${headline.tone === 'expense' ? 'text-expense' : 'text-ink'}`}>
        {headline.text}
      </p>

      {/* Заработано / отложено / нужно — по текущему месяцу */}
      {earnings.received > 0 && strategy.verdict !== 'done' && (
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          В {mon} получено{' '}
          <b className="tabular text-ink">{formatRub(earnings.received)}</b>, отложено{' '}
          <b className={`tabular ${savedPct >= sharePct ? 'text-income' : 'text-ink'}`}>
            {formatRub(Math.max(0, earnings.savedThisMonth))}
          </b>{' '}
          ({savedPct}%). Для цели нужно ≈{sharePct}%
          {earnings.topUp > 0 ? (
            <>
              {' '}
              — доложите ещё <b className="tabular text-accent">{formatRub(earnings.topUp)}</b>.
            </>
          ) : (
            <> — вы идёте с запасом.</>
          )}
        </p>
      )}
    </div>
  )
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

function pickHeadline(
  pd: PlanDelta,
  p: Progress,
  seed: number
): { text: string; tone: 'ink' | 'expense' } {
  switch (pd.status) {
    case 'reached':
      return { tone: 'ink', text: '🎉 Цель достигнута! Вы справились — можно ставить новую.' }
    case 'overdue':
      return {
        tone: 'expense',
        text: `Дедлайн прошёл, а до цели ${formatRub(p.remaining)}. Обновите срок в настройках — и добивайте остаток.`,
      }
    case 'start':
      return {
        tone: 'ink',
        text: pick(
          [
            'Копилка готова. Первый взнос — самый важный: начните с любой суммы.',
            'Отличный момент начать: первые взносы задают темп всей цели.',
          ],
          seed
        ),
      }
    case 'ahead':
      return {
        tone: 'ink',
        text: pick(
          [
            `Опережение ${formatRub(pd.delta)} — отличный темп, так держать!`,
            `Вы впереди плана на ${formatRub(pd.delta)}. Цель приближается быстрее срока.`,
          ],
          seed
        ),
      }
    case 'behind':
      return {
        tone: 'expense',
        text: pick(
          [
            `Отставание ${formatRub(-pd.delta)}. Догоните, откладывая +${formatRub(pd.catchUpPerDay)} в день.`,
            `План впереди на ${formatRub(-pd.delta)}. Вернётесь в график: +${formatRub(pd.catchUpPerDay)} в день на этой неделе.`,
          ],
          seed
        ),
      }
    case 'onTrack':
    default:
      return {
        tone: 'ink',
        text: pick(
          [
            `Вы в графике. До цели ${formatRub(p.remaining)} — держите темп.`,
            'Точно по плану, без отставаний. Продолжайте в том же ритме.',
          ],
          seed
        ),
      }
  }
}
