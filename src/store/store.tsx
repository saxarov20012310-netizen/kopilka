// Глобальный стор на useReducer + Context.
// Автосохранение: localStorage сразу + Telegram CloudStorage (с дебаунсом).
// При старте подтягиваем облачную копию — если она свежее локальной
// (например, webview почистился или пользователь сменил устройство).
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppState, Goal, Settings, Transaction } from '../types/models'
import { fetchSkazkaSummary, type SkazkaShift } from '../utils/skazka'
import { getTelegramUserId } from '../hooks/useTelegram'
import {
  loadLocal,
  loadState,
  saveLocal,
  saveCloudDebounced,
  loadCloudState,
  newId,
} from '../utils/storage'

type Action =
  | { type: 'ADD_TX'; tx: Omit<Transaction, 'id' | 'createdAt'> }
  | { type: 'UPDATE_TX'; tx: Transaction }
  | { type: 'DELETE_TX'; id: string }
  | { type: 'SET_GOAL'; goal: Partial<Goal> }
  | { type: 'SET_SETTINGS'; settings: Partial<Settings> }
  | { type: 'SET_ONBOARDED'; value: boolean }
  | { type: 'IMPORT_SHIFTS'; shifts: SkazkaShift[]; rate: number }
  | { type: 'HYDRATE'; state: AppState }
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
    case 'IMPORT_SHIFTS': {
      // Идемпотентно: пропускаем смены, уже импортированные ранее (по skazkaId).
      const known = new Set(
        state.transactions.map((t) => t.skazkaId).filter((x): x is number => x != null)
      )
      const fresh = action.shifts.filter((s) => s.tips > 0 && !known.has(s.id))
      if (fresh.length === 0) return state
      // По каждой новой смене откладываем рекомендованную долю чаевых.
      const added: Transaction[] = fresh.map((s) => ({
        id: newId(),
        kind: 'income',
        amount: Math.round(s.tips * action.rate),
        date: s.date,
        category: 'tips',
        note: `Смена · чай ${Math.round(s.tips)} ₽`,
        counts: true,
        createdAt: Date.now(),
        skazkaId: s.id,
      }))
      return { ...state, transactions: [...added, ...state.transactions] }
    }
    case 'HYDRATE':
      return action.state
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
  // Метка локальной копии на момент старта — до любых автосохранений.
  const initialRef = useRef(loadLocal())
  const [state, dispatch] = useReducer(reducer, initialRef.current.state)
  // В облако не пишем, пока не сверились с ним (чтобы не затереть свежие данные старыми).
  const [cloudChecked, setCloudChecked] = useState(false)

  // Один раз при старте: сверяемся с облаком Telegram.
  useEffect(() => {
    let cancelled = false
    loadCloudState().then((cloud) => {
      if (cancelled) return
      if (cloud && cloud.updatedAt > initialRef.current.updatedAt) {
        dispatch({ type: 'HYDRATE', state: cloud.state })
      }
      setCloudChecked(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const updatedAt = saveLocal(state)
    if (cloudChecked) saveCloudDebounced(state, updatedAt)
  }, [state, cloudChecked])

  // Свежее состояние без добавления в зависимости эффектов.
  const stateRef = useRef(state)
  stateRef.current = state

  // Автосинхронизация со skazka: после сверки с облаком тянем реальные смены
  // текущего месяца и обновляем ритм работы. Один раз за сессию.
  const syncedRef = useRef(false)
  useEffect(() => {
    if (!cloudChecked || syncedRef.current) return
    syncedRef.current = true
    const uid = getTelegramUserId()
    if (!uid) return
    let cancelled = false
    fetchSkazkaSummary(uid).then((s) => {
      if (cancelled || !s) return
      // Обновляем оценку ритма реальными цифрами (если есть смены).
      if (s.shifts > 0) {
        dispatch({
          type: 'SET_SETTINGS',
          settings: { shiftsPerMonth: s.shiftsPerMonth, tipsPerShift: s.avgTips },
        })
      }
      // Откладываем долю чая по каждой новой смене месяца.
      if (s.monthShifts.length > 0) {
        dispatch({
          type: 'IMPORT_SHIFTS',
          shifts: s.monthShifts,
          rate: stateRef.current.settings.savingRate,
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [cloudChecked])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
