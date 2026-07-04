import { haptic } from '../hooks/useTelegram'

export interface SegOption<T extends string> {
  value: T
  label: string
}

// Сегментированный переключатель в стиле iOS.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegOption<T>[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-2xl border border-hairline bg-surface-2 p-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => {
              if (!active) haptic.select()
              onChange(o.value)
            }}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-all ${
              active ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
