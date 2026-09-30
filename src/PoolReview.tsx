import { gradeLabels, categoryLabels } from './poolReviewData'
import type { Assessment, PoolReview } from './poolReviewData'
import { isReviewStale } from './governanceData'
import { useRef } from 'react'

export function PoolFilter({ review, error, value, onChange, category, onCategoryChange }: { review: PoolReview | null; error: boolean; value: string; onChange: (value: string) => void; category: string; onCategoryChange: (value: string) => void }) {
  return <section className="pool-review-controls" aria-label="基本面筛选">
    <label>经营类型 <select aria-label="经营类型" value={category} onChange={event => onCategoryChange(event.target.value)}><option value="all">全部类型</option>{Object.entries(categoryLabels).map(([key, label]) => <option key={key} value={key}>{label} · {review?.rows.filter(row => row.category === key).length ?? '—'}</option>)}</select></label>
    <label>基本面 <select aria-label="基本面等级" value={value} onChange={event => onChange(event.target.value)}><option value="all">全部等级</option>{Object.entries(gradeLabels).map(([key, label]) => <option key={key} value={key}>{label} · {review?.rows.filter(row => row.grade === key).length ?? '—'}</option>)}</select></label>
    <span>{review ? `核查 ${review.reviewed_at}${isReviewStale(review.reviewed_at) ? ' · 已过30天，请与名单一起手动复核' : ''}` : error ? '基本面资料暂不可用，不能视为低风险' : '读取基本面资料…'}</span>
    <details className="page-help"><summary>分类与依据</summary><p>追踪经营困境与潜在反转。类型说明业务阶段，等级说明资金与经营压力；临床研发不等于短期断粮，获批不等于盈利。选项数字为全池数量，箱体页还需满足形态筛选。</p><a href="https://github.com/icefly1991/tao-us-stock-dashboard/blob/main/docs/POOL_RESEARCH.md" target="_blank" rel="noreferrer">分类方法与限制</a>{review?.excluded.map(item => <p key={item.code}>{item.code}：{item.reason} <a href={item.url} target="_blank" rel="noreferrer">依据</a></p>)}</details>
  </section>
}

const factLabels: Record<string, string> = { revenue: '收入', net_income: '净利润', operating_cash_flow: '经营现金流', cash: '现金及等价物', equity_proceeds: '股权融资所得', financing_cash_flow: '融资现金流', current_assets: '流动资产', current_liabilities: '流动负债', net_assets: '基金净资产' }
export function FundamentalPhrases({ assessment, kind, evidence = false }: { assessment?: Assessment; kind: 'highlights' | 'risks'; evidence?: boolean }) {
  const phrases = assessment?.[kind]
  return <div className={`fundamental-phrases ${kind}`} aria-label={kind === 'highlights' ? '基本面亮点' : '基本面风险'}>
    {phrases?.length ? <ul>{phrases.map(item => <li key={item.text}>{item.text}{evidence && <small>{item.method} · {item.sources.map((source, index) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" title={source.title}>依据{index + 1} </a>)}</small>}</li>)}</ul> : <span className="fundamental-empty">{phrases === undefined ? '摘要待补充' : kind === 'highlights' ? '暂无可确认亮点' : '具体风险待补充'}</span>}
  </div>
}

export function FundamentalSummary({ assessment, evidence = false }: { assessment?: Assessment; evidence?: boolean }) {
  return <div className="fundamental-summary">{(['highlights', 'risks'] as const).map(kind => <section key={kind}><h3>{kind === 'highlights' ? '基本面亮点' : '基本面风险'}</h3><FundamentalPhrases assessment={assessment} kind={kind} evidence={evidence} /></section>)}</div>
}

export function FundamentalBadge({ assessment, compact = false }: { assessment?: Assessment; compact?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  if (!assessment) return <span className="fundamental-badge unknown">待核实</span>
  return <div className="fundamental-review">
    <span className="fundamental-category">{categoryLabels[assessment.category]}</span>
    <span className={`fundamental-badge ${assessment.grade}`}>{gradeLabels[assessment.grade]}</span>
    {!compact && <><div className="fundamental-tags" title={assessment.tags.join(' · ')}>{assessment.tags.slice(0, 2).join(' · ')}{assessment.tags.length > 2 ? ` 等${assessment.tags.length}项` : ''}</div><button className="fundamental-open" onClick={() => dialog.current?.showModal()} aria-label={`${assessment.code} 核查依据`}>核查依据</button>
    <dialog ref={dialog} className="fundamental-dialog" aria-label={`${assessment.code} 基本面核查`}>
      <div className="fundamental-dialog-heading"><h2>{assessment.code} · {gradeLabels[assessment.grade]}</h2><button onClick={() => dialog.current?.close()} autoFocus>关闭</button></div>
      <p><strong>{categoryLabels[assessment.category]}</strong> · {assessment.category_reason}</p>
      <small>{assessment.category_method}</small>
      <FundamentalSummary assessment={assessment} evidence />
      {assessment.reason !== assessment.category_reason && <p>{assessment.reason}</p>}<p>{assessment.business} · {assessment.tags.join(' · ')}</p><small>{assessment.review_method} · 核查 {assessment.reviewed_at}</small>
      {assessment.evidence_gap && <p className="fundamental-gap">仍待确认：{assessment.evidence_gap}</p>}
      {Object.entries(assessment.facts).map(([key, fact]) => <p key={key}>{factLabels[key] ?? key}：{fact ? <>{(fact.value / 1e6).toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 百万 {fact.unit}<br /><small>{fact.start ? `${fact.start} 至 ` : ''}{fact.end} · 申报 {fact.filed}</small> <a href={fact.url} target="_blank" rel="noreferrer">财报</a></> : '未取得可比值'}</p>)}
      {assessment.runway_months !== null && <p>经营现金消耗覆盖约 {assessment.runway_months.toFixed(1)} 个月（仅现金及等价物，未计投资、资本支出、偿债与后续融资）</p>}
      {[...new Map([...assessment.category_sources, ...assessment.sources].map(source => [source.url, source])).values()].map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>)}
    </dialog></>}
  </div>
}
