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

  // Пересечена ли новая веха прогресса (25/50/75/100%) — тогда празднуем.
  const pct = calcProgress(state).percent
  const reachedTier = useMemo(() => Math.floor(Math.min(100, pct) / 25) * 25, [pct])
  const celebrate = state.onboarded && reachedTier >= 25 && reachedTier > state.celebratedPct

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
      {celebrate && (
        <Celebration
          pct={reachedTier}
          onDone={() => dispatch({ type: 'SET_CELEBRATED', pct: reachedTier })}
        />
      )}
    </div>
  )
}
