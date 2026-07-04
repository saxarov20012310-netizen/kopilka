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
import type { TxKind } from './types/models'

export default function App() {
  useTelegramInit()
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState<TabKey>('home')
  const [adding, setAdding] = useState<TxKind | null>(null)

  const openAdd = useCallback((kind: TxKind) => setAdding(kind), [])
  const closeAdd = useCallback(() => setAdding(null), [])

  // Онбординг перекрывает всё, пока не пройден.
  if (!state.onboarded) {
    return <Onboarding onDone={() => dispatch({ type: 'SET_ONBOARDED', value: true })} />
  }

  // Экран добавления операции — поверх вкладок, с нативной Back Button.
  if (adding) {
    return <AddTransaction initialKind={adding} onClose={closeAdd} />
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
