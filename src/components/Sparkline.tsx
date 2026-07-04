// Мини-график динамики баланса. Лёгкий SVG без зависимостей.
export function Sparkline({
  points,
  height = 64,
  className = '',
}: {
  points: number[]
  height?: number
  className?: string
}) {
  if (points.length < 2) {
    return (
      <div
        className={`grid place-items-center text-xs text-ink-muted ${className}`}
        style={{ height }}
      >
        Пока мало данных для графика
      </div>
    )
  }

  const w = 320
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const stepX = w / (points.length - 1)
  const y = (v: number) => height - ((v - min) / span) * (height - 8) - 4
  const coords = points.map((v, i) => [i * stepX, y(v)] as const)

  const line = coords.map(([x, yy], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yy.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${height} L0,${height} Z`

  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5b301" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#f5b301" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkFill)" />
      <path d={line} fill="none" stroke="#f5b301" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={coords[coords.length - 1][0]} cy={coords[coords.length - 1][1]} r={3.5} fill="#d99700" />
    </svg>
  )
}
