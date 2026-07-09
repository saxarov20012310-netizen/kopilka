import { useCallback, useMemo, useState } from 'react'
import { useTelegramInit } from './hooks/useTelegram'
import { useStore } from './store/store'
import { TabBar, type TabKey } from './components/TabBar'
import { Home } from './pages/Home'
import { Plan } from './pages/Plan'
import { Transactions } from './pages/Transactions'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'
import { AddTransaction } from './pages/AddTransaction'
import { Celebration } from './components/Celebration'
import { calcProgress } from './utils/calc'
import { activeGoal } from './utils/storage'
import type { TxKind, IncomeSource, ExpenseCategory, Transaction } from './types/models'

// Предзаполнение экрана добавления — для «отложить в один тап».
export interface AddPrefill {
  amount?: number
  category?: IncomeSource | ExpenseCategory
  note?: string
}
export type OpenAdd = (kind: TxKind, prefill?: AddPrefill) => void
export type OpenEdit = (tx: Transaction) => void

export default function App() {
  useTelegramInit()
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState<TabKey>('home')
  const [adding, setAdding] = useState<({ kind: TxKind } & AddPrefill) | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const openAdd = useCallback<OpenAdd>((kind, prefill) => setAdding({ kind, ...prefill }), [])
  const openEdit = useCallback<OpenEdit>((tx) => setEditing(tx), [])
  const closeAdd = useCallback(() => {
    setAdding(null)
    setEditing(null)
  }, [])

  // Пересечена ли новая веха прогресса (25/50/75/100%) активной цели — празднуем.
  const pct = calcProgress(state).percent
  const reachedTier = useMemo(() => Math.floor(Math.min(100, pct) / 25) * 25, [pct])
  const celebrate =
    state.onboarded && reachedTier >= 25 && reachedTier > activeGoal(state).celebratedPct

  // Онбординг перекрывает всё, пока не пройден.
  if (!state.onboarded) {
    return <Onboarding onDone={() => dispatch({ type: 'SET_ONBOARDED', value: true })} />
  }

  // Экран добавления/редактирования операции — поверх вкладок, с нативной Back Button.
  if (editing) {
    return <AddTransaction editTx={editing} onClose={closeAdd} />
  }
  if (adding) {
    return (
      <AddTransaction
        initialKind={adding.kind}
        initialAmount={adding.amount}
        initialCategory={adding.category}
        initialNote={adding.note}
        onClose={closeAdd}
      />
    )
  }

  return (
    <div className="min-h-screen">
      {tab === 'home' && <Home onAdd={openAdd} />}
      {tab === 'plan' && <Plan />}
      {tab === 'transactions' && <Transactions onAdd={openAdd} onEdit={openEdit} />}
      {tab === 'settings' && <Settings key={state.activeGoalId} />}
      <TabBar active={tab} onChange={setTab} />
      {celebrate && (
        <Celebration
          pct={reachedTier}
          onDone={() => dispatch({ type: 'SET_CELEBRATED', pct: reachedTier })}
        />
      )}
    </div>
  )
}
