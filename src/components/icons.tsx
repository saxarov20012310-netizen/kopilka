import type { SVGProps } from 'react'

// Единый набор строковых SVG-иконок (currentColor) — вместо эмодзи.
// Стиль: stroke 1.8, скруглённые концы, viewBox 24.
export type IconName =
  | 'salary'
  | 'advance'
  | 'tips'
  | 'goal'
  | 'spending'
  | 'other'
  | 'wallet'

const PATHS: Record<IconName, JSX.Element> = {
  // Портфель — зарплата
  salary: (
    <>
      <rect x="3.5" y="7" width="17" height="13" rx="3" />
      <path d="M8.5 7V5.8A2.3 2.3 0 0 1 10.8 3.5h2.4a2.3 2.3 0 0 1 2.3 2.3V7" />
      <path d="M3.5 12.2h17" />
      <path d="M10.5 12.2h3v2h-3z" fill="currentColor" strokeWidth="1" />
    </>
  ),
  // Календарь с точкой — аванс
  advance: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
      <path d="M3.5 9h17M8 3v3M16 3v3" />
      <circle cx="12" cy="14.8" r="1.7" fill="currentColor" stroke="none" />
    </>
  ),
  // Искра ✦ — чаевые
  tips: (
    <path
      d="M12 3.2l2.1 6.7 6.7 2.1-6.7 2.1L12 20.8l-2.1-6.7-6.7-2.1 6.7-2.1z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinejoin="round"
    />
  ),
  // Мишень — цель / из копилки
  goal: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  // Пакет — трата
  spending: (
    <>
      <path d="M5.8 8h12.4l-.9 11a1.8 1.8 0 0 1-1.8 1.5H8.5A1.8 1.8 0 0 1 6.7 19z" />
      <path d="M9 8V6.4a3 3 0 0 1 6 0V8" />
    </>
  ),
  // Три точки — другое
  other: (
    <>
      <circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  // Кошелёк — пустое состояние
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h10A2.5 2.5 0 0 1 19 7.5" />
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.6" />
      <path d="M20.5 11.5H16a2.4 2.4 0 0 0 0 4.8h4.5" />
      <circle cx="16.2" cy="13.9" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
}

export function CategoryIcon({
  name,
  size = 20,
  ...rest
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
