import { useCallback, useState } from 'react'
import { useTelegramInit } from './hooks/useTelegram'
import { useStore } from './store/store'
import { TabBar, type TabKey } from './components/TabBar'
import { Home } from './pages/Home'
import { Plan } from './pages/Plan'
import { Transactions } from './pages/Transactions'
import { Settings } from './pages/Settings'
import { Onboarding } from './pages/Onboarding'
import { AddTransaction } from './pages/AddTransaction'
import type { TxKind, IncomeSource, ExpenseCategory } from './types/models'

// Предзаполнение экрана добавления — для «отложить в один тап».
export interface AddPrefill {
  amount?: number
  category?: IncomeSource | ExpenseCategory
  note?: string
}
export type OpenAdd = (kind: TxKind, prefill?: AddPrefill) => void

export default function App() {
  useTelegramInit()
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState<TabKey>('home')
  const [adding, setAdding] = useState<({ kind: TxKind } & AddPrefill) | null>(null)

  const openAdd = useCallback<OpenAdd>((kind, prefill) => setAdding({ kind, ...prefill }), [])
  const closeAdd = useCallback(() => setAdding(null), [])

  // Онбординг перекрывает всё, пока не пройден.
  if (!state.onboarded) {
    return <Onboarding onDone={() => dispatch({ type: 'SET_ONBOARDED', value: true })} />
  }

  // Экран добавления операции — поверх вкладок, с нативной Back Button.
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
      {tab === 'transactions' && <Transactions onAdd={openAdd} />}
      {tab === 'settings' && <Settings />}
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}
