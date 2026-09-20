import DataFreshness from './DataFreshness'
import PageNavigation from './PageNavigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CopyStockButton, StockCopyProvider } from './StockCopy'
import { StockHistoryCode, StockHistoryProvider } from './StockHistoryPreview'
import BoxScreener from './BoxScreener'
import ListReviewNotice from './ListReviewNotice'
import RsiCell, { type RsiData } from './RsiCell'

type AdjustmentKey = 'adjusted' | 'raw'
type MetricKey =
  | 'distance_ma250_pct'
  | 'ytd_return_pct'
  | 'distance_52w_high_pct'
  | 'distance_52w_low_pct'
  | 'position_52w_pct'
type SummaryKey = 'watchlist_total' | 'today_up' | 'today_down'

type Row = {
  business?: string
  rsi?: RsiData | null
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

type DashboardData = {
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

const tabs: { id: MetricKey; label: string }[] = [
  { id: 'distance_ma250_pct', label: '距年线' },
  { id: 'ytd_return_pct', label: '今年涨跌幅' },
  { id: 'distance_52w_high_pct', label: '距52周高点' },
  { id: 'distance_52w_low_pct', label: '距52周低点' },
  { id: 'position_52w_pct', label: '52周内位置' },
]

const cards: { key: SummaryKey; label: string; note: string }[] = [
  { key: 'watchlist_total', label: '自选总数', note: '今日跟踪池' },
  { key: 'today_up', label: '今日上涨', note: '收红个股' },
  { key: 'today_down', label: '今日下跌', note: '回撤个股' },
]

const metricText: Record<MetricKey, string> = {
  distance_ma250_pct: '距年线',
  ytd_return_pct: '今年涨跌幅',
  distance_52w_high_pct: '距52周高点',
  distance_52w_low_pct: '距52周低点',
  position_52w_pct: '52周内位置',
}

const adjustmentText = { adjusted: '复权价', raw: '未复权价' }
const dashboardUrl = `${import.meta.env.BASE_URL}data/dashboard.json`

const getCollectionFromHash = () => {
  const path = window.location.hash.replace(/^#/, '')
  if (path === '/boxes') return 'boxes'
  if (path === '/research') return 'research'
  const tier = path.match(/^\/research\/([ABC])$/)?.[1]
  return tier ?? 'original'
}

const sortingNotes: Record<MetricKey, string> = {
  distance_ma250_pct: '距年线越低越靠前',
  ytd_return_pct: '年内涨跌幅越低越靠前',
  distance_52w_high_pct: '距高点回撤越深越靠前',
  distance_52w_low_pct: '距低点涨幅越小越靠前',
  position_52w_pct: '52周位置越低越靠前',
}

type MetricValue = number | null | undefined

const formatPct = (value: MetricValue) =>
  typeof value !== 'number' ? '—' : `${value > 0 ? '+' : value < 0 ? '-' : ''}${Math.abs(value).toFixed(1)}%`

const formatMetric = (metric: MetricKey, value: MetricValue) =>
  metric === 'position_52w_pct'
    ? typeof value !== 'number'
      ? '—'
      : `${value.toFixed(1)}%`
    : formatPct(value)

const getMetricTextClass = (value: MetricValue) =>
  typeof value !== 'number' ? 'text-slate-400' : value > 0 ? 'text-emerald-700' : value < 0 ? 'text-rose-600' : 'text-slate-500'

const getActiveMetricTextClass = (metric: MetricKey, value: MetricValue) =>
  metric === 'position_52w_pct'
    ? typeof value !== 'number'
      ? 'text-slate-400'
      : 'text-sky-700'
    : getMetricTextClass(value)

const getMetricBarWidth = (metric: MetricKey, value: MetricValue, maxMetric: number) => {
  if (typeof value !== 'number') return 0
  if (metric === 'position_52w_pct') return Math.min(Math.max(value, 0), 100)
  return (Math.abs(value) / maxMetric) * 100
}

const compareMetric = (a: Row, b: Row, metric: MetricKey) => {
  const aValue = a[metric]
  const bValue = b[metric]
  if (typeof aValue !== 'number') return typeof bValue !== 'number' ? 0 : 1
  if (typeof bValue !== 'number') return -1
  return aValue - bValue || a.code.localeCompare(b.code)
}

const formatClose = (row: Row) => {
  const prefix = row.asset_type === 'stock' || row.asset_type === 'etf' ? '$' : ''
  const digits = row.close < 1 ? 6 : 2
  return `${prefix}${row.close.toLocaleString('en-US', { maximumFractionDigits: digits })}`
}

const getActiveMetricCellClass = (metric: MetricKey, activeMetric: MetricKey) =>
  metric === activeMetric
    ? 'mx-auto w-[84%] rounded-[1.1rem] border border-sky-100/90 bg-[linear-gradient(180deg,rgba(249,252,255,0.98),rgba(242,248,252,0.94))] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_8px_24px_rgba(15,23,42,0.06)]'
    : 'w-full px-2 py-2'

function App() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [adjustment, setAdjustment] = useState<AdjustmentKey>('adjusted')
  const [tab, setTab] = useState<MetricKey>('distance_ma250_pct')
  const [error, setError] = useState(false)
  const [collectionId, setCollectionId] = useState(getCollectionFromHash)
  const researchPage = collectionId !== 'original'
  const headerScroll = useRef<HTMLDivElement>(null)
  const bodyScroll = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const navigate = () => {
      setCollectionId(getCollectionFromHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])

  useEffect(() => {
    document.title = `${collectionId === 'boxes' ? '箱体观察' : researchPage ? '活跃股观察列表' : '持仓股'} · Tao 美股趋势看板`
  }, [researchPage, collectionId])

  useEffect(() => {
    let mounted = true
    fetch(dashboardUrl)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json: DashboardData) => mounted && setData(json))
      .catch(() => mounted && setError(true))
    return () => {
      mounted = false
    }
  }, [])

  const current = data?.adjustments[adjustment]
  const collection = useMemo(() => data?.collections?.find((item) => item.id === collectionId), [data, collectionId])
  const summary = collection?.summaries[adjustment] ?? current?.summary
  const suspended = data?.suspended?.filter((item) => !collection || collection.codes.includes(item.code)) ?? []
  const missingCodes = collection?.codes.filter((code) => !current?.rows.some((row) => row.code === code) && !suspended.some((item) => item.code === code)) ?? []
  const rows = useMemo(
    () =>
      current
        ? current.rows.filter((row) => !collection || collection.codes.includes(row.code)).sort((a, b) => compareMetric(a, b, tab))
        : [],
    [current, collection, tab],
  )
  const maxMetric = useMemo(
    () => Math.max(...rows.map((row) => Math.abs(row[tab] ?? 0)), 1),
    [rows, tab],
  )
  const contextMetrics: MetricKey[] = tab === 'distance_ma250_pct'
    ? ['ytd_return_pct', 'distance_52w_high_pct']
    : tab === 'ytd_return_pct'
      ? ['distance_ma250_pct', 'distance_52w_high_pct']
      : tab === 'position_52w_pct'
        ? ['distance_ma250_pct', 'ytd_return_pct', 'distance_52w_low_pct']
        : ['distance_ma250_pct', 'ytd_return_pct']

  if (collectionId === 'boxes') return <BoxScreener />
  if (error || (data && !current)) return <StateView text="无法加载 /data/dashboard.json" error />
  if (!data || !current) return <StateView text="加载中..." />

  return (
    <StockCopyProvider>
    <StockHistoryProvider key={`${collectionId}:${adjustment}`}>
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.2),transparent_30%),linear-gradient(180deg,#fcfbf8_0%,#f5f1ea_58%,#f1ece5_100%)] px-4 py-6 text-slate-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(247,242,234,0.94))] p-5 shadow-[0_24px_60px_rgba(15,23,42,0.06)] sm:p-7">
          <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(191,219,254,0.32),transparent_72%)]" />
          <div className="absolute right-[-5rem] top-[-5rem] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95),rgba(255,255,255,0))]" />
          <div className="relative flex flex-col gap-5">
            <PageNavigation page={researchPage ? 'research' : 'watchlist'} />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-[11px] font-medium tracking-[0.22em] text-slate-500">DAILY MARKET SNAPSHOT</div>
                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">{researchPage ? '活跃股观察列表' : '持仓股'}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">美股常规交易时段收盘后更新，数据用于个人研究与趋势观察。</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-white/85 px-3 py-1">yfinance 日线数据</span>
                  <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">按指标排序浏览</span>
                  <span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1">支持复权价 / 未复权价</span>
                </div>
              </div>
              <DataFreshness updatedAt={data.updated_at} dataDate={data.data_date} />
            </div>

            {researchPage && <ListReviewNotice />}

            <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="grid grid-cols-2 gap-1">
                {(['adjusted', 'raw'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAdjustment(key)}
                    className={`rounded-[1.2rem] px-4 py-3 text-sm font-medium transition ${adjustment === key ? 'bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:bg-white/60'}`}
                  >
                    {adjustmentText[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.6rem] border border-slate-200/80 bg-white/65 px-4 py-3 text-sm text-slate-600">
              <div>当前口径：<span className="font-medium text-slate-900">{adjustmentText[adjustment]}</span>，下方榜单与汇总数据已同步切换。</div>
              <div className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-white">FOCUS MODE</div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {cards.map((card, index) => (
                <motion.div key={card.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + index * 0.06, duration: 0.3 }} className="rounded-[1.75rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.95))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">{summary?.[card.key]}</p>
                  <p className="mt-3 text-sm text-slate-500">{card.note}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <section data-position-view={tab === 'position_52w_pct'} className="ranking-section rounded-[2rem] border border-white/80 bg-white/80 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.05)] sm:p-6">
          {missingCodes.length > 0 && (
            <div role="status" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              暂无可用行情：{missingCodes.join('、')}。列表总数包含这些标的，涨跌统计仅含可用行情。
            </div>
          )}
          {data.errors?.length ? <p className="mb-4 text-sm text-amber-800">本次有 {data.errors.length} 条数据提示；可用标的继续展示。</p> : null}
          {researchPage && data.collections && (
            <nav aria-label="活跃股观察列表分档" className="mb-4 flex flex-wrap gap-2">
              {data.collections.filter((item) => item.id !== 'original').map((item) => (
                <a key={item.id} href={item.id === 'research' ? '#/research' : `#/research/${item.id}`}
                  aria-current={collectionId === item.id ? 'page' : undefined}
                  className={`page-link ${collectionId === item.id ? 'selected' : ''}`}>
                  {item.id === 'research' ? '全部' : item.label} · {item.codes.length}
                </a>
              ))}
            </nav>
          )}
          <p className="mb-3 px-2 text-xs text-slate-500">点击代码复制后可快速粘贴；悬停代码或点击 K 线图标查看走势。<span className="lg:hidden"> 左右滑动表格查看全部指标，股票名称保持固定。</span></p>
          <div className="ranking-sticky" data-testid="ranking-sticky">
            <div className="overflow-x-auto py-2" aria-label="指标选项">
              <div className="flex w-max gap-2">
                {tabs.map((item) => (
                  <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-pressed={tab === item.id}
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${tab === item.id ? 'border-slate-400 bg-slate-100 text-slate-950' : 'border-slate-200 bg-white text-slate-600'}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-b border-slate-200 px-2 py-3">
              <h2 className="text-lg font-semibold text-slate-950">{collection?.label ?? '自选'} · {metricText[tab]}榜单</h2>
              <p className="mt-1 text-xs text-slate-600">{adjustmentText[adjustment]} · {sortingNotes[tab]} · 缺失与停牌置后</p>
            </div>
            <div ref={headerScroll} className="ranking-header-scroll" onScroll={(event) => {
              if (bodyScroll.current) bodyScroll.current.scrollLeft = event.currentTarget.scrollLeft
            }}>
              <div className="market-grid market-header" data-testid="column-header">
                <div>#</div><div className="stock-identity text-left">标的</div><div className="business-cell">业务/板块</div><div>收盘价</div><div>今日</div>
                {contextMetrics.map((metric) => <div key={metric}>{metricText[metric]}</div>)}
                <div title="日线Wilder RSI(14)与该股票自身年内百分位">RSI(14) / 年内分位</div>
                <div className="text-sky-800">{metricText[tab]} ↑</div>
              </div>
            </div>
          </div>
          <div ref={bodyScroll} className="ranking-body-scroll" data-testid="table-scroll" onScroll={(event) => {
            if (headerScroll.current) headerScroll.current.scrollLeft = event.currentTarget.scrollLeft
          }}>
            <div className="market-body">
              {rows.map((row, index) => (
                <div key={row.code} data-code={row.code} data-metric={row[tab] ?? 'missing'} className="market-grid market-row">
                  <div className="text-xs text-slate-400">{index + 1}</div>
                  <div className="stock-identity min-w-0 text-left">
                    <span title={row.name} className="block truncate font-medium text-slate-900">{row.name}</span>
                    <StockHistoryCode code={row.code} name={row.name} updatedAt={data.updated_at} adjustment={adjustment} available={row.history_available}>
                      <CopyStockButton value={row.code} label="代码" target={`${row.code}-code`} secondary />
                    </StockHistoryCode>
                  </div>
                  <div className="business-cell">{row.business || '—'}</div>
                  <div className="font-medium text-slate-900">{formatClose(row)}</div>
                  <div className={getMetricTextClass(row.today_return_pct)}>{formatPct(row.today_return_pct)}</div>
                  {contextMetrics.map((metric) => <div key={metric} className={getMetricTextClass(row[metric])}>{formatMetric(metric, row[metric])}</div>)}
                  <RsiCell key={`${row.code}/${adjustment}/${data.updated_at}`} rsi={row.rsi} stock={{ code: row.code, name: row.name, adjustment, updatedAt: data.updated_at }} />
                  <div>
                    <div className={getActiveMetricCellClass(tab, tab)}>
                      <span className={getActiveMetricTextClass(tab, row[tab])}>{formatMetric(tab, row[tab])}</span>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${tab === 'position_52w_pct' ? 'bg-sky-400' : (row[tab] ?? 0) >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                          style={{ width: `${getMetricBarWidth(tab, row[tab], maxMetric)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {rows.length === 0 && <p className="p-4 text-sm text-slate-500">当前列表暂无可用行情。</p>}
              {suspended.map((item) => (
                <div key={item.code} data-trading-status="suspended" className="market-grid market-row text-slate-400">
                  <div>—</div>
                  <div className="stock-identity text-left">
                    <span title={item.name} className="block truncate font-medium text-slate-900">{item.name}</span>
                    <CopyStockButton value={item.code} label="代码" target={`${item.code}-code`} secondary />
                    <span className="mt-2 inline-block rounded bg-slate-200 px-2 py-1 text-xs text-slate-600">停牌</span>
                    {item.note && <p className="mt-1 text-xs">{item.note}</p>}
                  </div>
                  <div className="business-cell">{item.business || '—'}</div>
                  {Array.from({ length: contextMetrics.length + 4 }, (_, column) => column).map((column) => <div key={column}>—</div>)}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
    </StockHistoryProvider>
    </StockCopyProvider>
  )
}

function StateView({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fcfbf8_0%,#f5f1ea_100%)] px-4">
      <div className={`rounded-[1.6rem] border px-5 py-4 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.05)] ${error ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-600'}`}>{text}</div>
    </main>
  )
}

export default App
