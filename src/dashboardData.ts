import type { RsiData } from './RsiCell'

export type AdjustmentKey = 'adjusted' | 'raw'
export type MetricKey =
  | 'distance_ma250_pct'
  | 'ytd_return_pct'
  | 'distance_52w_high_pct'
  | 'distance_52w_low_pct'
  | 'position_52w_pct'
export type SummaryKey = 'watchlist_total' | 'today_up' | 'today_down'
export type VolatilityData = { value: number | null; window_start: string; window_end: string; sample_count: number; status: 'available' | 'insufficient' | 'invalid' }

export type Row = {
  business?: string
  rsi?: RsiData | null
  volatility_3m?: VolatilityData | null
  code: string
  name: string
  symbol: string
  asset_type: 'stock' | 'etf' | 'index' | 'crypto'
  close: number
  today_return_pct: number
  distance_ma250_pct: number | null
  ytd_return_pct: number | null
  distance_52w_high_pct: number | null
  distance_52w_low_pct: number | null
  position_52w_pct: number | null
  history_days: number
  history_available?: boolean
}

export type DashboardData = {
  source: string
  updated_at: string
  data_date: string | null
  suspended?: { code: string; name: string; business?: string; symbol: string; note: string }[]
  collections?: {
    id: string
    label: string
    codes: string[]
    summaries: Record<AdjustmentKey, Record<SummaryKey, number>>
  }[]
  adjustments: Record<AdjustmentKey, { summary: Record<SummaryKey, number>; rows: Row[] }>
  errors?: { code: string; name: string; error: string }[]
}

