import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { Card } from '../components/Card'
import { useMainButton, haptic, confirmNative, alertNative, isTelegram } from '../hooks/useTelegram'
import { parseAmount, formatRub } from '../utils/format'
import { todayISO, formatDayYear, daysBetween } from '../utils/date'
import { calcStrategy } from '../utils/calc'

export function Settings() {
  const { state, dispatch } = useStore()
  const [title, setTitle] = useState(state.goal.title)
  const [target, setTarget] = useState(String(state.goal.target))
  const [deadline, setDeadline] = useState(state.goal.deadline)
  const [income, setIncome] = useState(String(state.settings.monthlyIncome))
  const [salaryDay, setSalaryDay] = useState(String(state.settings.salaryDay))
  const [advanceDay, setAdvanceDay] = useState(String(state.settings.advanceDay))
  const [shifts, setShifts] = useState(String(state.settings.shiftsPerMonth))
  const [tips, setTips] = useState(String(state.settings.tipsPerShift))
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

  // Есть ли несохранённые изменения — кнопка «Сохранить» видна только при них.
  const dirty = useMemo(
    () =>
      title.trim() !== state.goal.title ||
      targetNum !== state.goal.target ||
      deadline !== state.goal.deadline ||
      parseAmount(income) !== state.settings.monthlyIncome ||
      Number(salaryDay) !== state.settings.salaryDay ||
      Number(advanceDay) !== state.settings.advanceDay ||
      Number(shifts) !== state.settings.shiftsPerMonth ||
      parseAmount(tips) !== state.settings.tipsPerShift ||
      rate !== state.settings.savingRate,
    [title, targetNum, deadline, income, salaryDay, advanceDay, shifts, tips, rate, state]
  )

  // Живая стратегия: пересчитывается прямо при вводе, ещё до сохранения.
  const liveStrategy = useMemo(() => {
    const tmp = {
      ...state,
      goal: {
        ...state.goal,
        target: targetNum > 0 ? targetNum : state.goal.target,
        deadline: daysLeft > 0 ? deadline : state.goal.deadline,
      },
      settings: {
        ...state.settings,
        monthlyIncome: parseAmount(income) || state.settings.monthlyIncome,
        salaryDay: Number(salaryDay) || state.settings.salaryDay,
        advanceDay: Number(advanceDay) || state.settings.advanceDay,
        shiftsPerMonth: Number(shifts) || 0,
        tipsPerShift: parseAmount(tips) || 0,
        savingRate: rate,
      },
    }
    return calcStrategy(tmp)
  }, [state, targetNum, deadline, daysLeft, income, salaryDay, advanceDay, shifts, tips, rate])

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
        shiftsPerMonth: Number(shifts) || 0,
        tipsPerShift: parseAmount(tips) || 0,
        savingRate: rate,
      },
    })
    haptic.success()
    await alertNative('Настройки сохранены')
  }

  useMainButton({ text: 'Сохранить', visible: dirty, active: valid, onClick: save })

  const resetAll = async () => {
    const ok = await confirmNative('Сбросить все операции? Цель и настройки останутся.')
    if (ok) {
      state.transactions.forEach((t) => dispatch({ type: 'DELETE_TX', id: t.id }))
      haptic.success()
    }
  }

  const ratePct = Math.round(rate * 100)
  const neededPct = Number.isFinite(liveStrategy.requiredShare)
    ? Math.round(Math.min(1, liveStrategy.requiredShare) * 100)
    : 100
  const perMonthSaving = Math.round(
    (parseAmount(income) + (Number(shifts) || 0) * parseAmount(tips)) * rate
  )
  // Прогресс заливки трека слайдера (диапазон 10–80%).
  const sliderVal = `${((ratePct - 10) / (80 - 10)) * 100}%`

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 10px)' }}>
      <h1 className="mb-3 text-[19px] font-bold">Цель и настройки</h1>

      {/* Цель: поля-карточки, подпись сверху — значение снизу */}
      <Card className="px-4 py-3.5">
        <FieldCol label="Название цели">
          <input
            value={title}
            maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, на мечту"
            className="w-full bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:text-muted/50"
          />
        </FieldCol>
      </Card>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Card className="px-4 py-3.5">
          <FieldCol label="Сумма цели">
            <div className="flex items-baseline gap-1">
              <input
                inputMode="numeric"
                value={target}
                onChange={(e) => setTarget(e.target.value.replace(/[^\d\s]/g, ''))}
                className="w-full bg-transparent text-[15px] font-bold tabular text-ink outline-none"
              />
              <span className="text-[13px] text-muted">₽</span>
            </div>
          </FieldCol>
        </Card>
        <Card className="px-4 py-3.5">
          <FieldCol label="Дедлайн">
            <input
              type="date"
              value={deadline}
              min={todayISO()}
              onChange={(e) => setDeadline(e.target.value || deadline)}
              className="w-full bg-transparent text-[15px] font-semibold tabular text-ink outline-none"
            />
          </FieldCol>
        </Card>
      </div>
      <p className="mt-2 px-2 text-xs text-muted">
        {targetNum > 0 && daysLeft > 0
          ? `${formatRub(targetNum)} к ${formatDayYear(deadline)} · осталось ${daysLeft} дн.`
          : 'Укажите сумму и дату в будущем'}
      </p>

      {/* Доход */}
      <h2 className="mb-2 mt-4 px-1 text-[15px] font-bold">Доход</h2>
      <Card className="px-4 py-3.5">
        <FieldCol label="Оклад в месяц (зарплата + аванс)">
          <div className="flex items-baseline gap-1">
            <input
              inputMode="numeric"
              value={income}
              onChange={(e) => setIncome(e.target.value.replace(/[^\d\s]/g, ''))}
              className="w-full bg-transparent text-[15px] font-bold tabular text-ink outline-none"
            />
            <span className="text-[13px] text-muted">₽</span>
          </div>
        </FieldCol>
      </Card>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        <Card className="px-4 py-3.5">
          <FieldCol label="День зарплаты">
            <input
              inputMode="numeric"
              value={salaryDay}
              onChange={(e) => setSalaryDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="w-full bg-transparent text-[15px] font-bold tabular text-ink outline-none"
            />
          </FieldCol>
        </Card>
        <Card className="px-4 py-3.5">
          <FieldCol label="День аванса">
            <input
              inputMode="numeric"
              value={advanceDay}
              onChange={(e) => setAdvanceDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="w-full bg-transparent text-[15px] font-bold tabular text-ink outline-none"
            />
          </FieldCol>
        </Card>
      </div>

      {/* Смены и чаевые — вторая часть дохода */}
      <h2 className="mb-2 mt-4 px-1 text-[15px] font-bold">Смены и чаевые</h2>
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="px-4 py-3.5">
          <FieldCol label="Смен в месяц">
            <input
              inputMode="numeric"
              value={shifts}
              onChange={(e) => setShifts(e.target.value.replace(/\D/g, '').slice(0, 2))}
              className="w-full bg-transparent text-[15px] font-bold tabular text-ink outline-none"
            />
          </FieldCol>
        </Card>
        <Card className="px-4 py-3.5">
          <FieldCol label="Чаевые за смену, ≈">
            <div className="flex items-baseline gap-1">
              <input
                inputMode="numeric"
                value={tips}
                onChange={(e) => setTips(e.target.value.replace(/[^\d\s]/g, ''))}
                className="w-full bg-transparent text-[15px] font-bold tabular text-ink outline-none"
              />
              <span className="text-[13px] text-muted">₽</span>
            </div>
          </FieldCol>
        </Card>
      </div>

      {/* Норма откладывания — фирменная тёмная карта с лаймовым слайдером */}
      <section className="mt-4 rounded-lg2 bg-inverse p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[13.5px] font-semibold text-[#EFF0FA]/85">Откладывать с выплаты</h3>
          <span className="font-display text-[22px] font-semibold tabular text-lime">{ratePct}%</span>
        </div>
        <input
          type="range"
          min={10}
          max={80}
          step={5}
          value={ratePct}
          onChange={(e) => setRate(Number(e.target.value) / 100)}
          className="slider-lime mt-5"
          style={{ '--val': sliderVal } as React.CSSProperties}
        />
        <div className="mt-2 flex justify-between text-[11.5px] text-[#83869E]">
          <span>Комфортно</span>
          <span>Агрессивно</span>
        </div>
        <div className="mt-3 space-y-1 border-t border-white/[0.06] pt-3 text-[12.5px] text-[#83869E]">
          <div>
            ≈ <b className="tabular text-lime">{formatRub(perMonthSaving)}</b> в месяц (оклад + чаевые)
          </div>
          {/* Живая сверка нормы со стратегией цели */}
          <div>
            {liveStrategy.verdict === 'unreal' ? (
              <span className="text-[#FF7A85]">
                Для цели не хватит даже 100% — сдвиньте дедлайн или уменьшите сумму
              </span>
            ) : neededPct > ratePct ? (
              <span className="text-[#FF7A85]">
                Для цели нужно ≈{neededPct}% — поднимите норму или сдвиньте дедлайн
              </span>
            ) : (
              <span>
                Для цели достаточно ≈{neededPct}% — ваша норма {ratePct}% покрывает план
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Вне Telegram нет MainButton — кнопка сохранения в контенте (только при изменениях) */}
      {!isTelegram() && dirty && (
        <button
          onClick={save}
          className={`press mt-5 w-full rounded-card py-3.5 text-[15px] font-semibold shadow-float ${
            valid ? 'bg-accent text-onaccent' : 'bg-surface2 text-muted'
          }`}
        >
          Сохранить
        </button>
      )}

      <button
        onClick={resetAll}
        className={`press w-full rounded-card border border-line bg-surface py-3.5 text-[15px] font-semibold text-expense shadow-card ${
          !isTelegram() && dirty ? 'mt-3' : 'mt-5'
        }`}
      >
        Сбросить операции
      </button>
    </div>
  )
}

// Поле-карточка: маленькая подпись сверху, значение снизу.
function FieldCol({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
