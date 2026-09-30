import { GovernanceBadge, GovernanceFilter } from './GovernanceReview'
import { useGovernance, matchesGovernance } from './governanceData'
import VolatilityCell from './VolatilityCell'
import DataFreshness from './DataFreshness'
import PageNavigation from './PageNavigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CopyStockButton, StockCopyProvider } from './StockCopy'
import { StockHistoryCode, StockHistoryProvider } from './StockHistoryPreview'
import BoxScreener from './BoxScreener'
import ListReviewNotice from './ListReviewNotice'
import WeeklyResearchNotice from './WeeklyResearchNotice'
import { useWeeklyResearch } from './weeklyResearch'
import RsiCell from './RsiCell'
import { FundamentalBadge, FundamentalPhrases, PoolFilter } from './PoolReview'
import { usePoolReview, matchesPoolReview } from './poolReviewData'
import { isDashboardData } from './dataValidation'
import type { AdjustmentKey, MetricKey, SummaryKey, Row, DashboardData } from './dashboardData'

const tabs: { id: MetricKey; label: string }[] = [
  { id: 'position_52w_pct', label: '52周内进度' },
  { id: 'distance_ma250_pct', label: '距年线' },
  { id: 'ytd_return_pct', label: '今年涨跌幅' },
  { id: 'distance_52w_high_pct', label: '距52周高点' },
  { id: 'distance_52w_low_pct', label: '距52周低点' },
]

const cards: { key: SummaryKey; label: string }[] = [
  { key: 'watchlist_total', label: '自选总数' },
  { key: 'today_up', label: '今日上涨' },
  { key: 'today_down', label: '今日下跌' },
]

const metricText: Record<MetricKey, string> = {
  distance_ma250_pct: '距年线',
  ytd_return_pct: '今年涨跌幅',
  distance_52w_high_pct: '距52周高点',
  distance_52w_low_pct: '距52周低点',
  position_52w_pct: '52周内进度',
}

const adjustmentText = { adjusted: '复权价', raw: '未复权价' }
const dashboardUrl = `${import.meta.env.BASE_URL}data/dashboard.json`

