import { calcMonthPace } from '../src/utils/calc.ts'
// today контекст: сессия считает 2026-07-хх. Возьмём цель с известными числами.
const state = {
  goals: [{ id:'g1', title:'Мечта', target:464000, deadline:'2027-01-18', startDate:'2026-07-01', celebratedPct:0 }],
  activeGoalId:'g1',
  settings:{ salaryAmount:25000, advanceAmount:12000, salaryDay:5, advanceDay:20, savingRate:0.4, shiftsPerMonth:18, tipsPerShift:2900 },
  transactions:[
    // отложено в этом месяце в g1
    { id:'a', kind:'income', amount:8000, date:'2026-07-06', category:'other', counts:true, createdAt:1, goalId:'g1' },
    // прошлый месяц — не считается в saved текущего месяца
    { id:'b', kind:'income', amount:5000, date:'2026-06-20', category:'other', counts:true, createdAt:2, goalId:'g1' },
    // другая цель — не считается
    { id:'c', kind:'income', amount:9000, date:'2026-07-07', category:'other', counts:true, createdAt:3, goalId:'g2' },
  ],
  onboarded:true, skazka:null,
}
const mp = calcMonthPace(state)
console.log(JSON.stringify(mp, null, 2))
const A=(n,c)=>{if(!c){console.error('FAIL',n);process.exit(1)}}
// saved в этом месяце по g1 = 8000 (b — прошлый месяц, c — другая цель)
A('saved=8000', mp.saved===8000)
// needed = remaining*30/daysLeft; saved всего g1 (this+prev months) = 8000+5000=13000 → remaining=451000
// needed = 451000*30/daysToDeadline (изменчиво по «сегодня»), проверим что >0 и remaining=needed-8000
A('needed>0', mp.needed>0)
A('remaining=needed-saved', mp.remaining===Math.max(0,mp.needed-8000))
A('perDay*daysLeft>=remaining', mp.perDay*mp.daysLeft>=mp.remaining)
A('percent 0..100', mp.percent>=0 && mp.percent<=100)
A('monthName июле', mp.monthName==='июле')
console.log('\nMONTHPACE OK ✓ (needed='+mp.needed+', remaining='+mp.remaining+', perDay='+mp.perDay+', daysLeft='+mp.daysLeft+')')
