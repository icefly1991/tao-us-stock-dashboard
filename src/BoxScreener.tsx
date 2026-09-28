import DataFreshness from './DataFreshness'
import PageNavigation from './PageNavigation'
import { GovernanceBadge } from './GovernanceReview'
import { useGovernance } from './governanceData'
import VolatilityCell from './VolatilityCell'
import type { VolatilityData } from './dashboardData'
import { FundamentalBadge, FundamentalSummary, PoolFilter } from './PoolReview'
import { usePoolReview, matchesPoolReview } from './poolReviewData'
import { useEffect, useMemo, useState } from 'react'
import ListReviewNotice from './ListReviewNotice'
import { isBoxScan } from './dataValidation'

type Bar = { time: string; open: number; high: number; low: number; close: number; volume?: number | null; rsi_value?: number | null }
type Trip = { direction: string; start: string; end: string; start_index: number; end_index: number; days: number; return_pct: number }
type Round = { start: string; end: string; turns: { time: string; side: string; index: number }[]; calendar_days: number; trading_days: number }
type WindowBox = {
  window_days: number; status: string; reason: string; low?: number; high?: number
  width_pct?: number; inner_space_pct?: number; position_pct?: number; occupancy_pct?: number
  up_days?: number | null; down_days?: number | null; up_count?: number; down_count?: number
  window_start?: string; window_end?: string; trips?: Trip[]; rounds?: Round[]
  passed_count?: number; pending_completed_legs?: number; third_leg_progress_pct?: number | null
  window_start_index?: number; cycle_days?: number | null; latest_cycle_days?: number | null
  round_count?: number; pending_days?: number | null; pending_start?: string | null
  pending_phase?: string | null; maturity?: string; speed_band?: string; efficiency?: number | null
  shape_status?: string; shape_reason?: string
}
type Box = WindowBox & {
  volatility_3m?: VolatilityData | null; business?: string
  code: string; name: string; fundamentals: string; bars: Bar[]; short_year?: boolean
  long_position_pct?: number; year_return_pct?: number; year_low_gain_pct?: number
  long_start?: string; long_end?: string; long_history_days?: number; long_history_complete?: boolean
  long_low?: number; long_high?: number; year_history_days?: number
  long_bars: { time: string; close: number }[]; windows?: WindowBox[]
  selected_window_days?: number; selection_note?: string; contracting?: boolean
  prior_box?: { window_days: number; low: number; high: number; width_pct: number } | null
}

type Scan = { schema_version: number; updated_at: string; data_date: string; source: string; universe: string; universe_count: number; rows: Box[]; errors: { code: string; error: string }[] }
const statusLabels: Record<string, string> = { match: '已验证', watch: '待观察', rejected: '未成箱体', slow: '平均周期过长', broken: '下破箱体', breakout: '向上突破', outside: '暂时越界', insufficient: '历史不足', excluded: '高位 / 暴涨排除' }
const statusOrder: Record<string, number> = { match: 0, watch: 1, outside: 2, breakout: 3, broken: 4, rejected: 5, insufficient: 6, slow: 7, excluded: 8 }
const volumeText = (value?: number | null) => value == null ? '—' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value) + ' 股'
const number = (value?: number | null, suffix = '', digits = 1) => value == null ? '—' : `${value.toFixed(digits)}${suffix}`

