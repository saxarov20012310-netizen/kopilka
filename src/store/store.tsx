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
import type { AppState, Goal, Settings, Transaction, SkazkaSnapshot } from '../types/models'
import { fetchSkazkaSummary } from '../utils/skazka'
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
  | { type: 'ADD_GOAL'; goal: Omit<Goal, 'id' | 'celebratedPct'> }
  | { type: 'SET_ACTIVE_GOAL'; id: string }
  | { type: 'DELETE_GOAL'; id: string }
  | { type: 'SET_SETTINGS'; settings: Partial<Settings> }
  | { type: 'SET_ONBOARDED'; value: boolean }
  | { type: 'SET_SKAZKA'; snapshot: SkazkaSnapshot }
  | { type: 'SET_CELEBRATED'; pct: number }
  | { type: 'HYDRATE'; state: AppState }
  | { type: 'RESET' }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TX': {
      // Накопительную операцию (в копилку / «из копилки») привязываем к активной цели.
      const savings = action.tx.kind === 'income' || action.tx.category === 'goal'
      return {
        ...state,
        transactions: [
          {
            ...action.tx,
            id: newId(),
            createdAt: Date.now(),
            goalId: savings ? state.activeGoalId : undefined,
          },
          ...state.transactions,
        ],
      }
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
      // Редактируем активную цель.
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === state.activeGoalId ? { ...g, ...action.goal } : g
        ),
      }
    case 'ADD_GOAL': {
      const goal: Goal = { ...action.goal, id: newId(), celebratedPct: 0 }
      return { ...state, goals: [...state.goals, goal], activeGoalId: goal.id }
    }
    case 'SET_ACTIVE_GOAL':
      return state.goals.some((g) => g.id === action.id)
        ? { ...state, activeGoalId: action.id }
        : state
    case 'DELETE_GOAL': {
      // Нельзя удалить последнюю цель. Операции удаляемой цели тоже убираем.
      if (state.goals.length <= 1) return state
      const goals = state.goals.filter((g) => g.id !== action.id)
      const activeGoalId = state.activeGoalId === action.id ? goals[0].id : state.activeGoalId
      return {
        ...state,
        goals,
        activeGoalId,
        transactions: state.transactions.filter((t) => t.goalId !== action.id),
      }
    }
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } }
    case 'SET_ONBOARDED':
      return { ...state, onboarded: action.value }
    case 'SET_SKAZKA':
      // Снимок заработка из skazka: смены и чай — отдельно от отложенного.
      return { ...state, skazka: action.snapshot }
    case 'SET_CELEBRATED':
      // Веха — у активной цели.
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === state.activeGoalId ? { ...g, celebratedPct: action.pct } : g
        ),
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
      // Снимок заработка — для экрана «Заработок» и советов.
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
