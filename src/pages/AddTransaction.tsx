import { useCallback, useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { useMainButton, useBackButton, haptic, alertNative } from '../hooks/useTelegram'
import { Segmented } from '../components/Segmented'
import { parseAmount, formatRub } from '../utils/format'
import { todayISO, formatDay } from '../utils/date'
import type { TxKind, IncomeSource, ExpenseCategory } from '../types/models'

const INCOME_SOURCES: { value: IncomeSource; label: string; emoji: string }[] = [
  { value: 'salary', label: 'Зарплата', emoji: '💼' },
  { value: 'advance', label: 'Аванс', emoji: '📅' },
  { value: 'tips', label: 'Чаевые', emoji: '🪙' },
  { value: 'other', label: 'Другое', emoji: '✳️' },
]

const EXPENSE_CATS: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: 'spending', label: 'Трата', emoji: '🛍️' },
  { value: 'goal', label: 'Из копилки', emoji: '🎯' },
  { value: 'other', label: 'Другое', emoji: '✳️' },
]

const QUICK = [500, 1000, 3000, 5000]

export function AddTransaction({
  initialKind = 'income',
  onClose,
}: {
  initialKind?: TxKind
  onClose: () => void
}) {
  const { dispatch } = useStore()
  const [kind, setKind] = useState<TxKind>(initialKind)
  const [amountRaw, setAmountRaw] = useState('')
  const [category, setCategory] = useState<IncomeSource | ExpenseCategory>(
    initialKind === 'income' ? 'tips' : 'spending'
  )
  const [note, setNote] = useState('')
  const [date, setDate] = useState(todayISO())
  const [touched, setTouched] = useState(false)

  const amount = parseAmount(amountRaw)
  const valid = amount > 0

  const chips = kind === 'income' ? INCOME_SOURCES : EXPENSE_CATS

  const submit = useCallback(async () => {
    if (!valid) {
      setTouched(true)
      haptic.warning()
      await alertNative('Введите сумму больше нуля')
      return
    }
    dispatch({
      type: 'ADD_TX',
      tx: {
        kind,
        amount,
        date,
        category,
        note: note.trim() || undefined,
        counts: true,
      },
    })
    haptic.success()
    onClose()
  }, [valid, dispatch, kind, amount, date, category, note, onClose])

  useBackButton(true, onClose)
  useMainButton(
    useMemo(
      () => ({
        text: valid ? `Добавить ${formatRub(amount)}` : 'Добавить поступление',
        active: valid,
        onClick: submit,
      }),
      [valid, amount, submit]
    )
  )

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
      <h1 className="mb-4 text-2xl font-bold">
        {kind === 'income' ? 'Добавить поступление' : 'Добавить расход'}
      </h1>

      <Segmented
        options={[
          { value: 'income', label: 'Поступление' },
          { value: 'expense', label: 'Расход' },
        ]}
        value={kind}
        onChange={(k) => {
          setKind(k)
          setCategory(k === 'income' ? 'tips' : 'spending')
        }}
      />

      {/* Сумма */}
      <div className="mt-5 rounded-3xl border border-hairline bg-surface p-5 shadow-card">
        <label className="text-[13px] text-ink-muted">Сумма</label>
        <div className="mt-1 flex items-baseline gap-2">
          <input
            inputMode="numeric"
            autoFocus
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value.replace(/[^\d\s.,]/g, ''))}
            placeholder="0"
            className="w-full bg-transparent text-4xl font-bold tabular outline-none placeholder:text-ink-muted/40"
          />
          <span className="text-3xl font-bold text-ink-muted">₽</span>
        </div>
        {touched && !valid && (
          <div className="mt-1 text-xs text-red-500">Введите сумму больше нуля</div>
        )}
        <div className="mt-3 flex gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => {
                haptic.select()
                setAmountRaw(String(amount + q))
              }}
              className="press rounded-full border border-hairline bg-surface-2 px-3 py-1.5 text-[13px] font-medium"
            >
              +{q.toLocaleString('ru-RU')}
            </button>
          ))}
        </div>
      </div>

      {/* Категория */}
      <div className="mt-4">
        <div className="mb-2 text-[13px] text-ink-muted">Категория</div>
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => {
            const active = c.value === category
            return (
              <button
                key={c.value}
                onClick={() => {
                  haptic.select()
                  setCategory(c.value)
                }}
                className={`press rounded-full border px-4 py-2 text-sm font-medium ${
                  active
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-hairline bg-surface-2 text-ink'
                }`}
              >
                {c.emoji} {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Дата и комментарий */}
      <div className="mt-4 rounded-3xl border border-hairline bg-surface p-4 shadow-card">
        <label className="flex items-center justify-between py-2">
          <span className="text-[15px]">Дата</span>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="bg-transparent text-right text-[15px] text-ink-muted outline-none"
          />
        </label>
        <div className="my-1 h-px bg-hairline" />
        <label className="flex items-center gap-3 py-2">
          <span className="text-[15px]">Заметка</span>
          <input
            value={note}
            maxLength={60}
            onChange={(e) => setNote(e.target.value)}
            placeholder="необязательно"
            className="flex-1 bg-transparent text-right text-[15px] outline-none placeholder:text-ink-muted/60"
          />
        </label>
      </div>

      <p className="mt-3 px-1 text-center text-xs text-ink-muted">
        {date === todayISO() ? 'Сегодня' : formatDay(date)} · сумма учитывается в накоплениях
      </p>
    </div>
  )
}
