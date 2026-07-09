import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { haptic, confirmNative, alertNative, getTelegramUserId } from '../hooks/useTelegram'
import { parseAmount, formatRub } from '../utils/format'
import { todayISO, formatDayYear, daysBetween, addMonths } from '../utils/date'
import { exportState, importState, activeGoal } from '../utils/storage'
import { fetchSkazkaSummary, type SkazkaSummary } from '../utils/skazka'

export function Settings() {
  const { state, dispatch } = useStore()
  const goal = activeGoal(state)
  const [title, setTitle] = useState(goal.title)
  const [target, setTarget] = useState(String(goal.target))
  const [deadline, setDeadline] = useState(goal.deadline)
  const [salaryAmt, setSalaryAmt] = useState(String(state.settings.salaryAmount))
  const [advanceAmt, setAdvanceAmt] = useState(String(state.settings.advanceAmount))
  const [salaryDay, setSalaryDay] = useState(String(state.settings.salaryDay))
  const [advanceDay, setAdvanceDay] = useState(String(state.settings.advanceDay))
  const [shifts, setShifts] = useState(String(state.settings.shiftsPerMonth))
  const [tips, setTips] = useState(String(state.settings.tipsPerShift))
  const [rate, setRate] = useState(state.settings.savingRate)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState<SkazkaSummary | null>(null)

  // Ручное обновление из skazka: приложение и так синхронизируется само при
  // открытии — эта кнопка для «прямо сейчас». Обновляет ритм и импортирует
  // новые смены месяца (идемпотентно, повтор ничего не задвоит).
  const syncSkazka = async () => {
    const uid = getTelegramUserId()
    if (!uid) {
      await alertNative('Синхронизация работает только внутри Telegram')
      return
    }
    setSyncing(true)
    const s = await fetchSkazkaSummary(uid)
    setSyncing(false)
    if (!s) {
      haptic.warning()
      await alertNative('Не удалось получить данные из skazka. Попробуйте позже.')
      return
    }
    if (s.shifts === 0) {
      await alertNative('В skazka нет смен за последние 30 дней — нечего подтягивать.')
      return
    }
    setShifts(String(s.shiftsPerMonth))
    setTips(String(s.avgTips))
    dispatch({
      type: 'SET_SETTINGS',
      settings: { shiftsPerMonth: s.shiftsPerMonth, tipsPerShift: s.avgTips },
    })
    dispatch({
      type: 'SET_SKAZKA',
      snapshot: {
        fetchedAt: Date.now(),
        shiftsPerMonth: s.shiftsPerMonth,
        avgTips: s.avgTips,
        monthShifts: s.monthShifts,
        monthTips: s.monthTips,
      },
    })
    setSynced(s)
    haptic.success()
  }

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
      title.trim() !== goal.title ||
      targetNum !== goal.target ||
      deadline !== goal.deadline ||
      parseAmount(salaryAmt) !== state.settings.salaryAmount ||
      parseAmount(advanceAmt) !== state.settings.advanceAmount ||
      Number(salaryDay) !== state.settings.salaryDay ||
      Number(advanceDay) !== state.settings.advanceDay ||
      Number(shifts) !== state.settings.shiftsPerMonth ||
      parseAmount(tips) !== state.settings.tipsPerShift ||
      rate !== state.settings.savingRate,
    [title, targetNum, deadline, salaryAmt, advanceAmt, salaryDay, advanceDay, shifts, tips, rate, state]
  )

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
        salaryAmount: parseAmount(salaryAmt) || 0,
        advanceAmount: parseAmount(advanceAmt) || 0,
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

  const resetAll = async () => {
    const ok = await confirmNative('Сбросить все операции? Цель и настройки останутся.')
    if (ok) {
      state.transactions.forEach((t) => dispatch({ type: 'DELETE_TX', id: t.id }))
      haptic.success()
    }
  }

  // Новая цель: создаём с осмысленными дефолтами и делаем активной (Settings
  // перемонтируется по key=activeGoalId и покажет её поля для правки).
  const addGoal = () => {
    haptic.impact('light')
    dispatch({
      type: 'ADD_GOAL',
      goal: {
        title: 'Новая цель',
        target: 100_000,
        deadline: addMonths(todayISO(), 6),
        startDate: todayISO(),
      },
    })
  }

  // Удалить активную цель (и её накопления). Последнюю удалить нельзя.
  const deleteGoal = async () => {
    if (state.goals.length <= 1) return
    const ok = await confirmNative(
      `Удалить цель «${goal.title}» вместе с её накоплениями? Заработок и расходы останутся.`
    )
    if (!ok) return
    dispatch({ type: 'DELETE_GOAL', id: goal.id })
    haptic.success()
  }

  // Резервная копия: скопировать всё состояние в буфер обмена.
  const backup = async () => {
    const text = exportState(state)
    try {
      await navigator.clipboard.writeText(text)
      haptic.success()
      await alertNative('Резервная копия скопирована в буфер. Сохраните её (например, в «Избранное» в Telegram) — потом можно восстановить.')
    } catch {
      // Буфер недоступен — показываем текст для ручного копирования.
      window.prompt('Скопируйте резервную копию:', text)
    }
  }

  // Восстановление: вставить строку резервной копии.
  const restore = async () => {
    const raw = window.prompt('Вставьте строку резервной копии:')
    if (!raw) return
    const restored = importState(raw)
    if (!restored) {
      haptic.error()
      await alertNative('Не удалось распознать резервную копию. Проверьте, что скопировали строку целиком.')
      return
    }
    const ok = await confirmNative('Заменить текущие данные копией? Нынешние операции и настройки будут перезаписаны.')
    if (!ok) return
    dispatch({ type: 'HYDRATE', state: restored })
    haptic.success()
    await alertNative('Данные восстановлены из копии.')
  }

  const ratePct = Math.round(rate * 100)
  const perMonthSaving = Math.round(
    (parseAmount(salaryAmt) + parseAmount(advanceAmt) + (Number(shifts) || 0) * parseAmount(tips)) *
      rate
  )
  // Прогресс заливки трека слайдера (диапазон 10–80%).
  const sliderVal = `${((ratePct - 10) / (80 - 10)) * 100}%`

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-24 text-center" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
      <h1 className="mb-3 text-[19px] font-bold">Цель и настройки</h1>

      {/* ── Переключатель целей + добавить (если целей несколько или чтобы завести вторую) ── */}
      <div className="no-scrollbar -mx-1 mb-4 flex justify-center gap-2 overflow-x-auto px-1">
        {state.goals.map((g) => (
          <button
            key={g.id}
            onClick={() => {
              if (g.id !== state.activeGoalId) {
                haptic.select()
                dispatch({ type: 'SET_ACTIVE_GOAL', id: g.id })
              }
            }}
            className={`press shrink-0 rounded-pill px-3.5 py-1.5 text-[12.5px] font-semibold ${
              g.id === state.activeGoalId ? 'btn-grad' : 'glass text-muted'
            }`}
          >
            {g.title}
          </button>
        ))}
        <button
          onClick={addGoal}
          className="glass press shrink-0 rounded-pill px-3 py-1.5 text-[12.5px] font-semibold text-accent"
        >
          ＋ Цель
        </button>
      </div>

      {/* ── Цель — одна карта с внутренними разделителями ── */}
      <SectionTitle>{state.goals.length > 1 ? 'Активная цель' : 'Цель'}</SectionTitle>
      <div className="glass overflow-hidden rounded-lg2">
        <Cell label="Название" className="border-b border-line">
          <input
            value={title}
            maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, на мечту"
            className="w-full bg-transparent text-center text-[15px] font-semibold text-ink outline-none placeholder:text-muted/50"
          />
        </Cell>
        <div className="grid grid-cols-2">
          <Cell label="Сумма, ₽" className="border-r border-line">
            <CellInput value={target} onChange={(v) => setTarget(v.replace(/[^\d\s]/g, ''))} />
          </Cell>
          <Cell label="Дедлайн">
            <input
              type="date"
              value={deadline}
              min={todayISO()}
              onChange={(e) => setDeadline(e.target.value || deadline)}
              className="w-full bg-transparent text-center text-[15px] font-bold tabular text-ink outline-none"
            />
          </Cell>
        </div>
      </div>
      <p className="mt-1.5 text-[11.5px] text-muted">
        {targetNum > 0 && daysLeft > 0
          ? `${formatRub(targetNum)} к ${formatDayYear(deadline)} · осталось ${daysLeft} дн.`
          : 'Укажите сумму и дату в будущем'}
      </p>

      {/* ── Выплаты — 2×2 в одной карте ── */}
      <SectionTitle className="mt-3">Выплаты</SectionTitle>
      <div className="glass grid grid-cols-2 overflow-hidden rounded-lg2">
        <Cell label="Зарплата ≈, ₽" className="border-b border-r border-line">
          <CellInput value={salaryAmt} onChange={(v) => setSalaryAmt(v.replace(/[^\d\s]/g, ''))} />
        </Cell>
        <Cell label="Аванс ≈, ₽" className="border-b border-line">
          <CellInput value={advanceAmt} onChange={(v) => setAdvanceAmt(v.replace(/[^\d\s]/g, ''))} />
        </Cell>
        <Cell label="День зарплаты" className="border-r border-line">
          <CellInput value={salaryDay} onChange={(v) => setSalaryDay(v.replace(/\D/g, '').slice(0, 2))} />
        </Cell>
        <Cell label="День аванса">
          <CellInput value={advanceDay} onChange={(v) => setAdvanceDay(v.replace(/\D/g, '').slice(0, 2))} />
        </Cell>
      </div>

      {/* ── Смены и чаевые (из skazka) ── */}
      <SectionTitle className="mt-3">Смены и чаевые</SectionTitle>
      <div className="glass grid grid-cols-2 overflow-hidden rounded-lg2">
        <Cell label="Смен в месяц" className="border-r border-line">
          <CellInput value={shifts} onChange={(v) => setShifts(v.replace(/\D/g, '').slice(0, 2))} />
        </Cell>
        <Cell label="Чаевые ≈, ₽">
          <CellInput value={tips} onChange={(v) => setTips(v.replace(/[^\d\s]/g, ''))} />
        </Cell>
      </div>
      <button
        onClick={syncSkazka}
        disabled={syncing}
        className="press mt-2.5 w-full rounded-card border border-accent/30 bg-accent-soft py-2.5 text-[13.5px] font-semibold text-accent disabled:opacity-60"
      >
        {syncing ? 'Обновляю из skazka…' : '⟳ Обновить из skazka'}
      </button>
      <p className="mt-1.5 text-[11px] text-muted">
        {synced
          ? `skazka: ${synced.shifts} смен за ${synced.days} дн · ≈ ${formatRub(synced.avgTips)}/смена`
          : 'Смены и чай подтягиваются из skazka автоматически'}
      </p>

      {/* ── Норма откладывания — фирменная тёмная карта ── */}
      <section className="mt-3 rounded-lg2 bg-inverse px-4 py-3.5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#83869E]">Норма откладывания</h3>
          <span className="font-display text-[24px] font-semibold tabular text-lime">{ratePct}%</span>
        </div>
        <input
          type="range"
          min={10}
          max={80}
          step={5}
          value={ratePct}
          onChange={(e) => setRate(Number(e.target.value) / 100)}
          className="slider-lime mt-3"
          style={{ '--val': sliderVal } as React.CSSProperties}
        />
        <div className="mt-2 text-[11.5px] leading-snug text-[#83869E]">
          Откладываешь ≈ <b className="tabular text-lime">{formatRub(perMonthSaving)}</b> в месяц ·
          успеешь ли — во вкладке «План»
        </div>
      </section>

      {/* Сохранить — при изменениях */}
      {dirty && (
        <button
          onClick={save}
          className={`press mt-4 w-full rounded-card py-3 text-[15px] font-semibold ${
            valid ? 'btn-grad' : 'glass text-muted'
          }`}
        >
          Сохранить
        </button>
      )}

      {/* ── Данные ── */}
      <SectionTitle className="mt-3">Данные</SectionTitle>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={backup}
          className="glass press rounded-card py-2.5 text-[12.5px] font-semibold text-ink"
        >
          Копия
        </button>
        <button
          onClick={restore}
          className="glass press rounded-card py-2.5 text-[12.5px] font-semibold text-ink"
        >
          Восстановить
        </button>
        <button
          onClick={resetAll}
          className="glass press rounded-card py-2.5 text-[12.5px] font-semibold text-expense"
        >
          Сбросить
        </button>
      </div>
      <p className="mt-1.5 text-[11px] leading-snug text-muted">
        «Копия» кладёт данные в буфер — сохрани в «Избранное» на случай переустановки.
      </p>

      {/* Удалить активную цель — только если целей больше одной */}
      {state.goals.length > 1 && (
        <button
          onClick={deleteGoal}
          className="glass press mt-4 w-full rounded-card py-3 text-[14px] font-semibold text-expense"
        >
          Удалить цель «{goal.title}»
        </button>
      )}
    </div>
  )
}

// Заголовок секции — по центру.
function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={`mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted ${className}`}>
      {children}
    </h2>
  )
}

// Ячейка поля внутри сгруппированной карты: подпись + центрированное значение.
function Cell({
  label,
  children,
  className = '',
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`block px-3 py-2 text-center ${className}`}>
      <span className="text-[11px] text-muted">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  )
}

// Числовой ввод для ячейки — центрированный, жирный.
function CellInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-center text-[16px] font-bold tabular text-ink outline-none"
    />
  )
}
