import { useState } from 'react'
import { haptic } from '../hooks/useTelegram'
import { useStore } from '../store/store'
import { formatRub, parseAmount } from '../utils/format'

const SLIDES = [
  {
    emoji: '🎯',
    title: 'Одна цель — понятный план',
    text: 'Задайте сумму и дату. Копилка сама посчитает, сколько откладывать с каждой выплаты.',
  },
  {
    emoji: '💸',
    title: 'Зарплата, аванс, чаевые',
    text: 'Добавляйте поступления в пару тапов. Стратегия подскажет, сколько отложить с каждого.',
  },
  {
    emoji: '📈',
    title: 'Стратегия подстраивается',
    text: 'Отстали или ускорились — план пересчитается сам: по вашим сменам, выплатам и тратам.',
  },
]

// Шаг после слайдов: спрашиваем ритм работы, чтобы стратегия считалась по-настоящему.
const FORM_STEP = SLIDES.length

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { state, dispatch } = useStore()
  const [i, setI] = useState(0)
  const [salaryAmt, setSalaryAmt] = useState(String(state.settings.salaryAmount))
  const [advanceAmt, setAdvanceAmt] = useState(String(state.settings.advanceAmount))
  const [shifts, setShifts] = useState(String(state.settings.shiftsPerMonth))
  const [tips, setTips] = useState(String(state.settings.tipsPerShift))

  const isForm = i === FORM_STEP

  const finish = () => {
    dispatch({
      type: 'SET_SETTINGS',
      settings: {
        salaryAmount: parseAmount(salaryAmt) || state.settings.salaryAmount,
        advanceAmount: parseAmount(advanceAmt) || state.settings.advanceAmount,
        shiftsPerMonth: Number(shifts) || 0,
        tipsPerShift: parseAmount(tips) || 0,
      },
    })
    onDone()
  }

  const next = () => {
    haptic.impact('light')
    if (isForm) finish()
    else setI((v) => v + 1)
  }

  return (
    <div
      className="page-enter flex min-h-screen flex-col px-6"
      style={{ paddingTop: 'calc(var(--safe-top) + 32px)', paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
    >
      <div className="flex justify-end">
        <button onClick={onDone} className="text-[15px] font-medium text-ink-muted">
          Пропустить
        </button>
      </div>

      {isForm ? (
        /* Шаг-форма: ритм работы для честной стратегии */
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="animate-pop-in text-center text-[22px] font-extrabold">Ваш ритм работы</h1>
          <p className="animate-pop-in mx-auto mt-2 max-w-[300px] text-center text-[14px] leading-relaxed text-ink-muted">
            По этим данным стратегия посчитает, сколько откладывать с каждой выплаты и смены.
          </p>

          <div className="animate-pop-in mt-6 space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <FormCard label="Зарплата, ≈">
                <div className="flex items-baseline gap-1">
                  <input
                    inputMode="numeric"
                    value={salaryAmt}
                    onChange={(e) => setSalaryAmt(e.target.value.replace(/[^\d\s]/g, ''))}
                    className="w-full bg-transparent text-[16px] font-bold tabular text-ink outline-none"
                  />
                  <span className="text-[13px] text-muted">₽</span>
                </div>
              </FormCard>
              <FormCard label="Аванс, ≈">
                <div className="flex items-baseline gap-1">
                  <input
                    inputMode="numeric"
                    value={advanceAmt}
                    onChange={(e) => setAdvanceAmt(e.target.value.replace(/[^\d\s]/g, ''))}
                    className="w-full bg-transparent text-[16px] font-bold tabular text-ink outline-none"
                  />
                  <span className="text-[13px] text-muted">₽</span>
                </div>
              </FormCard>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <FormCard label="Смен в месяц">
                <input
                  inputMode="numeric"
                  value={shifts}
                  onChange={(e) => setShifts(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  className="w-full bg-transparent text-[16px] font-bold tabular text-ink outline-none"
                />
              </FormCard>
              <FormCard label="Чаевые за смену, ≈">
                <div className="flex items-baseline gap-1">
                  <input
                    inputMode="numeric"
                    value={tips}
                    onChange={(e) => setTips(e.target.value.replace(/[^\d\s]/g, ''))}
                    className="w-full bg-transparent text-[16px] font-bold tabular text-ink outline-none"
                  />
                  <span className="text-[13px] text-muted">₽</span>
                </div>
              </FormCard>
            </div>
          </div>

          <p className="mt-4 text-center text-[12.5px] text-muted">
            Всё можно поменять потом на вкладке «Цель».
          </p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div key={i} className="animate-pop-in grid h-24 w-24 place-items-center rounded-full bg-accent-soft text-5xl shadow-float">
            {SLIDES[i].emoji}
          </div>
          <h1 key={`t${i}`} className="animate-pop-in mt-7 text-[22px] font-extrabold">
            {SLIDES[i].title}
          </h1>
          <p key={`p${i}`} className="animate-pop-in mt-3 max-w-[300px] text-[15px] leading-relaxed text-ink-muted">
            {SLIDES[i].text}
          </p>

          {i === 0 && (
            <div className="mt-6 rounded-card bg-surface px-5 py-3 text-[15px] shadow-card">
              Ваша цель: <b className="tabular">{formatRub(state.goals[0].target)}</b>
            </div>
          )}
        </div>
      )}

      {/* Точки-индикаторы (слайды + шаг-форма) */}
      <div className="flex justify-center gap-2 pb-4">
        {[...SLIDES, null].map((_, idx) => (
          <span
            key={idx}
            className={`h-2 rounded-full transition-all ${
              idx === i ? 'w-6 bg-accent' : 'w-2 bg-line'
            }`}
          />
        ))}
      </div>

      {/* Кнопка действия — в приложении (не системная кнопка Telegram) */}
      <button
        onClick={next}
        className="btn-grad press rounded-card py-4 text-[16px] font-semibold"
      >
        {isForm ? 'Начать копить' : 'Дальше'}
      </button>
    </div>
  )
}

function FormCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-card border border-line bg-surface px-4 py-3.5 shadow-card">
      <span className="text-[11.5px] text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
