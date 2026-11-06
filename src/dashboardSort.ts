import type { MetricKey, Row } from './dashboardData'

export type SortKey = MetricKey | 'today_return_pct' | 'month_return_pct' | 'volatility_3m'
export type SortOrder = { key: SortKey; direction: 'asc' | 'desc' }

export const sortLabels: Record<SortKey, string> = {
  today_return_pct: '今日涨跌', month_return_pct: '本月涨跌幅',
  distance_ma250_pct: '距年线', ytd_return_pct: '今年涨跌幅',
  distance_52w_high_pct: '距52周高点', distance_52w_low_pct: '距52周低点',
  position_52w_pct: '52周内进度', volatility_3m: '近3月日均波幅',
}

export function sortValue(row: Row, key: SortKey): number | null {
  const value = key === 'volatility_3m' ? row.volatility_3m?.value : row[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function compareRows(a: Row, b: Row, sort: SortOrder): number {
  const av = sortValue(a, sort.key), bv = sortValue(b, sort.key)
  if (av === null) return bv === null ? a.code.localeCompare(b.code) : 1
  if (bv === null) return -1
  return (sort.direction === 'asc' ? av - bv : bv - av) || a.code.localeCompare(b.code)
}
