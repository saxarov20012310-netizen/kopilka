import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { Card } from '../components/Card'
import { useMainButton, haptic, confirmNative, alertNative } from '../hooks/useTelegram'
import { parseAmount, formatRub } from '../utils/format'
import { todayISO, formatDayYear, daysBetween } from '../utils/date'

export function Settings() {
  const { state, dispatch } = useStore()
  const [title, setTitle] = useState(state.goal.title)
  const [target, setTarget] = useState(String(state.goal.target))
  const [deadline, setDeadline] = useState(state.goal.deadline)
  const [income, setIncome] = useState(String(state.settings.monthlyIncome))
  const [salaryDay, setSalaryDay] = useState(String(state.settings.salaryDay))
  const [advanceDay, setAdvanceDay] = useState(String(state.settings.advanceDay))
  const [rate, setRate] = useState(state.settings.savingRate)

  const targetNum = parseAmount(target)
  const daysLeft = daysBetween(todayISO(), deadline)

  const valid = useMemo(() => {
    const s = Number(salaryDay)
    const a = Number(advanceDay)
    return (
      title.trim().length > 0 &&
      targetNum > 0 &&
      daysLeft > 0 &&
      s >= 1 && s <= 31 &&
      a >= 1 && a <= 31
    )
  }, [title, targetNum, daysLeft, salaryDay, advanceDay])

  const save = async () => {
    if (!valid) {
      haptic.warning()
      await alertNative(
        daysLeft <= 0
          ? 'Дедлайн должен быть в будущем'
          : 'Проверьте поля: название, сумма цели и дни выплат (1–31)'
      )
      return
    }
    dispatch({
      type: 'SET_GOAL',
      goal: { title: title.trim(), target: targetNum, deadline },
    })
    dispatch({
      type: 'SET_SETTINGS',
      settings: {
        monthlyIncome: parseAmount(income),
        salaryDay: Number(salaryDay),
        advanceDay: Number(advanceDay),
        savingRate: rate,
      },
    })
    haptic.success()
    await alertNative('Настройки сохранены')
  }

  useMainButton({ text: 'Сохранить', active: valid, onClick: save })

  const resetAll = async () => {
    const ok = await confirmNative('Сбросить все операции? Цель и настройки останутся.')
    if (ok) {
      state.transactions.forEach((t) => dispatch({ type: 'DELETE_TX', id: t.id }))
      haptic.success()
    }
  }

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-32" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
      <h1 className="mb-4 text-2xl font-bold">Цель и настройки</h1>

      {/* Цель */}
      <Card className="p-4">
        <Field label="Название цели">
          <input
            value={title}
            maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, на мечту"
            className="w-full bg-transparent text-right outline-none"
          />
        </Field>
        <Divider />
        <Field label="Сумма цели">
          <div className="flex items-center gap-1">
            <input
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value.replace(/[^\d\s]/g, ''))}
              className="w-full bg-transparent text-right font-semibold tabular outline-none"
            />
            <span className="text-ink-muted">₽</span>
          </div>
        </Field>
        <Divider />
        <Field label="Дедлайн">
          <input
            type="date"
            value={deadline}
            min={todayISO()}
            onChange={(e) => setDeadline(e.target.value || deadline)}
            className="bg-transparent text-right outline-none"
          />
        </Field>
      </Card>
      <p className="mt-2 px-2 text-xs text-ink-muted">
        {targetNum > 0 && daysLeft > 0
          ? `${formatRub(targetNum)} к ${formatDayYear(deadline)} · осталось ${daysLeft} дн.`
          : 'Укажите сумму и дату в будущем'}
      </p>

      {/* Доход */}
      <h2 className="mb-2 mt-5 px-1 text-[15px] font-bold">Доход</h2>
      <Card className="p-4">
        <Field label="Доход в месяц">
          <div className="flex items-center gap-1">
            <input
              inputMode="numeric"
              value={income}
              onChange={(e) => setIncome(e.target.value.replace(/[^\d\s]/g, ''))}
              className="w-full bg-transparent text-right font-semibold tabular outline-none"
            />
            <span className="text-ink-muted">₽</span>
          </div>
        </Field>
        <Divider />
        <Field label="День зарплаты">
          <input
            inputMode="numeric"
            value={salaryDay}
            onChange={(e) => setSalaryDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
            className="w-16 bg-transparent text-right font-semibold tabular outline-none"
          />
        </Field>
        <Divider />
        <Field label="День аванса">
          <input
            inputMode="numeric"
            value={advanceDay}
            onChange={(e) => setAdvanceDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
            className="w-16 bg-transparent text-right font-semibold tabular outline-none"
          />
        </Field>
      </Card>

      {/* Норма откладывания */}
      <h2 className="mb-2 mt-5 px-1 text-[15px] font-bold">
        Откладывать с выплаты · {Math.round(rate * 100)}%
      </h2>
      <Card className="p-4">
        <input
          type="range"
          min={10}
          max={80}
          step={5}
          value={Math.round(rate * 100)}
          onChange={(e) => setRate(Number(e.target.value) / 100)}
          className="w-full accent-brand-500"
        />
        <div className="mt-1 flex justify-between text-xs text-ink-muted">
          <span>Комфортно</span>
          <span>Агрессивно</span>
        </div>
      </Card>

      <button
        onClick={resetAll}
        className="press mt-6 w-full rounded-2xl bg-surface py-3.5 text-[15px] font-semibold text-red-500 shadow-card"
      >
        Сбросить операции
      </button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-3 py-2.5">
      <span className="shrink-0 text-[15px]">{label}</span>
      <div className="flex-1">{children}</div>
    </label>
  )
}

function Divider() {
  return <div className="h-px bg-hairline" />
}
