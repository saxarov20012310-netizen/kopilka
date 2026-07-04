import { useMemo, useState } from 'react'
import { useMainButton, haptic } from '../hooks/useTelegram'
import { useStore } from '../store/store'
import { formatRub } from '../utils/format'

const SLIDES = [
  {
    emoji: '🎯',
    title: 'Одна цель — понятный план',
    text: 'Задайте сумму и дату. Копилка сама посчитает, сколько откладывать в месяц, неделю и день.',
  },
  {
    emoji: '💸',
    title: 'Зарплата, аванс, чаевые',
    text: 'Добавляйте поступления в пару тапов. Приложение подскажет, сколько отложить с каждой выплаты.',
  },
  {
    emoji: '📈',
    title: 'Всегда видно прогресс',
    text: 'Крупный индикатор, динамика баланса и мотивация — вы точно знаете, где находитесь на пути к цели.',
  },
]

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { state } = useStore()
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1

  const next = () => {
    haptic.impact('light')
    if (last) onDone()
    else setI((v) => v + 1)
  }

  useMainButton(
    useMemo(
      () => ({ text: last ? 'Начать копить' : 'Дальше', onClick: next }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [last]
    )
  )

  const s = SLIDES[i]

  return (
    <div
      className="page-enter flex min-h-screen flex-col px-6"
      style={{ paddingTop: 'calc(var(--safe-top) + 40px)', paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
    >
      <div className="flex justify-end">
        <button onClick={onDone} className="text-[15px] font-medium text-ink-muted">
          Пропустить
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div key={i} className="animate-pop-in grid h-28 w-28 place-items-center rounded-full bg-brand-50 text-6xl shadow-float">
          {s.emoji}
        </div>
        <h1 key={`t${i}`} className="animate-pop-in mt-8 text-2xl font-extrabold">
          {s.title}
        </h1>
        <p key={`p${i}`} className="animate-pop-in mt-3 max-w-[300px] text-[15px] leading-relaxed text-ink-muted">
          {s.text}
        </p>

        {i === 0 && (
          <div className="mt-6 rounded-2xl bg-surface px-5 py-3 text-[15px] shadow-card">
            Ваша цель: <b className="tabular">{formatRub(state.goal.target)}</b>
          </div>
        )}
      </div>

      {/* Точки-индикаторы */}
      <div className="flex justify-center gap-2 pb-4">
        {SLIDES.map((_, idx) => (
          <span
            key={idx}
            className={`h-2 rounded-full transition-all ${
              idx === i ? 'w-6 bg-brand-500' : 'w-2 bg-hairline'
            }`}
          />
        ))}
      </div>

      {/* Fallback-кнопка вне Telegram (когда нет MainButton) */}
      <button
        onClick={next}
        className="press rounded-2xl bg-brand-500 py-4 text-[16px] font-semibold text-white shadow-float"
      >
        {last ? 'Начать копить' : 'Дальше'}
      </button>
    </div>
  )
}
