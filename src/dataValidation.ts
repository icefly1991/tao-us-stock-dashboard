import type { DashboardData } from './dashboardData'

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const text = (value: unknown): value is string => typeof value === 'string'
const nullable = (value: unknown) => value === null || finite(value)
const summary = (value: unknown) => record(value) && ['watchlist_total', 'today_up', 'today_down'].every(key => Number.isInteger(value[key]) && Number(value[key]) >= 0)
const uniqueCodes = (items: Record<string, unknown>[]) => new Set(items.map(item => item.code)).size === items.length
const errors = (value: unknown) => Array.isArray(value) && value.every(item => record(item) && text(item.code) && text(item.error))

function rsi(value: unknown): boolean {
  if (value == null) return true
  return record(value) && value.period === 14 && nullable(value.value) && nullable(value.percentile_ytd) &&
    text(value.state) && ['oversold', 'neutral', 'overbought', 'unavailable'].includes(value.state) &&
    text(value.percentile_state) && ['low', 'high', 'normal', 'insufficient', 'unavailable'].includes(value.percentile_state) &&
    finite(value.sample_count)
}

export function isDashboardData(value: unknown): value is DashboardData {
  if (!record(value) || !text(value.updated_at) || !text(value.source) || !(value.data_date === null || text(value.data_date)) || !record(value.adjustments)) return false
  for (const mode of ['adjusted', 'raw']) {
    const current = value.adjustments[mode]
    if (!record(current) || !summary(current.summary) || !Array.isArray(current.rows)) return false
    if (!current.rows.every(row => record(row) && text(row.code) && text(row.name) && text(row.symbol) &&
      ['stock', 'etf', 'index', 'crypto'].includes(String(row.asset_type)) && finite(row.close) && finite(row.today_return_pct) &&
      ['distance_ma250_pct', 'ytd_return_pct', 'distance_52w_high_pct', 'distance_52w_low_pct', 'position_52w_pct'].every(key => nullable(row[key])) &&
      (row.business === undefined || text(row.business)) && rsi(row.rsi)) || !uniqueCodes(current.rows)) return false
  }
  if (value.collections !== undefined && (!Array.isArray(value.collections) || !value.collections.every(item =>
    record(item) && text(item.id) && text(item.label) && Array.isArray(item.codes) && item.codes.every(text) &&
    new Set(item.codes).size === item.codes.length && record(item.summaries) && summary(item.summaries.adjusted) && summary(item.summaries.raw)))) return false
  if (Array.isArray(value.collections) && new Set(value.collections.map(item => item.id)).size !== value.collections.length) return false
  if (value.suspended !== undefined && (!Array.isArray(value.suspended) || !value.suspended.every(item =>
    record(item) && text(item.code) && text(item.name) && text(item.symbol) && text(item.note) && (item.business === undefined || text(item.business))))) return false
  return value.errors === undefined || errors(value.errors)
}

// Reject malformed scans before chart rendering can dereference their indices.
export function isBoxScan(value: unknown): boolean {
  if (!record(value) || value.schema_version !== 4 || !text(value.updated_at) || !text(value.data_date) ||
    !finite(value.universe_count) || !Array.isArray(value.rows) || !errors(value.errors)) return false
  const statuses = ['match', 'watch', 'rejected', 'slow', 'broken', 'breakout', 'outside', 'insufficient', 'excluded']
  const validWindow = (window: unknown, size: number) => {
    if (!record(window) || !statuses.includes(String(window.status)) || !text(window.reason)) return false
    const numbers = ['window_days', 'window_start_index', 'low', 'high', 'width_pct', 'inner_space_pct', 'position_pct', 'occupancy_pct', 'up_days', 'down_days', 'cycle_days', 'latest_cycle_days', 'round_count', 'pending_days', 'efficiency', 'passed_count']
    if (!numbers.every(key => window[key] == null || finite(window[key]))) return false
    if (window.window_start_index != null && (!Number.isInteger(window.window_start_index) || Number(window.window_start_index) < 0 || Number(window.window_start_index) >= size)) return false
    if (window.trips !== undefined && (!Array.isArray(window.trips) || !window.trips.every(trip => record(trip) &&
      ['start_index', 'end_index'].every(key => Number.isInteger(trip[key]) && Number(trip[key]) >= 0 && Number(trip[key]) < size) && finite(trip.days) && nullable(trip.return_pct)))) return false
    if (window.rounds !== undefined && (!Array.isArray(window.rounds) || !window.rounds.every(round => record(round) &&
      finite(round.calendar_days) && finite(round.trading_days) && Array.isArray(round.turns) && round.turns.every(turn => record(turn) && text(turn.time) && text(turn.side))))) return false
    return true
  }
  return value.rows.every(row => record(row) && text(row.code) && text(row.name) && Array.isArray(row.bars) && row.bars.length > 0 &&
    row.bars.every(bar => record(bar) && text(bar.time) && ['open', 'high', 'low', 'close'].every(key => finite(bar[key])) &&
      (bar.volume == null || finite(bar.volume)) && (bar.rsi_value == null || finite(bar.rsi_value))) &&
    Array.isArray(row.long_bars) && row.long_bars.every(bar => record(bar) && text(bar.time) && finite(bar.close)) &&
    ['long_low', 'long_high', 'long_position_pct', 'year_return_pct', 'year_low_gain_pct'].every(key => row[key] == null || finite(row[key])) &&
    validWindow(row, row.bars.length) && (row.windows === undefined || (Array.isArray(row.windows) && row.windows.every(window => validWindow(window, (row.bars as unknown[]).length))))) && uniqueCodes(value.rows)
}
