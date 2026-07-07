// Хук-обёртка над Telegram WebApp SDK: тема, safe area, кнопки, haptic, popup.
// Работает и вне Telegram (в обычном браузере) — с безопасными заглушками.
import { useEffect } from 'react'
import type { TelegramWebApp } from '../types/telegram'

export function getTG(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp
}

/** Есть ли реальный клиент Telegram (а не открытие в браузере). */
export function isTelegram(): boolean {
  const tg = getTG()
  return !!tg && !!tg.initData
}

// Фон экрана в фирменной палитре «Электрик» — под цвет --bg каждой темы.
const BG = { light: '#F1F2F7', dark: '#0C0E1C' } as const

/**
 * Применяет тему к <html data-theme>. Фирменная палитра «Электрик» —
 * фиксированная, поэтому theme params клиента НЕ переопределяют токены
 * (иначе Telegram затрёт чернильно-синий фон). Из Telegram берём только
 * colorScheme (light/dark), чтобы выбрать наш набор токенов.
 */
function applyTheme(tg: TelegramWebApp) {
  const scheme = tg.colorScheme ?? 'light'
  document.documentElement.setAttribute('data-theme', scheme)

  // Красим шапку и фон клиента под наш экран.
  const bg = BG[scheme]
  try {
    tg.setHeaderColor(bg)
    tg.setBackgroundColor(bg)
  } catch {
    /* старые версии клиента могут не поддерживать — не критично */
  }
}

/** Прокидывает safe area из Telegram в CSS-переменные. */
function applySafeArea(tg: TelegramWebApp) {
  const root = document.documentElement.style
  const top = tg.contentSafeAreaInset?.top ?? tg.safeAreaInset?.top ?? 0
  const bottom = tg.safeAreaInset?.bottom ?? 0
  root.setProperty('--safe-top', `${top}px`)
  root.setProperty('--safe-bottom', `${bottom}px`)
}

/** Инициализация приложения в Telegram. Вызывать один раз в корне. */
export function useTelegramInit() {
  useEffect(() => {
    const tg = getTG()
    if (!tg) {
      // Вне Telegram — светлая тема по умолчанию.
      document.documentElement.setAttribute('data-theme', 'light')
      return
    }
    tg.ready()
    tg.expand()
    applyTheme(tg)
    applySafeArea(tg)

    const onTheme = () => applyTheme(tg)
    const onViewport = () => applySafeArea(tg)
    tg.onEvent('themeChanged', onTheme)
    tg.onEvent('safeAreaChanged', onViewport)
    tg.onEvent('contentSafeAreaChanged', onViewport)
    tg.onEvent('viewportChanged', onViewport)

    return () => {
      tg.offEvent('themeChanged', onTheme)
      tg.offEvent('safeAreaChanged', onViewport)
      tg.offEvent('contentSafeAreaChanged', onViewport)
      tg.offEvent('viewportChanged', onViewport)
    }
  }, [])
}

/** Управление MainButton. Показывает кнопку, пока смонтирован. */
export function useMainButton(
  opts: { text: string; visible?: boolean; active?: boolean; onClick: () => void }
) {
  const { text, visible = true, active = true, onClick } = opts
  useEffect(() => {
    const tg = getTG()
    if (!tg) return
    const btn = tg.MainButton
    // Цвет кнопки — акцент текущей темы (dark: лайм, light: индиго).
    const dark = document.documentElement.dataset.theme === 'dark'
    btn.setParams({
      text,
      is_active: active,
      is_visible: visible,
      color: dark ? '#C6F245' : '#5A48E8',
      text_color: dark ? '#0C0E1C' : '#FFFFFF',
    })
    if (visible) btn.show()
    else btn.hide()
    active ? btn.enable() : btn.disable()
    btn.onClick(onClick)
    return () => {
      btn.offClick(onClick)
      btn.hide()
    }
  }, [text, visible, active, onClick])
}

/** Управление BackButton. */
export function useBackButton(visible: boolean, onClick: () => void) {
  useEffect(() => {
    const tg = getTG()
    if (!tg) return
    const btn = tg.BackButton
    if (visible) {
      btn.show()
      btn.onClick(onClick)
    } else {
      btn.hide()
    }
    return () => {
      btn.offClick(onClick)
      btn.hide()
    }
  }, [visible, onClick])
}

export const haptic = {
  impact(style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' = 'light') {
    getTG()?.HapticFeedback.impactOccurred(style)
  },
  success() {
    getTG()?.HapticFeedback.notificationOccurred('success')
  },
  warning() {
    getTG()?.HapticFeedback.notificationOccurred('warning')
  },
  error() {
    getTG()?.HapticFeedback.notificationOccurred('error')
  },
  select() {
    getTG()?.HapticFeedback.selectionChanged()
  },
}

/** Подтверждение через нативный popup (fallback — window.confirm). */
export function confirmNative(message: string): Promise<boolean> {
  const tg = getTG()
  return new Promise((resolve) => {
    if (tg?.showConfirm) tg.showConfirm(message, resolve)
    else resolve(window.confirm(message))
  })
}

/** Уведомление через нативный alert (fallback — window.alert). */
export function alertNative(message: string): Promise<void> {
  const tg = getTG()
  return new Promise((resolve) => {
    if (tg?.showAlert) tg.showAlert(message, () => resolve())
    else {
      window.alert(message)
      resolve()
    }
  })
}
