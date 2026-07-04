import { useEffect, useRef, useState } from 'react'

/**
 * Круговой индикатор прогресса с плавной анимацией заливки.
 * Градиент — фирменный янтарный.
 */
export function ProgressRing({
  percent,
  size = 220,
  stroke = 16,
  children,
}: {
  percent: number
  size?: number
  stroke?: number
  children?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  const [shown, setShown] = useState(0)
  const raf = useRef<number>()

  // Плавно доводим значение до целевого при монтировании/изменении.
  useEffect(() => {
    const start = performance.now()
    const from = shown
    const to = clamped
    const dur = 700
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setShown(from + (to - from) * eased)
      if (t < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped])

  const offset = circ - (shown / 100) * circ

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="55%" stopColor="#f5b301" />
            <stop offset="100%" stopColor="#d99700" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--hairline)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}