const getCollectionFromHash = () => {
  const path = window.location.hash.replace(/^#/, '')
  if (path === '/boxes') return 'boxes'
  if (path === '/pool') return 'pool'
  if (path === '/pool-boxes') return 'pool-boxes'
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
  if (typeof aValue !== 'number') return typeof bValue !== 'number' ? a.code.localeCompare(b.code) : 1
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
  const [tab, setTab] = useState<MetricKey>('position_52w_pct')
  const [volatilitySort, setVolatilitySort] = useState(false)
  const [error, setError] = useState(false)
  const [collectionId, setCollectionId] = useState(getCollectionFromHash)
  const poolPage = collectionId === 'pool'
  const poolReview = usePoolReview(poolPage)
  const governance = useGovernance()
  const weekly = useWeeklyResearch()
  const [riskFilter, setRiskFilter] = useState('all')
  const [grade, setGrade] = useState('all')
  const [category, setCategory] = useState('all')
  const researchPage = collectionId !== 'original'
  const headerScroll = useRef<HTMLDivElement>(null)
  const bodyScroll = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const navigate = () => {
      setCollectionId(getCollectionFromHash())
      setTab('position_52w_pct')
      setVolatilitySort(false)
      setGrade('all')
      setCategory('all')
      setRiskFilter('all')
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])

  useEffect(() => {
    document.title = `${collectionId === 'pool-boxes' ? '高风险公司箱体研究' : poolPage ? '高风险公司股票池' : collectionId === 'boxes' ? '箱体观察' : researchPage ? '活跃股观察列表' : '持仓股'} · Tao 美股趋势看板`
  }, [researchPage, collectionId, poolPage])

  useEffect(() => {
    let mounted = true
    fetch(dashboardUrl)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json: unknown) => {
        if (!isDashboardData(json)) throw new Error('invalid dashboard')
        if (mounted) setData(json)
      })
      .catch(() => mounted && setError(true))
    return () => {
      mounted = false
    }
  }, [])

  const current = data?.adjustments[adjustment]
  const collection = useMemo(() => data?.collections?.find((item) => item.id === collectionId), [data, collectionId])
  const summary = collection?.summaries[adjustment] ?? current?.summary
  const suspended = data?.suspended?.filter((item) => (!collection || collection.codes.includes(item.code)) && matchesGovernance(governance.data?.rows.find(row => row.code === item.code), riskFilter)) ?? []
  const missingCodes = collection?.codes.filter((code) => !current?.rows.some((row) => row.code === code) && !data?.suspended?.some((item) => item.code === code)) ?? []
  const rows = useMemo(
    () =>
      current
        ? current.rows.filter((row) => matchesGovernance(governance.data?.rows.find(item => item.code === row.code), riskFilter) && (!collection || collection.codes.includes(row.code)) && (!poolPage || matchesPoolReview(poolReview.data?.rows.find(item => item.code === row.code), grade, category))).sort((a, b) => {
          if (!volatilitySort) return compareMetric(a, b, tab)
          const av = a.volatility_3m?.value, bv = b.volatility_3m?.value
          if (av == null) return bv == null ? a.code.localeCompare(b.code) : 1
          if (bv == null) return -1
          return bv - av || a.code.localeCompare(b.code)
        })
        : [],
    [current, collection, tab, poolPage, grade, category, poolReview.data, volatilitySort, governance.data, riskFilter],
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
  if (collectionId === 'pool-boxes') return <BoxScreener key="pool-boxes" pool />
  if (error || (data && !current)) return <StateView text="行情暂不可用，请刷新重试。" error />
  if (data && !collection && (researchPage || data.collections)) return <StateView text="当前列表数据缺失，请刷新重试。" error />
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
            <PageNavigation page={poolPage ? 'pool' : researchPage ? 'research' : 'watchlist'} />
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{poolPage ? '高风险公司股票池' : researchPage ? '活跃股观察列表' : '持仓股'}</h1>
                <p className="mt-2 text-xs text-slate-500">{poolPage ? '经营困境与潜在反转跟踪 · yfinance 日线' : 'yfinance 日线 · 仅供研究'}</p>
              </div>
              <DataFreshness updatedAt={data.updated_at} dataDate={data.data_date} />
            </div>

            {researchPage && !poolPage && <ListReviewNotice />}

            <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="grid grid-cols-2 gap-1">
                {(['adjusted', 'raw'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={adjustment === key}
                    onClick={() => setAdjustment(key)}
                    className={`rounded-[1.2rem] px-4 py-3 text-sm font-medium transition ${adjustment === key ? 'bg-white text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:bg-white/60'}`}
                  >
                    {adjustmentText[key]}
                  </button>
                ))}
              </div>
            </div>


            <div className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="列表概况">
              {cards.map((card, index) => (
                <motion.div key={card.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + index * 0.06, duration: 0.3 }} className="rounded-[1.75rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,245,239,0.95))] p-3 sm:p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight text-slate-950">{summary?.[card.key]}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        <section data-pool={poolPage} data-position-view={tab === 'position_52w_pct'} className="ranking-section rounded-[2rem] border border-white/80 bg-white/80 p-3 shadow-[0_24px_60px_rgba(15,23,42,0.05)] sm:p-6">
          {poolPage && <PoolFilter review={poolReview.data} error={poolReview.error} value={grade} onChange={setGrade} category={category} onCategoryChange={setCategory} />}
          {missingCodes.length > 0 && (
            <div role="status" className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              暂无可用行情：{missingCodes.join('、')}。列表总数包含这些标的，涨跌统计仅含可用行情。
            </div>
          )}
          {data.errors?.length ? <p className="mb-4 text-sm text-amber-800">本次有 {data.errors.length} 条数据提示；可用标的继续展示。</p> : null}
          <GovernanceFilter value={riskFilter} onChange={setRiskFilter} date={governance.data?.reviewed_at} error={governance.error} />
          <WeeklyResearchNotice pool={poolPage} data={weekly.data} error={weekly.error} />
          {researchPage && !poolPage && data.collections && (
            <nav aria-label="活跃股观察列表分档" className="mb-4 flex flex-wrap gap-2">
              {data.collections.filter((item) => ['research', 'A', 'B', 'C'].includes(item.id)).map((item) => (
                <a key={item.id} href={item.id === 'research' ? '#/research' : `#/research/${item.id}`}
                  aria-current={collectionId === item.id ? 'page' : undefined}
                  className={`page-link ${collectionId === item.id ? 'selected' : ''}`}>
                  {item.id === 'research' ? '全部' : item.label} · {item.codes.length}
                </a>
              ))}
            </nav>
          )}
          <details className="page-help mb-3">
            <summary>使用说明与选股标准</summary>
            <p>点击代码复制；悬停代码或点图标看 K 线，点 RSI 看走势。手机可左右滑动表格。</p>
            <p>指标升序，缺失与停牌置后；52周内进度是价格在52周高低区间的位置。</p>
            <a href="https://github.com/icefly1991/tao-us-stock-dashboard/blob/main/docs/LIST_REVIEW.md" target="_blank" rel="noreferrer">选股标准</a>
            <a href="https://github.com/icefly1991/tao-us-stock-dashboard/blob/main/docs/METRIC_DEFINITIONS.md" target="_blank" rel="noreferrer">指标定义</a>
          </details>
          <div className="ranking-sticky" data-testid="ranking-sticky">
            <div className="overflow-x-auto py-2" aria-label="指标选项">
              <div className="flex w-max gap-2">
                {tabs.map((item) => (
                  <button key={item.id} type="button" onClick={() => { setTab(item.id); setVolatilitySort(false) }} aria-pressed={tab === item.id && !volatilitySort}
                    className={`rounded-full border px-4 py-2 text-sm font-medium ${tab === item.id && !volatilitySort ? 'border-slate-400 bg-slate-100 text-slate-950' : 'border-slate-200 bg-white text-slate-600'}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-b border-slate-200 px-2 py-3">
              <h2 className="text-lg font-semibold text-slate-950">{collection?.label ?? '自选'} · {volatilitySort ? '近3月日均波幅' : metricText[tab]}榜单</h2>
              <p className="mt-1 text-xs text-slate-600">{adjustmentText[adjustment]} · {volatilitySort ? '日均波幅越大越靠前' : sortingNotes[tab]} · 缺失与停牌置后</p>
            </div>
            <div ref={headerScroll} className="ranking-header-scroll" onScroll={(event) => {
              if (bodyScroll.current) bodyScroll.current.scrollLeft = event.currentTarget.scrollLeft
            }}>
              <div className="market-grid market-header" data-testid="column-header">
                <div>#</div><div className="stock-identity text-left">标的</div><div className="business-cell">业务/板块</div>{poolPage && <><div className="fundamental-column-heading">基本面亮点</div><div className="fundamental-column-heading">基本面风险</div></>}<div>收盘价</div><div>今日</div>
                {contextMetrics.map((metric) => <div key={metric}>{metricText[metric]}</div>)}
                <div><button className="volatility-sort" aria-pressed={volatilitySort} onClick={() => setVolatilitySort(value => !value)} title="近三个自然月日均真实波幅百分比，含跳空；点击按波动从大到小排序">近3月日均波幅{volatilitySort ? ' ↓' : ' ↕'}</button></div>
                <div title="日线Wilder RSI(14)与该股票自身年内百分位">RSI(14) / 年内分位</div>
                <div className="text-sky-800">{metricText[tab]}{volatilitySort ? '' : ' ↑'}</div>
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
                    <GovernanceBadge row={governance.data?.rows.find(item => item.code === row.code)} reviewedAt={governance.data?.reviewed_at} weekly={weekly.data?.company_rows.find(item => item.code === row.code)} />
                  </div>
                  <div className="business-cell">{row.business || '—'}{poolPage && <FundamentalBadge assessment={poolReview.data?.rows.find(item => item.code === row.code)} weekly={weekly.data?.pool_rows.find(item => item.code === row.code)} />}</div>
                  {poolPage && <><FundamentalPhrases assessment={poolReview.data?.rows.find(item => item.code === row.code)} kind="highlights" /><FundamentalPhrases assessment={poolReview.data?.rows.find(item => item.code === row.code)} kind="risks" /></>}
                  <div className="font-medium text-slate-900">{formatClose(row)}</div>
                  <div className={getMetricTextClass(row.today_return_pct)}>{formatPct(row.today_return_pct)}</div>
                  {contextMetrics.map((metric) => <div key={metric} className={getMetricTextClass(row[metric])}>{formatMetric(metric, row[metric])}</div>)}
                  <div><VolatilityCell value={row.volatility_3m} /></div>
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
                    <GovernanceBadge row={governance.data?.rows.find(row => row.code === item.code)} reviewedAt={governance.data?.reviewed_at} weekly={weekly.data?.company_rows.find(row => row.code === item.code)} />
                  </div>
                  <div className="business-cell">{item.business || '—'}</div>{poolPage && <><FundamentalPhrases assessment={poolReview.data?.rows.find(row => row.code === item.code)} kind="highlights" /><FundamentalPhrases assessment={poolReview.data?.rows.find(row => row.code === item.code)} kind="risks" /></>}
                  {Array.from({ length: contextMetrics.length + 5 }, (_, column) => column).map((column) => <div key={column}>—</div>)}
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
  const id = getCollectionFromHash()
  const page = id === 'original' ? 'watchlist' : id === 'pool' ? 'pool' : 'research'
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#fcfbf8_0%,#f5f1ea_100%)] px-4">
      <div className="space-y-4"><PageNavigation page={page} /><div role={error ? 'alert' : 'status'} className={`rounded-[1.6rem] border px-5 py-4 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.05)] ${error ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white text-slate-600'}`}>{text}{error && <button className="ml-3 underline" onClick={() => window.location.reload()}>刷新</button>}</div></div>
    </main>
  )
}

export default App
