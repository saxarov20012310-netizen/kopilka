import { useMemo } from 'react'
import { useStore } from '../store/store'
import { calcPlanDelta, calcProgress, type PlanDelta, type Progress } from '../utils/calc'
import { formatRub, daysWord } from '../utils/format'

type Tone = 'accent' | 'muted' | 'expense'

const TONE_CLS: Record<Tone, string> = {
  accent: 'border-accent/20 bg-accent-soft text-accent',
  muted: 'border-line bg-surface text-muted',
  expense: 'border-expense/20 bg-expense/10 text-expense',
}

/**
 * Мотивация с конкретикой, а не лозунгом: опережение (акцент) /
 * в графике (нейтрально) / отставание (сколько добавлять в день, чтобы догнать).
 * Фраза меняется по дням и после каждой операции.
 */
export function Motivation() {
  const { state } = useStore()
  const progress = useMemo(() => calcProgress(state), [state])
  const pd = useMemo(() => calcPlanDelta(state), [state])

  // Ротация вариантов: день месяца + число операций.
  const seed = new Date().getDate() + state.transactions.length
  const { text, tone } = pickMessage(pd, progress, seed)

  return (
    <div className={`rounded-card border p-4 text-[14.5px] font-medium leading-snug ${TONE_CLS[tone]}`}>
      {text}
    </div>
  )
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]
}

function pickMessage(pd: PlanDelta, p: Progress, seed: number): { text: string; tone: Tone } {
  switch (pd.status) {
    case 'reached':
      return { tone: 'accent', text: '🎉 Цель достигнута! Вы справились — можно ставить новую.' }

    case 'overdue':
      return {
        tone: 'expense',
        text: `Дедлайн прошёл, а до цели ${formatRub(p.remaining)}. Обновите срок в настройках — и добивайте остаток.`,
      }

    case 'start':
      return {
        tone: 'accent',
        text: pick(
          [
            'Копилка готова. Первый взнос — самый важный: начните с любой суммы.',
            'Отличный момент начать: первые взносы задают темп всей цели.',
            'Старт — сегодня. Даже небольшое поступление уже двигает вас к цели.',
          ],
          seed
        ),
      }

    case 'ahead':
      return {
        tone: 'accent',
        text: pick(
          [
            `Опережение ${formatRub(pd.delta)} — отличный темп, так держать!`,
            `Вы впереди плана на ${formatRub(pd.delta)}. Цель приближается быстрее срока.`,
            `+${formatRub(pd.delta)} к плану. Если удержите темп — финишируете раньше.`,
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
        tone: 'muted',
        text: pick(
          [
            `Вы в графике: ${formatRub(p.saved)} из плановых ${formatRub(Math.round(pd.expected))}.`,
            `Точно по плану. До цели ${formatRub(p.remaining)} и ${p.daysLeft} ${daysWord(p.daysLeft)} — держите темп.`,
            `Ровный темп, без отставаний. Осталось ${formatRub(p.remaining)}.`,
          ],
          seed
        ),
      }
  }
}
