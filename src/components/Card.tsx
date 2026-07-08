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
      className={`glass rounded-lg2 shadow-card ${onClick ? 'press cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