function BoxChart({ row }: { row: Box }) {
  const [hover, setHover] = useState<number | null>(null)
  const [showYear, setShowYear] = useState(false)
  const offset = showYear ? 0 : row.window_start_index ?? 0
  const bars = row.bars.slice(offset)
  if (!bars.length) return <p>暂无图表数据</p>
  const floor = Math.min(...bars.map(bar => bar.low), row.low ?? Infinity) * .96
  const ceiling = Math.max(...bars.map(bar => bar.high), row.high ?? 0) * 1.04
  const y = (price: number) => 310 - (price - floor) / (ceiling - floor) * 280
  const step = 864 / Math.max(1, bars.length - 1)
  const x = (index: number) => 56 + index * step
  const windowStart = (row.window_start_index ?? 0) - offset
  const selectedIndex = Math.min(hover ?? bars.length - 1, bars.length - 1)
  const selected = bars[selectedIndex]
  const peakVolume = Math.max(0, ...bars.map(bar => bar.volume ?? 0))
  const maxVolume = Math.max(1, peakVolume)
  const rsiY = (value: number) => 515 + (100 - value) * 1.1
  const rsiPath = bars.map((bar, i) => {
    if (bar.rsi_value == null) return ''
    const command = bars[i - 1]?.rsi_value != null ? 'L' : 'M'
    return `${command}${x(i)},${rsiY(bar.rsi_value)}`
  }).join(' ')
  const selectAt = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const index = Math.round(((event.clientX - bounds.left) / bounds.width * 980 - 56) / step)
    setHover(Math.max(0, Math.min(bars.length - 1, index)))
  }
  return <>
    {row.window_days < row.bars.length && <div className="box-chart-range" aria-label="日线显示范围"><button aria-pressed={!showYear} onClick={() => setShowYear(false)}>近期{row.window_days}日窗口</button><button aria-pressed={showYear} onClick={() => setShowYear(true)}>最近一年背景</button></div>}
    <div className="box-chart-caption"><span data-testid="box-chart-date">{selected.time}</span><span>开 {number(selected.open, '', 2)} · 高 {number(selected.high, '', 2)} · 低 {number(selected.low, '', 2)} · 收 {number(selected.close, '', 2)}</span><span data-testid="box-chart-volume">成交量 {volumeText(selected.volume)}</span><span data-testid="box-chart-rsi">RSI(14) {number(selected.rsi_value)}{selected.rsi_value == null ? '' : selected.rsi_value <= 30 ? ' · 超卖' : selected.rsi_value >= 70 ? ' · 超买' : ' · 中性'}</span></div>
    <div className="box-chart-scroll">
      <svg className="box-chart" viewBox="0 0 980 690" role="img" aria-label={`${row.code} 复权日K线、固定箱体和穿越轨迹`} tabIndex={0} onPointerMove={selectAt} onPointerDown={selectAt} onPointerLeave={event => { if (event.pointerType === 'mouse') setHover(null) }}
        onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setHover(Math.max(0, Math.min(bars.length - 1, selectedIndex + (event.key === 'ArrowLeft' ? -1 : 1)))) } }}>
        {[0, 1, 2, 3, 4].map(tick => {
          const price = floor + (ceiling - floor) * tick / 4
          return <g key={tick}><line x1="52" x2="925" y1={y(price)} y2={y(price)} stroke="#e2e8f0" /><text x="8" y={y(price) + 4} fill="#64748b" fontSize="11">{number(price)}</text></g>
        })}
        {row.low != null && row.high != null && <>
          <rect x={x(windowStart) - 4} y={y(row.high)} width={x(bars.length - 1) - x(windowStart) + 8} height={y(row.low) - y(row.high)} fill="#e0f2fe" opacity=".75" />
          {[row.low, row.high].map((price, index) => <g key={index}><line x1="52" x2="925" y1={y(price)} y2={y(price)} stroke="#0284c7" strokeDasharray="5 4" /><text x="928" y={y(price) + 4} fill="#0369a1" fontSize="11">{number(price)}</text></g>)}
          <line x1={x(windowStart) - 4} x2={x(windowStart) - 4} y1="20" y2="315" stroke="#94a3b8" strokeDasharray="3 4" />
        </>}
        {bars.map((bar, i) => <g key={bar.time} onMouseEnter={() => setHover(i)}>
          <rect x={x(i) - step / 2} y="20" width={step} height="300" fill="transparent" />
          <line x1={x(i)} x2={x(i)} y1={y(bar.high)} y2={y(bar.low)} stroke={bar.close >= bar.open ? '#059669' : '#e11d48'} pointerEvents="none" />
          <rect x={x(i) - step * .3} width={step * .6} y={y(Math.max(bar.open, bar.close))} height={Math.max(1, Math.abs(y(bar.open) - y(bar.close)))} fill={bar.close >= bar.open ? '#059669' : '#e11d48'} pointerEvents="none" />
        </g>)}
        {row.trips?.map((trip, i) => <g key={i} pointerEvents="none">
          <line x1={x(trip.start_index - offset)} x2={x(trip.end_index - offset)} y1={y(row.bars[trip.start_index].close)} y2={y(row.bars[trip.end_index].close)} stroke={trip.direction === 'up' ? '#7c3aed' : '#d97706'} strokeWidth="1.8" opacity=".8" />
          <circle cx={x(trip.end_index - offset)} cy={y(row.bars[trip.end_index].close)} r="3.5" fill={trip.direction === 'up' ? '#7c3aed' : '#d97706'} />
        </g>)}
        <g aria-label="成交量副图" data-testid="box-volume-panel">
          <text x="56" y="367" fill="#475569" fontSize="12">成交量 · 股</text>
          <line x1="52" x2="925" y1="465" y2="465" stroke="#e2e8f0" />
          {bars.some(bar => bar.volume != null) && <text x="928" y="389" fill="#64748b" fontSize="10">{peakVolume >= 1e6 ? `${(peakVolume / 1e6).toFixed(1)}M` : peakVolume.toFixed(0)}</text>}
          {bars.map((bar, i) => bar.volume == null ? null : <rect key={bar.time} data-date={bar.time} data-volume={bar.volume} x={x(i) - step * .3} y={465 - bar.volume / maxVolume * 80} width={step * .6} height={bar.volume / maxVolume * 80} fill={bar.close >= bar.open ? '#059669' : '#e11d48'} opacity=".65" />)}
          {bars.every(bar => bar.volume == null) && <text x="480" y="420" textAnchor="middle" fill="#94a3b8" fontSize="12">此窗口暂无成交量数据</text>}
        </g>
        <g aria-label="RSI副图" data-testid="box-rsi-panel">
          <text x="56" y="495" fill="#475569" fontSize="12">RSI(14) · 30以下超卖 / 70以上超买</text>
          <rect x="52" y={rsiY(100)} width="873" height="33" fill="#fff1f2" />
          <rect x="52" y={rsiY(30)} width="873" height="33" fill="#ecfdf5" />
          {[0, 30, 70, 100].map(value => <g key={value}><line x1="52" x2="925" y1={rsiY(value)} y2={rsiY(value)} stroke="#cbd5e1" strokeDasharray="4 4" /><text x="25" y={rsiY(value) + 4} fill="#64748b" fontSize="10">{value}</text></g>)}
          <path data-testid="box-rsi-line" d={rsiPath} fill="none" stroke="#0284c7" strokeWidth="1.6" />
          {bars.every(bar => bar.rsi_value == null) && <text x="480" y="570" textAnchor="middle" fill="#94a3b8" fontSize="12">此窗口暂无RSI数据</text>}
          {selected.rsi_value != null && <circle cx={x(selectedIndex)} cy={rsiY(selected.rsi_value)} r="3" fill="#0369a1" />}
        </g>
        {hover != null && <line data-testid="box-chart-crosshair" x1={x(selectedIndex)} x2={x(selectedIndex)} y1="20" y2="625" stroke="#64748b" strokeDasharray="3 3" pointerEvents="none" />}
        {Array.from({ length: 5 }, (_, i) => Math.round((bars.length - 1) * i / 4)).filter(i => i < bars.length).map(i => <text key={i} x={x(i)} y="650" textAnchor="middle" fontSize="11" fill="#64748b">{bars[i].time}</text>)}
        {row.low != null ? <>
          <text x="240" y="679" textAnchor="middle" fontSize="11" fill="#64748b">{row.window_days}日窗口 · 整段识别与计数</text>
          <text x="710" y="679" textAnchor="middle" fontSize="11" fill="#0369a1">同一窗口统一边界 · 回顾性形态</text>
        </> : <text x="480" y="679" textAnchor="middle" fontSize="11" fill="#64748b">可用历史 {bars.length} 日 · 未识别有效箱体</text>}
      </svg>
    </div>
    <p className="box-footnote">蓝线为箱体，紫/橙线为上行/下行。悬停、点按或左右键查看同日数值；手机可横滑。</p>
  </>
}

