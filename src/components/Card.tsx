import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-3xl border border-hairline bg-surface shadow-card ${onClick ? 'press cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
