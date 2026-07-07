// Минимальные типы Telegram WebApp SDK — только то, что используем в приложении.
export interface TelegramThemeParams {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
  header_bg_color?: string
  section_bg_color?: string
}

export interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void
  notificationOccurred(type: 'error' | 'success' | 'warning'): void
  selectionChanged(): void
}

export interface TelegramPopupButton {
  id?: string
  type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive'
  text?: string
}

export interface TelegramMainButton {
  text: string
  isVisible: boolean
  isActive: boolean
  show(): void
  hide(): void
  enable(): void
  disable(): void
  setText(text: string): void
  setParams(params: {
    text?: string
    color?: string
    text_color?: string
    is_active?: boolean
    is_visible?: boolean
  }): void
  onClick(cb: () => void): void
  offClick(cb: () => void): void
  showProgress(leaveActive?: boolean): void
  hideProgress(): void
}

// Облачное хранилище Telegram (Bot API 6.9+): переживает переустановку
// и чистку webview, синхронизируется между устройствами пользователя.
export interface TelegramCloudStorage {
  setItem(key: string, value: string, callback?: (err: string | null, ok?: boolean) => void): void
  getItem(key: string, callback: (err: string | null, value?: string) => void): void
  getItems(keys: string[], callback: (err: string | null, values?: Record<string, string>) => void): void
  removeItem(key: string, callback?: (err: string | null, ok?: boolean) => void): void
  removeItems(keys: string[], callback?: (err: string | null, ok?: boolean) => void): void
  getKeys(callback: (err: string | null, keys?: string[]) => void): void
}

export interface TelegramBackButton {
  isVisible: boolean
  show(): void
  hide(): void
  onClick(cb: () => void): void
  offClick(cb: () => void): void
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: Record<string, unknown>
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  themeParams: TelegramThemeParams
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
  headerColor: string
  backgroundColor: string
  safeAreaInset?: { top: number; bottom: number; left: number; right: number }
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number }
  MainButton: TelegramMainButton
  BackButton: TelegramBackButton
  HapticFeedback: TelegramHapticFeedback
  /** Опционально: старые клиенты Telegram могут не поддерживать. */
  CloudStorage?: TelegramCloudStorage
  ready(): void
  expand(): void
  close(): void
  setHeaderColor(color: string): void
  setBackgroundColor(color: string): void
  onEvent(event: string, cb: () => void): void
  offEvent(event: string, cb: () => void): void
  showPopup(
    params: { title?: string; message: string; buttons?: TelegramPopupButton[] },
    cb?: (buttonId: string) => void
  ): void
  showConfirm(message: string, cb: (confirmed: boolean) => void): void
  showAlert(message: string, cb?: () => void): void
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp }
  }
}

export {}
