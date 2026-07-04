// Форматирование денег и чисел в рублях.

const rubFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
})

const numFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })

/** 464000 → «464 000 ₽» */
export function formatRub(value: number): string {
  return rubFormatter.format(Math.round(value))
}

/** 464000 → «464 000» (без символа валюты) */
export function formatNumber(value: number): string {
  return numFormatter.format(Math.round(value))
}

/** Компактный формат для крупных сумм: 464000 → «464 тыс.» */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${numFormatter.format(Math.round(value / 1000))} тыс.`
  }
  return numFormatter.format(Math.round(value))
}

/** Парсит строку из инпута («12 000», «12000,50») в число. */
export function parseAmount(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.').replace(/[^\d.]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

/** Склонение: 1 день / 2 дня / 5 дней */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
}

export function daysWord(n: number): string {
  return plural(n, ['день', 'дня', 'дней'])
}
