// Персистентность в два слоя:
//  1) localStorage — мгновенный старт (может слетать при чистке webview);
//  2) Telegram CloudStorage — облако на стороне Telegram, переживает
//     переустановку клиента и чистку кэша, синхронизируется между устройствами.
// Побеждает более свежая копия (по метке updatedAt).
import type { AppState } from '../types/models'
import type { TelegramCloudStorage } from '../types/telegram'
import { todayISO } from './date'

// v2 — сброс старых демо-данных: у существующих пользователей копилка обнулится.
const KEY = 'kopilka:v2'

// CloudStorage: лимит 4096 символов на значение — режем JSON на чанки.
const CLOUD_CHUNK = 3800
const CLOUD_META = 'k2m' // JSON { n: число чанков, t: updatedAt }
const cloudKey = (i: number) => `k2_${i}`

export const DEFAULT_STATE: AppState = {
  goal: {
    title: 'Моя цель',
    target: 464_000,
    deadline: '2027-01-18',
    startDate: todayISO(),
  },
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
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export interface Persisted {
  updatedAt: number
  state: AppState
}

function mergeDefaults(parsed: Partial<AppState>): AppState {
  return {
    ...DEFAULT_STATE,
    ...parsed,
    goal: { ...DEFAULT_STATE.goal, ...parsed.goal },
    settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
    transactions: parsed.transactions ?? [],
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
