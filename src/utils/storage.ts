// Персистентность в два слоя:
//  1) localStorage — мгновенный старт (может слетать при чистке webview);
//  2) Telegram CloudStorage — облако на стороне Telegram, переживает
//     переустановку клиента и чистку кэша, синхронизируется между устройствами.
// Побеждает более свежая копия (по метке updatedAt).
import type { AppState, Goal } from '../types/models'
import type { TelegramCloudStorage } from '../types/telegram'
import { todayISO } from './date'

// v2 — сброс старых демо-данных: у существующих пользователей копилка обнулится.
const KEY = 'kopilka:v2'

// CloudStorage: лимит 4096 символов на значение — режем JSON на чанки.
const CLOUD_CHUNK = 3800
const CLOUD_META = 'k2m' // JSON { n: число чанков, t: updatedAt }
const cloudKey = (i: number) => `k2_${i}`

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

const DEFAULT_GOAL: Goal = {
  id: 'g1',
  title: 'Моя цель',
  target: 464_000,
  deadline: '2027-01-18',
  startDate: todayISO(),
  celebratedPct: 0,
}

export const DEFAULT_STATE: AppState = {
  goals: [DEFAULT_GOAL],
  activeGoalId: DEFAULT_GOAL.id,
  settings: {
    // Реальная структура дохода: небольшой оклад, основное — чаевые.
    salaryAmount: 25_000,
    advanceAmount: 12_000,
    salaryDay: 5,
    advanceDay: 20,
    savingRate: 0.4,
    shiftsPerMonth: 15,
    tipsPerShift: 3_000,
  },
  transactions: [],
  onboarded: false,
  skazka: null,
}

/** Активная цель (или первая как фолбэк, если id не найден). */
export function activeGoal(state: AppState): Goal {
  return state.goals.find((g) => g.id === state.activeGoalId) ?? state.goals[0]
}

export interface Persisted {
  updatedAt: number
  state: AppState
}

// Старый формат состояния (одна цель) — для миграции.
type LegacyState = Partial<AppState> & {
  goal?: Partial<Goal>
  celebratedPct?: number
}

function mergeDefaults(raw: Partial<AppState>): AppState {
  const parsed = raw as LegacyState

  // Миграция одиночной цели → массив. Старые операции без skazkaId тегируем g1.
  let goals: Goal[]
  let activeGoalId: string
  if (parsed.goals && parsed.goals.length > 0) {
    goals = parsed.goals.map((g) => ({ ...DEFAULT_GOAL, ...g }))
    activeGoalId = parsed.activeGoalId ?? goals[0].id
  } else if (parsed.goal) {
    const migrated: Goal = {
      ...DEFAULT_GOAL,
      ...parsed.goal,
      id: 'g1',
      celebratedPct: parsed.celebratedPct ?? 0,
    }
    goals = [migrated]
    activeGoalId = 'g1'
  } else {
    goals = [DEFAULT_GOAL]
    activeGoalId = DEFAULT_GOAL.id
  }

  const transactions = (parsed.transactions ?? [])
    // Операции старого автоимпорта смен (skazkaId) — заработок, не отложенное: вычищаем.
    .filter((t) => t.skazkaId == null)
    // Накопительным операциям без goalId проставляем первую цель.
    .map((t) => (t.goalId == null && (t.kind === 'income' || t.category === 'goal')
      ? { ...t, goalId: goals[0].id }
      : t))

  return {
    ...DEFAULT_STATE,
    goals,
    activeGoalId,
    settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
    transactions,
    onboarded: parsed.onboarded ?? false,
    skazka: parsed.skazka ?? null,
  }
}

/** Локальная копия с меткой времени. Понимает и старый формат (голый AppState). */
export function loadLocal(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { updatedAt: 0, state: { ...DEFAULT_STATE } }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (parsed && typeof parsed === 'object' && 'state' in parsed) {
      return {
        updatedAt: (parsed.updatedAt as number) ?? 0,
        state: mergeDefaults(parsed.state as Partial<AppState>),
      }
    }
    // Старый формат — состояние без обёртки.
    return { updatedAt: 0, state: mergeDefaults(parsed as Partial<AppState>) }
  } catch {
    return { updatedAt: 0, state: { ...DEFAULT_STATE } }
  }
}

export function loadState(): AppState {
  return loadLocal().state
}

