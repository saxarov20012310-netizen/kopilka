import { useEffect } from 'react'
import { haptic } from '../hooks/useTelegram'

// Тексты по вехам прогресса.
const MILESTONE: Record<number, { emoji: string; title: string; sub: string }> = {
  25: { emoji: '🌱', title: 'Четверть пути!', sub: 'Копилка набрала 25% цели' },
  50: { emoji: '🔥', title: 'Половина цели!', sub: 'Ты прошёл 50% — самое сложное позади' },
  75: { emoji: '🚀', title: 'Три четверти!', sub: 'Осталось совсем немного — финиш близко' },
  100: { emoji: '🏆', title: 'Цель достигнута!', sub: 'Ты справился — можно ставить новую' },
}

/**
 * Полноэкранное празднование вехи (25/50/75/100%).
 * Появляется поверх всего, само гаснет через ~2.2с. Haptic на входе.
 */
export function Celebration({ pct, onDone }: { pct: number; onDone: () => void }) {
  const m = MILESTONE[pct] ?? MILESTONE[25]

  useEffect(() => {
    haptic.success()
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 px-8 text-center"
      style={{ background: 'rgba(12,14,28,0.82)', backdropFilter: 'blur(6px)', animation: 'fade-in 0.25s ease both' }}
    >
      {/* Разлетающиеся искры */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="absolute text-[18px]"
            style={{
              left: '50%',
              top: '42%',
              animation: `spark 1.1s cubic-bezier(0.2,0.7,0.3,1) ${s.delay}s both`,
              // @ts-expect-error CSS custom props
              '--sx': `${s.x}px`,
              '--sy': `${s.y}px`,
            }}
          >
            {s.ch}
          </span>
        ))}
      </div>

      <div className="text-[64px]" style={{ animation: 'celebratePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}>
        {m.emoji}
      </div>
      <div className="font-display text-[26px] font-semibold text-lime" style={{ animation: 'rise 0.45s 0.1s both' }}>
        {m.title}
      </div>
      <div className="max-w-[260px] text-[14px] text-[#EFF0FA]" style={{ animation: 'rise 0.45s 0.18s both' }}>
        {m.sub}
      </div>
      <div className="mt-2 text-[12px] text-[#83869E]" style={{ animation: 'rise 0.45s 0.26s both' }}>
        коснись, чтобы закрыть
      </div>
    </div>
  )
}

// Предрассчитанные искры (без Math.random — детерминированно по индексу).
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const dist = 90 + (i % 3) * 34
  return {
    ch: ['✦', '✧', '★', '•'][i % 4],
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist),
    delay: (i % 5) * 0.04,
  }
})
