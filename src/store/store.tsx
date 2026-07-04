// Глобальный стор на useReducer + Context, с автосохранением в localStorage.
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import type { AppState, Goal, Settings, Transaction } from '../types/models'
import { loadState, saveState, newId } from '../utils/storage'

type Action =
  | { type: 'ADD_TX'; tx: Omit<Transaction, 'id' | 'createdAt'> }
  | { type: 'UPDATE_TX'; tx: Transaction }
  | { type: 'DELETE_TX'; id: string }
  | { type: 'SET_GOAL'; goal: Partial<Goal> }
  | { type: 'SET_SETTINGS'; settings: Partial<Settings> }
  | { type: 'SET_ONBOARDED'; value: boolean }
  | { type: 'RESET' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TX':
      return {
        ...state,
        transactions: [
          { ...action.tx, id: newId(), createdAt: Date.now() },
          ...state.transactions,
        ],
      }
    case 'UPDATE_TX':
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.tx.id ? action.tx : t
        ),
      }
    case 'DELETE_TX':
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.id),
      }
    case 'SET_GOAL':
      return { ...state, goal: { ...state.goal, ...action.goal } }
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } }
    case 'SET_ONBOARDED':
      return { ...state, onboarded: action.value }
    case 'RESET':
      return { ...loadState(), onboarded: state.onboarded }
    default:
      return state
  }
}

interface StoreContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