export function saveLocal(state: AppState): number {
  const updatedAt = Date.now()
  try {
    localStorage.setItem(KEY, JSON.stringify({ updatedAt, state }))
  } catch {
    // Хранилище недоступно — тихо игнорируем (облако подстрахует).
  }
  return updatedAt
}

// ───────────────────────── Telegram CloudStorage ─────────────────────────

function getCloud(): TelegramCloudStorage | undefined {
  const wa = window.Telegram?.WebApp
  // CloudStorage работает только внутри Telegram.
  if (!wa || !wa.initData) return undefined
  return wa.CloudStorage
}

/** Читает состояние из облака Telegram. null — облака нет или оно пустое. */
export function loadCloudState(): Promise<Persisted | null> {
  const cs = getCloud()
  if (!cs) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      cs.getItem(CLOUD_META, (err, metaRaw) => {
        if (err || !metaRaw) return resolve(null)
        let meta: { n: number; t: number }
        try {
          meta = JSON.parse(metaRaw)
        } catch {
          return resolve(null)
        }
        if (!meta || !Number.isFinite(meta.n) || meta.n < 1) return resolve(null)
        const keys = Array.from({ length: meta.n }, (_, i) => cloudKey(i))
        cs.getItems(keys, (err2, values) => {
          if (err2 || !values) return resolve(null)
          try {
            const json = keys.map((k) => values[k] ?? '').join('')
            const parsed = JSON.parse(json) as Partial<AppState>
            resolve({ updatedAt: meta.t ?? 0, state: mergeDefaults(parsed) })
          } catch {
            resolve(null)
          }
        })
      })
    } catch {
      resolve(null)
    }
  })
}

let cloudTimer: ReturnType<typeof setTimeout> | undefined
let lastCloudChunks = 0

/** Пишет состояние в облако с дебаунсом (не чаще раза в секунду). */
export function saveCloudDebounced(state: AppState, updatedAt: number): void {
  const cs = getCloud()
  if (!cs) return
  clearTimeout(cloudTimer)
  cloudTimer = setTimeout(() => saveCloud(cs, state, updatedAt), 1000)
}

function saveCloud(cs: TelegramCloudStorage, state: AppState, updatedAt: number): void {
  try {
    const json = JSON.stringify(state)
    const chunks: string[] = []
    for (let i = 0; i < json.length; i += CLOUD_CHUNK) {
      chunks.push(json.slice(i, i + CLOUD_CHUNK))
    }
    chunks.forEach((c, i) => cs.setItem(cloudKey(i), c))
    // Мета пишем последней: читатель сперва берёт мету, затем чанки.
    cs.setItem(CLOUD_META, JSON.stringify({ n: chunks.length, t: updatedAt }))
    // Подчищаем хвост от предыдущей, более длинной записи.
    if (lastCloudChunks > chunks.length) {
      const stale = Array.from(
        { length: lastCloudChunks - chunks.length },
        (_, i) => cloudKey(chunks.length + i)
      )
      cs.removeItems(stale)
    }
    lastCloudChunks = chunks.length
  } catch {
    // Облако недоступно — localStorage остаётся источником.
  }
}

export function newId(): string {
  return uid()
}

// ───────────────────────── Экспорт / импорт ─────────────────────────

/** Строка резервной копии: версия + состояние + метка времени. */
export function exportState(state: AppState): string {
  return JSON.stringify({ v: 2, at: Date.now(), state }, null, 0)
}

/** Разбор резервной копии. null — формат не распознан. */
export function importState(raw: string): AppState | null {
  try {
    const parsed = JSON.parse(raw.trim()) as Record<string, unknown>
    // Поддерживаем и обёртку {v,state}, и голый AppState.
    const candidate =
      parsed && typeof parsed === 'object' && 'state' in parsed
        ? (parsed.state as Partial<AppState>)
        : (parsed as Partial<AppState>)
    if (!candidate || typeof candidate !== 'object') return null
    // Минимальная валидация: есть цель(и) — новый формат goals[] или старый goal.
    const c = candidate as LegacyState
    const hasGoals = Array.isArray(c.goals) && c.goals.length > 0
    const hasLegacyGoal = typeof c.goal?.target === 'number'
    if (!hasGoals && !hasLegacyGoal) return null
    return mergeDefaults(candidate)
  } catch {
    return null
  }
}
