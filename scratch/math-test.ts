// Проверка математики заработка/стратегии на реальных данных (2026-07-08).
import { calcMonthEarnings, calcStrategy, calcProgress } from '../src/utils/calc'
import { paydayInMonth } from '../src/utils/date'
import type { AppState } from '../src/types/models'

const state: AppState = {
  goal: { title: 'Моя цель', target: 464_000, deadline: '2027-01-18', startDate: '2026-07-01' },
  settings: {
    salaryAmount: 25_000, advanceAmount: 12_000,
    salaryDay: 5, advanceDay: 20, savingRate: 0.4,
    shiftsPerMonth: 18, tipsPerShift: 2_900,
  },
  transactions: [
    { id: 'a', kind: 'income', amount: 2_000, date: '2026-07-06', category: 'tips', counts: true, createdAt: 1 },
    { id: 'b', kind: 'expense', amount: 500, date: '2026-07-07', category: 'spending', counts: true, createdAt: 2 },
  ],
  onboarded: true,
  celebratedPct: 0,
  skazka: {
    fetchedAt: 0, shiftsPerMonth: 18, avgTips: 2_900,
    monthShifts: [
      { id: 112, date: '2026-07-04', tips: 1800 },
      { id: 117, date: '2026-07-05', tips: 3200 },
      { id: 119, date: '2026-07-06', tips: 1100 },
    ],
    monthTips: 6_100,
  },
}

const e = calcMonthEarnings(state)
const s = calcStrategy(state)
const p = calcProgress(state)

console.log('— даты выплат июля:')
console.log('  зарплата 5 июля (2026-07-05 вс → сдвиг на пт 3-е?):', paydayInMonth(5, '2026-07-08'))
console.log('  аванс 20 июля:', paydayInMonth(20, '2026-07-08'))

console.log('— заработок июля:')
for (const it of e.items) console.log(`  ${it.date} ${it.title} (${it.sub}) ${it.amount} ${it.received ? 'ПОЛУЧЕНО' : 'ожидается'}`)
console.log('  получено:', e.received, '| ожидается:', e.expected)
console.log('  отложено в июле:', e.savedThisMonth, '| доля:', (e.savedShare * 100).toFixed(1) + '%')
console.log('  требуемая доля:', (Math.min(1, s.requiredShare) * 100).toFixed(1) + '%', '| доложить:', e.topUp)

// Ассерты
const assert = (name: string, cond: boolean) => { if (!cond) { console.error('FAIL:', name); process.exit(1) } }
// 5 июля 2026 — воскресенье → выплата в пятницу 3 июля
assert('зарплата сдвинута на 3 июля', paydayInMonth(5, '2026-07-08') === '2026-07-03')
// получено = зарплата 25000 (3 июля прошло) + чай 1800+3200+1100 = 31100; аванс 20-го ещё не был
assert('получено = 31100', e.received === 31_100)
// ожидается = аванс 12000 + зарплата за июль 25000 (5 августа) = 37000
assert('ожидается = 37000', e.expected === 37_000)
// отложено = 2000 (расход мимо копилки не влияет)
assert('отложено = 2000', e.savedThisMonth === 2_000)
// доля = 2000/31100 ≈ 6.4%
assert('доля ≈ 6.4%', Math.abs(e.savedShare - 2000 / 31100) < 1e-9)
// доложить = received × requiredShare − saved
const expTopUp = Math.max(0, Math.round(31_100 * Math.min(1, s.requiredShare) - 2_000))
assert('topUp сходится', e.topUp === expTopUp)
// бюджет: потрачено = 500 (расход 'b'), свободно = 31100 − 2000 − 500 = 28600
console.log('  потрачено:', e.spentThisMonth, '| свободно:', e.free)
assert('потрачено = 500', e.spentThisMonth === 500)
assert('свободно = 28600', e.free === 31_100 - 2_000 - 500)
// зарплата за июль ожидается 5 августа (среда — без сдвига)
assert('зарплата за июль → 5 августа', e.items.some(i => i.sub.includes('июль') && i.date === '2026-08-05' && !i.received))
// стратегия: приток > 0, доля 0..1
assert('стратегия конечна', Number.isFinite(s.requiredShare) && s.requiredShare > 0)
assert('осталось = цель − отложено', p.remaining === 464_000 - 2_000)
console.log('\nALL MATH OK ✓')

// Прогноз реального срока
import { addMonths, formatMonthYear, todayISO } from '../src/utils/date'
console.log('\n— прогноз срока:')
console.log('  вердикт:', s.verdict, '| в месяц реально:', s.monthlyAchievable, '| реальный срок:', s.realisticDate, s.realisticDate && '('+formatMonthYear(s.realisticDate)+')')
// monthlyAchievable = (25000+12000+18*2900)*0.4 = 89200*0.4 = 35680
assert('monthlyAchievable = 35680', s.monthlyAchievable === Math.round((25000+12000+18*2900)*0.4))
// realisticDate = today + ceil((464000−2000)/35680) = ceil(12.95) = 13 мес
assert('realisticDate = today+13мес', s.realisticDate === addMonths(todayISO(), Math.ceil((464000-2000)/35680)))
// цель на грани при норме 40% — вердикт tight (нужно ~83% > 40%)
assert('вердикт tight', s.verdict === 'tight')
console.log('\nALL PROJECTION OK ✓')
