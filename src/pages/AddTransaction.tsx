import { useCallback, useState } from 'react'
import { useStore } from '../store/store'
import { useBackButton, haptic, alertNative, confirmNative, isTelegram } from '../hooks/useTelegram'
import { Segmented } from '../components/Segmented'
import { parseAmount, formatRub } from '../utils/format'
import { todayISO, formatDay } from '../utils/date'
import { CategoryIcon, type IconName } from '../components/icons'
import type { TxKind, IncomeSource, ExpenseCategory, Transaction } from '../types/models'

const INCOME_SOURCES: { value: IncomeSource; label: string; icon: IconName }[] = [
  { value: 'salary', label: 'Зарплата', icon: 'salary' },
  { value: 'advance', label: 'Аванс', icon: 'advance' },
  { value: 'tips', label: 'Чаевые', icon: 'tips' },
  { value: 'other', label: 'Другое', icon: 'other' },
]

const EXPENSE_CATS: { value: ExpenseCategory; label: string; icon: IconName }[] = [
  { value: 'spending', label: 'Трата', icon: 'spending' },
  { value: 'goal', label: 'Из копилки', icon: 'goal' },
  { value: 'other', label: 'Другое', icon: 'other' },
]

const QUICK = [500, 1000, 3000, 5000]

export function AddTransaction({
  initialKind = 'income',
  initialAmount,
  initialCategory,
  initialNote,
  editTx,
  onClose,
}: {
  initialKind?: TxKind
  initialAmount?: number
  initialCategory?: IncomeSource | ExpenseCategory
  initialNote?: string
  /** Режим редактирования: исходная операция (id/createdAt/counts сохраняются). */
  editTx?: Transaction
  onClose: () => void
}) {
  const { dispatch } = useStore()
  const editing = !!editTx
  const [kind, setKind] = useState<TxKind>(editTx?.kind ?? initialKind)
  const [amountRaw, setAmountRaw] = useState(
    editTx ? String(editTx.amount) : initialAmount ? String(initialAmount) : ''
  )
  const [category, setCategory] = useState<IncomeSource | ExpenseCategory>(
    editTx?.category ?? initialCategory ?? (initialKind === 'income' ? 'tips' : 'spending')
  )
  const [note, setNote] = useState(editTx?.note ?? initialNote ?? '')
  const [date, setDate] = useState(editTx?.date ?? todayISO())
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
    if (editTx) {
      dispatch({
        type: 'UPDATE_TX',
        tx: { ...editTx, kind, amount, date, category, note: note.trim() || undefined },
      })
    } else {
      dispatch({
        type: 'ADD_TX',
        tx: { kind, amount, date, category, note: note.trim() || undefined, counts: true },
      })
    }
    haptic.success()
    onClose()
  }, [valid, dispatch, editTx, kind, amount, date, category, note, onClose])

  const remove = useCallback(async () => {
    if (!editTx) return
    const ok = await confirmNative(`Удалить операцию на ${formatRub(editTx.amount)}?`)
    if (!ok) return
    dispatch({ type: 'DELETE_TX', id: editTx.id })
    haptic.success()
    onClose()
  }, [editTx, dispatch, onClose])

  useBackButton(true, onClose)

  return (
    <div className="page-enter mx-auto max-w-md px-4 pb-28" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
      <div className="mb-4 flex items-center gap-2">
        {/* Вне Telegram нет системной Back Button — рисуем свою */}
        {!isTelegram() && (
          <button
            onClick={onClose}
            aria-label="Назад"
            className="press -ml-1 grid h-9 w-9 place-items-center rounded-full text-muted"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        )}
        <h1 className="text-[19px] font-bold">
          {editing
            ? 'Изменить операцию'
            : kind === 'income'
              ? 'Добавить поступление'
              : 'Добавить расход'}
        </h1>
      </div>

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
      <div className="mt-5 rounded-lg2 border border-line bg-surface p-5 shadow-card">
        <label className="text-[13px] text-muted">Сумма</label>
        <div className="mt-1 flex items-baseline gap-2">
          <input
            inputMode="numeric"
            autoFocus
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value.replace(/[^\d\s.,]/g, ''))}
            placeholder="0"
            className={`w-full bg-transparent font-display text-[34px] font-semibold tabular outline-none placeholder:text-muted/40 ${
              kind === 'expense' ? 'text-expense caret-expense' : 'text-ink caret-accent'
            }`}
          />
          <span className="text-3xl font-bold text-muted">₽</span>
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
                className={`press flex items-center gap-1.5 rounded-pill border px-4 py-2 text-sm font-medium ${
                  active
                    ? 'border-accent bg-accent text-onaccent'
                    : 'border-line bg-surface2 text-ink'
                }`}
              >
                <CategoryIcon name={c.icon} size={15} />
                {c.label}
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
        {date === todayISO() ? 'Сегодня' : formatDay(date)} ·{' '}
        {kind === 'income'
          ? 'зачислится в копилку'
          : category === 'goal'
            ? 'спишется из копилки'
            : 'просто учёт — копилку не тронет'}
      </p>

      {/* Кнопка подтверждения — в приложении (не системная кнопка Telegram) */}
      <button
        onClick={submit}
        className={`press mt-4 w-full rounded-card py-3.5 text-[15px] font-semibold ${
          valid ? 'btn-grad' : 'glass text-muted'
        }`}
      >
        {editing ? 'Сохранить' : 'Добавить'}
      </button>

      {/* Удаление — только в режиме редактирования */}
      {editing && (
        <button
          onClick={remove}
          className="glass press mt-3 w-full rounded-card py-3 text-[14px] font-semibold text-expense"
        >
          Удалить операцию
        </button>
      )}
    </div>
  )
}
