export const PRICE_MAX_AGE_DAYS = 60

export function newYorkDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const part = (type: string) => parts.find(value => value.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function priceDateState(value?: string | null, today = newYorkDate()): 'current' | 'expired' | 'unknown' {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'unknown'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== value || value > today) return 'unknown'
  const age = (Date.parse(today) - timestamp) / 86400000
  return age <= PRICE_MAX_AGE_DAYS ? 'current' : 'expired'
}
