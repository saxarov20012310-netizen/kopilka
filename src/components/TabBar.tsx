import { haptic } from '../hooks/useTelegram'

export type TabKey = 'home' | 'plan' | 'transactions' | 'settings'

const TABS: { key: TabKey; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    key: 'home',
    label: 'Главная',
    icon: (a) => (
      <path
        d="M3 10.5 12 3l9 7.5M5 9.5V20h5v-6h4v6h5V9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={a ? 2.2 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    key: 'plan',
    label: 'План',
    icon: (a) => (
      <>
        <rect x="3.5" y="4.5" width="17" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} />
        <path d="M3.5 9h17M8 3v3M16 3v3M7.5 13h4M7.5 16.5h7" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} strokeLinecap="round" />
      </>
    ),
  },
  {
    key: 'transactions',
    label: 'История',
    icon: (a) => (
      <>
        <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} strokeLinecap="round" />
      </>
    ),
  },
  {
    key: 'settings',
    label: 'Цель',
    icon: (a) => (
      <>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} />
        <circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth={a ? 2.2 : 1.8} />
      </>
    ),
  },
]

export function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}
    >
      {/* Парящая стеклянная «пилюля»: плотная полупрозрачная заливка без backdrop-blur (перф) */}
      <div className="glass-nav flex w-full max-w-app items-stretch justify-around gap-1 rounded-pill px-2 py-1.5 shadow-float">
        {TABS.map((t) => {
          const isActive = active === t.key
          return (
            <button
              key={t.key}
              onClick={() => {
                if (!isActive) haptic.select()
                onChange(t.key)
              }}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-pill py-2 transition-colors ${
                isActive ? 'btn-grad' : 'text-muted'
              }`}
            >
              <svg width="23" height="23" viewBox="0 0 24 24">
                {t.icon(isActive)}
              </svg>
              <span className={`text-[11px] ${isActive ? 'font-semibold' : ''}`}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