function LongRangeChart({ row }: { row: Box }) {
  const bars = row.long_bars ?? []
  if (!bars.length || row.long_low == null || row.long_high == null) return null
  const span = Math.max(row.long_high - row.long_low, .01)
  const y = (price: number) => 105 - (price - row.long_low!) / span * 85
  const first = Date.parse(bars[0].time), last = Date.parse(bars[bars.length - 1].time)
  const x = (time: string) => 12 + (Date.parse(time) - first) / Math.max(1, last - first) * 856
  const hasBox = row.low != null && row.high != null
  return <div className="box-long-range">
    <h3>{row.long_history_complete ? '近四年价格背景' : '长期价格背景 · 历史不足四年'}</h3>
    <p>{row.long_start} — {row.long_end} · {row.long_history_days} 个可用交易日</p>
    <div className="box-long-plot">
    <svg viewBox="0 0 880 128" preserveAspectRatio="none" role="img" aria-label={`${row.code} 长期价格背景及当前箱体边界`}>
      <rect x="12" y="20" width="856" height="17" fill="#fff1f2" />
      <line x1="12" x2="868" y1="37" y2="37" stroke="#fda4af" strokeDasharray="4 4" />
      {hasBox && <g data-testid="long-box-overlay">
        <rect x="12" y={y(row.high!)} width="856" height={y(row.low!) - y(row.high!)} fill="#e0f2fe" opacity=".75" />
        <line data-boundary="upper" data-price={row.high} x1="12" x2="868" y1={y(row.high!)} y2={y(row.high!)} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="5 4" />
        <line data-boundary="lower" data-price={row.low} x1="12" x2="868" y1={y(row.low!)} y2={y(row.low!)} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="5 4" />
      </g>}
      <polyline points={bars.map(bar => `${x(bar.time)},${y(bar.close)}`).join(' ')} fill="none" stroke="#527782" strokeWidth="1.8" />
    </svg>
    {hasBox && <>
      <span className="box-long-label upper" style={{ top: `${y(row.high!) / 128 * 100}%` }}>箱体上沿 ${number(row.high, '', 2)}</span>
      <span className="box-long-label lower" style={{ top: `${y(row.low!) / 128 * 100}%` }}>箱体下沿 ${number(row.low, '', 2)}</span>
    </>}
    </div>
    <div className="box-detail-stats"><span>长期区间位置 <b>{number(row.long_position_pct, '%')}</b></span><span>近一年涨幅 <b>{number(row.year_return_pct, '%')}</b></span><span>较一年低点上涨 <b>{number(row.year_low_gain_pct, '%')}</b></span></div>
    <details className="page-help"><summary>背景图说明</summary><p>蓝色为当前日线箱体，非四年固定边界；红色为长期区间顶部20%。曲线每5日采样，指标用全部日线。{(row.year_history_days ?? 0) < 252 ? '一年低点使用可用历史。' : ''}</p></details>
  </div>
}

