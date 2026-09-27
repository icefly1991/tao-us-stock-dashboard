import type { Page } from '@playwright/test'

export const version = '2026-09-26T04:07-04:00'
const metricKeys = ['distance_ma250_pct', 'ytd_return_pct', 'distance_52w_high_pct', 'distance_52w_low_pct', 'position_52w_pct']
export const summary = { watchlist_total: 7, today_up: 2, today_down: 2 }
const codes = ['ZZZ', 'AAA', 'DDD', 'BBB', 'CCC']
const names: Record<string, string> = { AAA: 'Alpha Inc', BBB: 'Beta Inc', CCC: 'Gamma Inc', DDD: 'Delta Inc', ZZZ: 'Zeta Inc' }
export const rsi = { period: 14, value: 40, percentile_ytd: 25, state: 'neutral', percentile_state: 'normal', sample_count: 30, sample_start: '2026-01-02', sample_end: '2026-09-25', as_of: '2026-09-25' }

export function dashboard() {
  const rows = (raw: boolean) => codes.map(code => {
    const rank = ({ AAA: raw ? 20 : 80, BBB: raw ? 90 : 10, CCC: 50 } as Record<string, number>)[code] ?? null
    return { code, name: names[code], symbol: code, asset_type: 'stock', close: raw ? 100 : 50,
      today_return_pct: 1, business: '测试业务', history_days: 300, history_available: code !== 'DDD', rsi,
      ...Object.fromEntries(metricKeys.map(key => [key, rank])) }
  })
  const collections = [['original', '持仓股', [...codes, 'SUSP', 'MISSING']], ['research', '活跃股观察列表', ['BBB', 'CCC']], ['A', 'A 档', ['BBB']], ['B', 'B 档', ['CCC']], ['C', 'C 档', []]].map(([id, label, members]) => ({
    id, label, codes: members, summaries: { adjusted: { ...summary, watchlist_total: members.length }, raw: { ...summary, watchlist_total: members.length, today_up: 1 } },
  }))
  return { source: 'test fixture', updated_at: version, data_date: '20260925', collections,
    adjustments: { adjusted: { summary, rows: rows(false) }, raw: { summary: { ...summary, today_up: 1 }, rows: rows(true) } },
    suspended: [{ code: 'SUSP', name: 'Suspended Inc', symbol: 'SUSP', note: '已核实停牌', business: '测试业务' }], errors: [] }
}

export function history(code = 'AAA', mode = 'adjusted') {
  const daily = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'].map((time, i) => ({ time, open: 48, high: 55, low: 45, close: 50, volume: i === 0 ? null : i * 100 }))
  return { code, adjustment: mode, updated_at: version, actual_start: '2026-09-22', actual_end: '2026-09-25', requested_start: '2021-09-25',
    daily, weekly: [daily[0]], metrics: { position_pct: 50, distance_high_pct: -9.09, high: 55, low: 45, close: 50 },
    rsi_history: { period: 14, complete: false, requested_start: '2024-09-25', points: daily.map((bar, i) => ({ time: bar.time, value: 37 + i })) } }
}

export function boxes() {
  const bars = Array.from({ length: 90 }, (_, i) => ({ time: new Date(Date.UTC(2026, 5, 28 + i)).toISOString().slice(0, 10), open: 49, high: 60, low: 40, close: 50, volume: i === 0 ? null : i === 1 ? 0 : i * 100, rsi_value: i === 0 ? null : 40 + i % 30 }))
  const window = (days: number) => ({ window_days: days, window_start_index: 90 - days, window_start: bars[90 - days].time, window_end: bars[89].time,
    status: 'match', reason: '测试形态', low: days === 60 ? 45 : 40, high: days === 60 ? 55 : 60,
    width_pct: days === 60 ? 22.22 : 50, inner_space_pct: 15, cycle_days: 40, round_count: 1, pending_days: 3, position_pct: 50, occupancy_pct: 80, efficiency: .5,
    trips: [], rounds: [], passed_count: 4 })
  const row = { ...window(60), code: 'AAA', name: 'Alpha Inc', business: '测试业务', bars, long_bars: bars.map(({ time, close }) => ({ time, close })), long_low: 20, long_high: 100,
    long_position_pct: 35, long_history_complete: false, long_start: bars[0].time, long_end: bars[89].time, long_history_days: 90, year_history_days: 90,
    year_return_pct: null, year_low_gain_pct: 25, short_year: true, selected_window_days: 60, selection_note: '优先近期窗口', windows: [window(60), window(90)], fundamentals: '待专项复核' }
  return { schema_version: 4, updated_at: version, data_date: '20260925', source: 'test fixture', universe: '测试活跃列表', universe_count: 3, errors: [],
    rows: [row, { ...row, code: 'BBB', name: 'Beta Inc', status: 'watch', cycle_days: null, efficiency: null }, { ...row, code: 'CRWV', name: 'Reference Inc', status: 'excluded', reason: '长期区间位置≥80%' }] }
}

export async function seed(page: Page) {
  await page.route('**/data/**', async route => {
    const url = new URL(route.request().url())
    let data: unknown
    if (url.pathname.endsWith('/dashboard.json')) data = dashboard()
    else if (url.pathname.endsWith('/boxes.json')) data = boxes()
    else if (url.pathname.endsWith('/list-review.json')) data = { last_updated: '2026-09-19' }
    else {
      const match = url.pathname.match(/history\/(adjusted|raw)\/([^/]+)\.json$/)
      if (match) data = history(match[2], match[1])
      else return route.fulfill({ status: 404 })
    }
    return route.fulfill({ json: data })
  })
}
