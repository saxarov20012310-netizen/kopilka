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

/** Применяет тему Telegram к CSS-переменным и <html data-theme>. */
function applyTheme(tg: TelegramWebApp) {
  const scheme = tg.colorScheme ?? 'light'
  document.documentElement.setAttribute('data-theme', scheme)

  const p = tg.themeParams ?? {}
  const root = document.documentElement.style
  if (p.bg_color) root.setProperty('--surface', p.bg_color)
  if (p.secondary_bg_color) root.setProperty('--surface-2', p.secondary_bg_color)
  if (p.text_color) root.setProperty('--ink', p.text_color)
  if (p.hint_color) root.setProperty('--ink-muted', p.hint_color)

  // Красим шапку и фон клиента под наш экран.
  const headerColor = p.secondary_bg_color || (scheme === 'dark' ? '#17181c' : '#f4f5f7')
  try {
    tg.setHeaderColor(headerColor)
    tg.setBackgroundColor(p.secondary_bg_color || (scheme === 'dark' ? '#17181c' : '#f4f5f7'))
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
    btn.setParams({ text, is_active: active, is_visible: visible })
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
