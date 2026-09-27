import { gradeLabels } from './poolReviewData'
import type { Assessment, PoolReview } from './poolReviewData'
import { useRef } from 'react'

export function PoolFilter({ review, error, value, onChange }: { review: PoolReview | null; error: boolean; value: string; onChange: (value: string) => void }) {
  return <section className="pool-review-controls" aria-label="基本面筛选">
    <label>基本面 <select aria-label="基本面等级" value={value} onChange={event => onChange(event.target.value)}><option value="all">全部等级</option>{Object.entries(gradeLabels).map(([key, label]) => <option key={key} value={key}>{label} · {review?.rows.filter(row => row.grade === key).length ?? '—'}</option>)}</select></label>
    <span>{review ? `核查 ${review.reviewed_at} · 财报筛查` : error ? '基本面资料暂不可用，不能视为低风险' : '读取基本面资料…'}</span>
    <details className="page-help"><summary>分级与排除记录</summary><p>盈利、经营现金流和融资压力分开看；等级不改变箱体规则。现金覆盖估算未计资本支出、偿债或后续融资，详见单股证据。</p><a href="https://github.com/icefly1991/tao-us-stock-dashboard/blob/main/docs/POOL_RESEARCH.md" target="_blank" rel="noreferrer">分级方法与限制</a>{review?.excluded.map(item => <p key={item.code}>{item.code}：{item.reason} <a href={item.url} target="_blank" rel="noreferrer">依据</a></p>)}</details>
  </section>
}

const factLabels: Record<string, string> = { revenue: '收入', net_income: '净利润', operating_cash_flow: '经营现金流', cash: '现金及等价物', equity_proceeds: '股权融资所得', financing_cash_flow: '融资现金流', current_assets: '流动资产', current_liabilities: '流动负债' }
export function FundamentalBadge({ assessment, compact = false }: { assessment?: Assessment; compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  if (!assessment) return <span className="fundamental-badge unknown">待核实</span>
  return <div className="fundamental-review">
    <span className={`fundamental-badge ${assessment.grade}`}>{gradeLabels[assessment.grade]}</span>
    {!compact && <><div className="fundamental-tags" title={assessment.tags.join(' · ')}>{assessment.tags.slice(0, 2).join(' · ')}{assessment.tags.length > 2 ? ` 等${assessment.tags.length}项` : ''}</div><button className="fundamental-open" onClick={() => dialog.current?.showModal()} aria-label={`${assessment.code} 核查依据`}>核查依据</button>
    <dialog ref={dialog} className="fundamental-dialog" aria-label={`${assessment.code} 基本面核查`}>
      <div className="fundamental-dialog-heading"><h2>{assessment.code} · {gradeLabels[assessment.grade]}</h2><button onClick={() => dialog.current?.close()} autoFocus>关闭</button></div>
      <p>{assessment.reason}</p><p>{assessment.business} · {assessment.tags.join(' · ')}</p><small>{assessment.review_method} · 核查 {assessment.reviewed_at}</small>
      {Object.entries(assessment.facts).map(([key, fact]) => <p key={key}>{factLabels[key] ?? key}：{fact ? <>{(fact.value / 1e6).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 百万 {fact.unit}<br /><small>{fact.start ? `${fact.start} 至 ` : ''}{fact.end} · 申报 {fact.filed}</small> <a href={fact.url} target="_blank" rel="noreferrer">财报</a></> : '未取得可比值'}</p>)}
      {assessment.runway_months !== null && <p>经营现金消耗覆盖约 {assessment.runway_months.toFixed(1)} 个月（仅现金及等价物，未计投资、资本支出、偿债与后续融资）</p>}
      {assessment.sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>)}
    </dialog></>}
  </div>
}
