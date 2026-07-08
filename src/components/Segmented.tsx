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
    <div className="glass flex rounded-pill p-1">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            onClick={() => {
              if (!active) haptic.select()
              onChange(o.value)
            }}
            className={`flex-1 rounded-pill py-2 text-sm font-semibold transition-all ${
              active ? 'btn-grad' : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
