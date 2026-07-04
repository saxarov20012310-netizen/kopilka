import { Component, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/**
 * Ловит ошибки рендера и показывает читаемый экран вместо белого.
 * Важно для отладки в webview Telegram, где консоль недоступна.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            background: '#f4f5f7',
            color: '#101828',
          }}
        >
          <div style={{ fontSize: 48 }}>😕</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Что-то пошло не так</div>
          <div style={{ fontSize: 13, color: '#667085', maxWidth: 320, wordBreak: 'break-word' }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => {
              try {
                localStorage.removeItem('kopilka:v2')
              } catch {
                /* ignore */
              }
              location.reload()
            }}
            style={{
              marginTop: 8,
              padding: '12px 24px',
              borderRadius: 16,
              border: 'none',
              background: '#f5b301',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Перезапустить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
