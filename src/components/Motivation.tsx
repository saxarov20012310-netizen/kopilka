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
import { haptic } from '../hooks/useTelegram'
import type { OpenAdd } from '../App'

/**
 * Карточка «Совет» — коротко и по делу: статус к плану одной фразой +
 * (если отстаёшь) кнопка «Отложить N» в один тап. Без плотных абзацев —
 * подробная разбивка получено/отложено/потрачено живёт в История → Заработок.
 */
export function Motivation({ onAdd }: { onAdd?: OpenAdd }) {
  const { state } = useStore()
  const progress = useMemo(() => calcProgress(state), [state])
  const pd = useMemo(() => calcPlanDelta(state), [state])
  const strategy = useMemo(() => calcStrategy(state), [state])
  const earnings = useMemo(() => calcMonthEarnings(state), [state])

  const seed = new Date().getDate() + state.transactions.length
  const headline = pickHeadline(pd, progress, seed)
  const showTopUp = earnings.topUp > 0 && strategy.verdict !== 'done'

  return (
    <div className="rounded-lg2 border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[12px] text-accent">
          ✦
        </span>
        <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Совет</span>
      </div>

      <p className={`mt-2.5 text-[14.5px] font-medium leading-snug ${headline.tone === 'expense' ? 'text-expense' : 'text-ink'}`}>
        {headline.text}
      </p>

      {showTopUp && onAdd && (
        <button
          onClick={() => {
            haptic.impact('light')
            onAdd('income', { amount: earnings.topUp, category: 'other', note: 'Догоняю план' })
          }}
          className="btn-grad press mt-3 flex w-full items-center justify-center gap-1.5 rounded-pill py-2.5 text-[14px] font-semibold"
        >
          Отложить {formatRub(earnings.topUp)}
          <span className="text-[16px] leading-none">+</span>
        </button>
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
      return { tone: 'ink', text: '🎉 Цель достигнута! Можно ставить новую.' }
    case 'overdue':
      return {
        tone: 'expense',
        text: `Дедлайн прошёл, до цели ${formatRub(p.remaining)}. Обнови срок во вкладке «Цель».`,
      }
    case 'start':
      return {
        tone: 'ink',
        text: pick(
          [
            'Начни с любой суммы — первый взнос самый важный.',
            'Отличный момент начать: первые взносы задают темп.',
          ],
          seed
        ),
      }
    case 'ahead':
      return {
        tone: 'ink',
        text: `Ты впереди плана на ${formatRub(pd.delta)} — отличный темп!`,
      }
    case 'behind':
      return {
        tone: 'expense',
        text: `Отстаёшь на ${formatRub(-pd.delta)}. Чтобы догнать — откладывай +${formatRub(pd.catchUpPerDay)} в день.`,
      }
    case 'onTrack':
    default:
      return {
        tone: 'ink',
        text: `Идёшь по плану. До цели ${formatRub(p.remaining)} — держи темп.`,
      }
  }
}
