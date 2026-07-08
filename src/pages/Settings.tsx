import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { Card } from '../components/Card'
import { haptic, confirmNative, alertNative, getTelegramUserId } from '../hooks/useTelegram'
import { parseAmount, formatRub } from '../utils/format'
import { todayISO, formatDayYear, daysBetween } from '../utils/date'
import { calcStrategy } from '../utils/calc'
import { exportState, importState } from '../utils/storage'
import { fetchSkazkaSummary, type SkazkaSummary } from '../utils/skazka'

export function Settings() {
  const { state, dispatch } = useStore()
  const [title, setTitle] = useState(state.goal.title)
  const [target, setTarget] = useState(String(state.goal.target))
  const [deadline, setDeadline] = useState(state.goal.deadline)
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
      title.trim() !== state.goal.title ||
      targetNum !== state.goal.target ||
      deadline !== state.goal.deadline ||
      parseAmount(salaryAmt) !== state.settings.salaryAmount ||
      parseAmount(advanceAmt) !== state.settings.advanceAmount ||
      Number(salaryDay) !== state.settings.salaryDay ||
      Number(advanceDay) !== state.settings.advanceDay ||
      Number(shifts) !== state.settings.shiftsPerMonth ||
      parseAmount(tips) !== state.settings.tipsPerShift ||
      rate !== state.settings.savingRate,
    [title, targetNum, deadline, salaryAmt, advanceAmt, salaryDay, advanceDay, shifts, tips, rate, state]
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
        salaryAmount: parseAmount(salaryAmt) || 0,
        advanceAmount: parseAmount(advanceAmt) || 0,
        salaryDay: Number(salaryDay) || state.settings.salaryDay,
        advanceDay: Number(advanceDay) || state.settings.advanceDay,
        shiftsPerMonth: Number(shifts) || 0,
        tipsPerShift: parseAmount(tips) || 0,
        savingRate: rate,
      },
    }
    return calcStrategy(tmp)
  }, [state, targetNum, deadline, daysLeft, salaryAmt, advanceAmt, salaryDay, advanceDay, shifts, tips, rate])

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
  const neededPct = Number.isFinite(liveStrategy.requiredShare)
    ? Math.round(Math.min(1, liveStrategy.requiredShare) * 100)
    : 100
  const perMonthSaving = Math.round(
    (parseAmount(salaryAmt) + parseAmount(advanceAmt) + (Number(shifts) || 0) * parseAmount(tips)) *
      rate
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

      {/* Доход: зарплата и аванс — отдельными суммами (основной доход — чаевые) */}
      <h2 className="mb-2 mt-4 px-1 text-[15px] font-bold">Выплаты</h2>
      <div className="grid grid-cols-2 gap-2.5">
        <Card className="px-4 py-3.5">
          <FieldCol label="Зарплата, ≈">
            <div className="flex items-baseline gap-1">
              <input
                inputMode="numeric"
                value={salaryAmt}
                onChange={(e) => setSalaryAmt(e.target.value.replace(/[^\d\s]/g, ''))}
                className="w-full bg-transparent text-[15px] font-bold tabular text-ink outline-none"
              />
              <span className="text-[13px] text-muted">₽</span>
            </div>
          </FieldCol>
        </Card>
        <Card className="px-4 py-3.5">
          <FieldCol label="Аванс, ≈">
            <div className="flex items-baseline gap-1">
              <input
                inputMode="numeric"
                value={advanceAmt}
                onChange={(e) => setAdvanceAmt(e.target.value.replace(/[^\d\s]/g, ''))}
                className="w-full bg-transparent text-[15px] font-bold tabular text-ink outline-none"
              />
              <span className="text-[13px] text-muted">₽</span>
            </div>
          </FieldCol>
        </Card>
      </div>
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

      {/* Смены и чаевые — вторая часть дохода. Синхронизируются из skazka автоматически. */}
      <div className="mb-2 mt-4 flex items-center justify-between px-1">
        <h2 className="text-[15px] font-bold">Смены и чаевые</h2>
        <span className="text-[11.5px] text-muted">обновляется из skazka</span>
      </div>
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

      {/* Ручное обновление «прямо сейчас» — автосинк и так идёт при открытии */}
      <button
        onClick={syncSkazka}
        disabled={syncing}
        className="press mt-2.5 w-full rounded-card border border-accent/30 bg-accent-soft py-3 text-[14px] font-semibold text-accent disabled:opacity-60"
      >
        {syncing ? 'Обновляю из skazka…' : '⟳ Обновить из skazka сейчас'}
      </button>
      {synced && (
        <p className="mt-1.5 px-2 text-[12px] text-muted">
          skazka за {synced.days} дн.: {synced.shifts} смен · в среднем{' '}
          {formatRub(synced.avgTips)}/смена. В этом месяце — {synced.monthShifts.length} смен на{' '}
          {formatRub(synced.monthTips)} чая (см. История → Заработок).
        </p>
      )}

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
            ≈ <b className="tabular text-lime">{formatRub(perMonthSaving)}</b> в месяц (выплаты + чаевые)
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

      {/* Кнопка сохранения — в приложении, появляется только при изменениях */}
      {dirty && (
        <button
          onClick={save}
          className={`press mt-5 w-full rounded-card py-3.5 text-[15px] font-semibold ${
            valid ? 'btn-grad' : 'glass text-muted'
          }`}
        >
          Сохранить
        </button>
      )}

      {/* Резервная копия данных */}
      <h2 className="mb-2 mt-5 px-1 text-[15px] font-bold">Резервная копия</h2>
      <div className="grid grid-cols-2 gap-2.5">
        <button
          onClick={backup}
          className="press rounded-card border border-line bg-surface py-3 text-[14px] font-semibold text-ink shadow-card"
        >
          Сохранить копию
        </button>
        <button
          onClick={restore}
          className="press rounded-card border border-line bg-surface py-3 text-[14px] font-semibold text-ink shadow-card"
        >
          Восстановить
        </button>
      </div>
      <p className="mt-1.5 px-1 text-[11.5px] text-muted">
        Данные хранятся в Telegram и на устройстве. Копия — на случай переустановки: скопируй строку
        и сохрани, например, в «Избранное».
      </p>

      <button
        onClick={resetAll}
        className="press mt-5 w-full rounded-card border border-line bg-surface py-3.5 text-[15px] font-semibold text-expense shadow-card"
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
