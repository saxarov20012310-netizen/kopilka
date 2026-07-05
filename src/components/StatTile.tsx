import type { ReactNode } from 'react'

// Компактная плитка со значением и подписью. Не растягиваем — фиксированная сетка.
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
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? 'border-brand-200 bg-brand-50 text-ink dark:border-brand-400/30 dark:bg-brand-400/15'
          : 'border-hairline bg-surface-2'
      }`}
    >
      <div className="flex items-center gap-1.5 text-ink-muted">
        {icon}
        <span className="text-[13px] leading-none">{label}</span>
      </div>
      <div className="mt-2 text-[19px] font-bold tabular leading-tight">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-ink-muted">{hint}</div>}
    </div>
  )
}
