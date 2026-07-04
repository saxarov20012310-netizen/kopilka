import type { Progress } from '../utils/calc'
import { formatRub, daysWord } from '../utils/format'

// Короткий мотивационный текст, зависит от прогресса. Без перегруза.
export function Motivation({ progress }: { progress: Progress }) {
  const msg = pickMessage(progress)
  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 p-4 text-[15px] font-medium leading-snug text-white shadow-float">
      {msg}
    </div>
  )
}

function pickMessage(p: Progress): string {
  if (p.reached) return '🎉 Цель достигнута! Вы справились — можно ставить новую.'
  if (p.overdue) return 'Дедлайн прошёл, но цель рядом. Обновите срок в настройках и добивайте остаток.'
  if (p.percent < 10) return 'Отличный старт. Первые взносы — самые важные: копилка уже работает.'
  if (p.percent < 40) return `Уже ${Math.round(p.percent)}%. Каждый взнос приближает вас к цели — держите темп.`
  if (p.percent < 75)
    return `Больше половины пути! Осталось ${formatRub(p.remaining)} за ${p.daysLeft} ${daysWord(
      p.daysLeft
    )}.`
  return `Финишная прямая — всего ${formatRub(p.remaining)} до цели. Не сбавляйте темп!`
}
