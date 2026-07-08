import type { ReactNode } from 'react'

// Компактная плитка со значением и подписью. Не растягиваем — фиксированная сетка.
// Акцентный вариант красит значение акцентом (индиго/лайм), фон остаётся нейтральным.
export function StatTile({
  label,
  value,
  hint,
  accent = false,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: string
  accent?: boolean
  icon?: ReactNode
}) {
  return (
    <div className="glass rounded-card p-3.5 shadow-card">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[11.5px] leading-none">{label}</span>
      </div>
      <div
        className={`mt-1.5 text-[17px] font-bold tabular-nums leading-tight ${
          accent ? 'text-accent' : 'text-ink'
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11.5px] text-muted">{hint}</div>}
    </div>
  )
}