export default function BoxScreener({ pool = false }: { pool?: boolean }) {
  const governance = useGovernance()
  const review = usePoolReview(pool)
  const [grade, setGrade] = useState('all')
  const [category, setCategory] = useState('all')
  const [data, setData] = useState<Scan | null>(null)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState('candidates')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')
  const [comparison, setComparison] = useState<{ code: string; days: number } | null>(null)
  useEffect(() => {
    document.title = `${pool ? '高风险公司箱体研究' : '箱体观察'} · Tao 美股趋势看板`
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/${pool ? 'pool-boxes' : 'boxes'}.json`, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('missing')
      return response.json() as Promise<Scan>
    }).then(result => {
      if (!isBoxScan(result)) throw new Error('invalid')
      setData(result)
    }).catch(error => { if (error.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [pool])
  const rows = useMemo(() => (data?.rows ?? []).filter(row =>
    (!pool || matchesPoolReview(review.data?.rows.find(item => item.code === row.code), grade, category)) &&
    (filter === 'all' || (filter === 'candidates' ? ['match', 'watch'].includes(row.status) : row.status === filter)) && `${row.code} ${row.name}`.toLowerCase().includes(query.toLowerCase()),
  ).sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || (b.efficiency ?? -1) - (a.efficiency ?? -1) || (b.passed_count ?? 0) - (a.passed_count ?? 0) || (a.position_pct ?? Infinity) - (b.position_pct ?? Infinity) || a.code.localeCompare(b.code)), [data, filter, query, pool, grade, category, review.data])
  const stock = rows.find(row => row.code === selected) ?? rows[0]
  const comparedWindow = stock && comparison?.code === stock.code ? stock.windows?.find(item => item.window_days === comparison.days) : undefined
  const active = stock ? { ...stock, ...comparedWindow } : undefined
  const matches = data?.rows.filter(row => row.status === 'match').length ?? 0
  const watching = data?.rows.filter(row => row.status === 'watch').length ?? 0
  return <main className="box-page">
    <header className="box-hero">
      <PageNavigation page={pool ? 'pool-boxes' : 'boxes'} />
      <div className="box-hero-heading"><div>
      <div className="box-eyebrow">仅复权日线 · 回顾性形态</div>
      <h1>{pool ? '高风险公司箱体研究' : '宽箱体形态识别'}</h1>
      <p>{pool ? '经营困境与潜在反转跟踪。' : '形态筛选，基本面待复核。'}</p>
      </div>{data && <DataFreshness updatedAt={data.updated_at} dataDate={data.data_date} />}</div>
    </header>
    {error ? <section className="box-panel" role="alert">箱体数据暂不可用。<button className="underline" onClick={() => window.location.reload()}>刷新重试</button></section> : !data ? <section className="box-panel" role="status">正在读取扫描结果…</section> : <>
      <section className="box-stats" aria-label="扫描概况">
        <div><small>本轮扫描范围</small><strong>{data.universe_count}<em>只</em></strong><span>{pool ? '高风险公司股票池' : '活跃列表 · 固定扫描池'}</span></div>
        <div><small>形态候选</small><strong>{matches + watching}<em>只</em></strong><span>已验证 {matches} · 待观察 {watching}{!pool && ' · 基本面待复核'}</span></div>
      </section>
      {!pool && <ListReviewNotice />}
      {pool && <PoolFilter review={review.data} error={review.error} value={grade} onChange={setGrade} category={category} onCategoryChange={setCategory} />}

      <section className="box-panel">
        <div className="box-toolbar"><div><h2>形态候选</h2><p>已验证优先 · 同类按空间效率排序</p></div>{!pool && <button className="box-reference" onClick={() => { setFilter('all'); setQuery('CRWV'); setSelected('CRWV') }}>查看 CRWV 对照</button>}</div>
        <div className="box-filters"><label>状态<select aria-label="状态" value={filter} onChange={event => setFilter(event.target.value)}><option value="candidates">候选（已验证 / 待观察）</option><option value="all">全部结果（含已排除）</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>查找股票<input aria-label="查找股票" value={query} onChange={event => setQuery(event.target.value)} placeholder="代码或公司名称" /></label><span>{rows.length} 个结果</span></div>
        <div className="box-table-scroll"><table className="box-table"><thead><tr><th>股票 / 形态</th><th>箱体下沿–上沿</th><th>箱体幅度 / 内部空间</th><th>平均周期 / 完成轮数</th><th>当前未完成</th><th>空间效率</th><th>箱体位置</th><th>长期位置 / 一年涨幅</th></tr></thead><tbody>{rows.map(row => <tr key={row.code} className={active?.code === row.code ? 'selected' : ''}>
          <td><button aria-pressed={active?.code === row.code} onClick={() => setSelected(row.code)}><strong>{row.code}</strong><span>{row.name}</span></button>{pool && <FundamentalBadge compact assessment={review.data?.rows.find(item => item.code === row.code)} />}<span className={`box-status ${row.status}`}>{statusLabels[row.status]}</span><small className="box-history-note">{row.window_days ?? '—'}日窗口{row.contracting ? ' · 宽转窄' : ''}</small></td>
          <td>{number(row.low, '', 2)} – {number(row.high, '', 2)}</td><td>{number(row.width_pct, '%')} / {number(row.inner_space_pct, '%')}</td><td>{number(row.cycle_days)} 天 / {row.round_count ?? 0} 轮</td><td>{number(row.pending_days, ' 天', 0)}</td><td>{number(row.efficiency, '', 2)}<small className="box-history-note">百分点 / 自然日</small></td><td>{number(row.position_pct, '%')}</td><td>{number(row.long_position_pct, '%')} / {number(row.year_return_pct, '%')}<small className="box-history-note">{row.long_history_complete ? '近四年' : '不足四年 · 可用历史'}</small></td>
        </tr>)}</tbody></table></div>
        {!rows.length && <p role="status" className="box-empty">暂无匹配结果，可切换“全部结果”。</p>}

      </section>
      {active && <section className="box-panel box-detail" aria-label="箱体走势详情">
        {governance.error && <p className="box-footnote">风险资料不可用，不能视为安全</p>}
        <div className="box-toolbar"><div><div className="box-eyebrow">DAILY CHART / 最近一年</div><h2>{active.code} <span>{active.name}</span></h2><p className="box-business">业务 / 板块：{active.business || '—'}</p></div><span className={`box-status ${active.status}`}>{statusLabels[active.status]}</span></div>
        <p className="box-reason">{active.reason}</p><GovernanceBadge row={governance.data?.rows.find(row => row.code === active.code)} reviewedAt={governance.data?.reviewed_at} /><p className="box-volatility">近3月日均波幅：<VolatilityCell value={active.volatility_3m} /></p>{pool && <><FundamentalSummary assessment={review.data?.rows.find(item => item.code === active.code)} /><FundamentalBadge assessment={review.data?.rows.find(item => item.code === active.code)} /></>}
        {active.short_year && <p className="box-footnote">历史不足一年，本次使用 {active.bars.length} 个可用交易日。</p>}
        <div className="box-window-options" aria-label="箱体窗口对照">
          {active.windows?.map(item => <button key={item.window_days} aria-pressed={active.window_days === item.window_days} onClick={() => setComparison({ code: active.code, days: item.window_days })}>
            <strong>{item.window_days}日{item.window_days === stock?.selected_window_days ? ' · 默认' : ''}</strong>
            <span>{statusLabels[item.status]} · 空间 {number(item.width_pct, '%')}</span>
            <span>{item.round_count ?? 0}轮 · {number(item.cycle_days, ' 自然日')}</span>
          </button>)}
        </div>
        <details className="page-help"><summary>窗口选择说明</summary><p>{active.selection_note}</p></details>
        {active.prior_box && <p className="box-contract-note">{active.contracting ? '识别到宽转窄' : '较长窗口对照（近期形态待验证）'}：较长的 {active.prior_box.window_days} 日窗口空间 {number(active.prior_box.width_pct, '%')}，默认近期 {active.selected_window_days} 日窗口空间 {number(stock?.width_pct, '%')}。</p>}
        <div className="box-detail-stats"><span>边界空间 <b>{number(active.width_pct, '%')}</b></span><span>内部空间 <b>{number(active.inner_space_pct, '%')}</b></span><span>空间效率 <b>{number(active.efficiency, '', 2)} 百分点/天</b></span></div>
        <BoxChart key={`${active.code}:${active.window_days}`} row={active} />
        <LongRangeChart row={active} />
        {active.status === 'excluded' && <p className="box-footnote">原始形态：{statusLabels[active.shape_status ?? 'watch']} · {active.shape_reason}。仅从箱体候选排除，活跃列表仍保留。</p>}
        <div className="box-detail-stats"><span>窗口内收盘占比 <b>{number(active.occupancy_pct, '%')}</b></span><span>识别区间 <b>{active.window_start ?? '—'} — {active.window_end ?? '—'}</b></span>{!pool && <span>业务复核 <b>待完成</b></span>}</div>
        <div className="box-cycle-summary">
          <strong>完整轮次 {active.round_count ?? 0} 轮 · 平均 {number(active.cycle_days, ' 自然日')}</strong>
          <p>最近完成一轮：{number(active.latest_cycle_days, ' 自然日')}；当前未完成：{number(active.pending_days, ' 自然日', 0)}{active.pending_start ? `（从 ${active.pending_start} 开始，已完成${active.pending_completed_legs ?? 0}/3个单程，${active.pending_phase === 'awaiting_low' ? '等待进入下区' : '等待进入上区'}）` : '（尚未进入边界区域）'}。</p>
          <p>上行 / 下行单程中位：{number(active.up_days)} / {number(active.down_days)} 个交易日。</p>
        </div>
        <details className="box-rounds"><summary>展开完整轮次记录（{active.round_count ?? 0} 轮）</summary>{active.rounds?.length ? active.rounds.map((round, i) => <p key={i}>{round.turns.map(turn => `${turn.time} ${turn.side === 'low' ? '下区' : '上区'}`).join(' → ')} · <strong>{round.calendar_days} 自然日</strong> / {round.trading_days} 交易日</p>) : <p>尚未完成三个交替单程，不能以单向或山峰结构冒充一轮。</p>}</details>
        <details><summary>展开每次穿越的日期、幅度和耗时（{active.trips?.length ?? 0} 次）</summary><div className="box-trips">{active.trips?.length ? active.trips.map((trip, i) => <p key={i}>{trip.direction === 'up' ? '↗ 上行' : '↘ 下行'} · {trip.start} → {trip.end} · <strong>{trip.days} 个交易日</strong> · {number(trip.return_pct, '%')}</p>) : <p>观察期内未识别到完整穿越。</p>}</div></details>
      </section>}
      <details className="box-panel box-method page-help">
        <summary>箱体方法与选股标准</summary>
        <p>60/90/120/252日窗口；幅度≥20%，已完成轮次平均≤120自然日。一轮为三个交替单程，未完成耗时不参与平均。</p>
        <p>四年区间位置≥80%、一年涨幅≥100%或较一年低点涨幅≥200%排除。日常扫描本页名单，名单手动维护。</p>
        <a href="https://github.com/icefly1991/tao-us-stock-dashboard/blob/main/docs/BOX_DEFINITIONS.md" target="_blank" rel="noreferrer">完整箱体方法</a>
        <a href="https://github.com/icefly1991/tao-us-stock-dashboard/blob/main/docs/LIST_REVIEW.md" target="_blank" rel="noreferrer">选股标准</a>
        <a href="https://github.com/icefly1991/tao-us-stock-dashboard/blob/main/docs/ACTIVE_LIST_UPDATE.md" target="_blank" rel="noreferrer">名单维护</a>
      </details>
      {data.errors.length > 0 && <section className="box-panel"><details><summary>未完成扫描：{data.errors.length} 只</summary>{data.errors.map(item => <p key={item.code}>{item.code}：{item.error}</p>)}</details></section>}
      <footer className="box-footer">{data.source ?? 'yfinance'} · {data.universe} · 数据和形态仅供研究</footer>
    </>}
  </main>
}
