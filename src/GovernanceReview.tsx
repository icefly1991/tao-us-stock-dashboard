import { useRef } from 'react'
import { distressLabels, riskKinds, isReviewStale, reviewDue } from './governanceData'
import type { GovernanceRow } from './governanceData'
import type { WeeklyCompany } from './weeklyResearch'

const stateLabels = { current: '当前披露事项', historical: '历史事项', resolved: '已解决/整改' }
const legalLabels = { disclosed: '公司/正式文件披露', investigation: '调查未决', charged: '指控未决，非定罪', admitted: '历史认罪', adjudicated: '已裁判', alleged: '未经裁判的指控' }
export function GovernanceFilter({ value, onChange, date, error }: { value: string; onChange: (s: string) => void; date?: string; error: boolean }) {
  const stale = isReviewStale(date)
  return <div className="governance-controls"><label>风险筛选 <select aria-label="重大事项筛选" value={value} onChange={e => onChange(e.target.value)}><option value="all">全部标的</option><optgroup label="生存 / 退市风险"><option value="distress:major">重大风险</option><option value="distress:watch">风险观察</option><option value="distress:unknown">核查待补</option></optgroup><optgroup label="具体事项"><option value="current">有当前事项</option>{Object.entries(riskKinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}<option value="historical">历史事项</option></optgroup></select></label><button className="distress-shortcut" aria-pressed={value === 'distress:major'} onClick={() => onChange(value === 'distress:major' ? 'all' : 'distress:major')}>只看重大风险</button><small>{error ? '风险资料不可用，不能视为安全' : date ? `核查 ${date} · ${stale ? '研究已过30天，请复核；' : ''}无标签不代表无风险` : '读取风险资料…'}</small><details><summary>判定与范围</summary><p>重大风险：已披露持续经营重大疑虑、退市决定等具体生存/上市红旗。风险观察：融资依赖、上市警告或后续融资缓解等需追踪事项。保留全部股票，不预测破产概率。内控缺陷、调查及高管案件另列，不直接认定公司将破产。</p><p>定期财报初筛与重点事件复核；尚未逐只完成可动用资金、未来12/24个月偿债、授信条件与股权稀释的完整核验。无标签仅代表本轮未列出对应事件，不是安全评级。研究非每日更新。</p><a href="https://github.com/icefly1991/tao-us-stock-dashboard/blob/main/docs/FINANCIAL_DISTRESS.md" target="_blank" rel="noreferrer">完整核查标准</a></details></div>
}
export function GovernanceBadge({ row, reviewedAt, weekly }: { row?: GovernanceRow; reviewedAt?: string; weekly?: WeeklyCompany }) {
  const dialog = useRef<HTMLDialogElement>(null)
  if (!row || row.coverage === 'not_applicable' || (!row.events.length && row.coverage === 'screened' && weekly?.status !== 'new_filings_need_interpretation')) return null
  const current = row.events.filter(e => e.state === 'current').sort((a, b) => Number(b.severity === 'high') - Number(a.severity === 'high'))
  const historical = row.events.filter(e => e.state === 'historical')
  const active = current.length ? current : historical
  const distress = row.distress
  const distressAlert = distress && ['major', 'watch', 'unknown'].includes(distress.level)
  return <div className="governance-badge">
    <button className={distress?.level === 'major' ? 'high' : active.length || distress?.level === 'watch' ? 'elevated' : 'muted'} onClick={() => dialog.current?.showModal()} aria-label={`${row.code} 重大事项依据`}>
      {distressAlert ? `${distressLabels[distress.level]}${distress.reasons[0] ? ` · ${distress.reasons[0]}` : ''}` : active.length ? `${active[0].label}${active.length > 1 ? ` 等${active.length}项` : ''}` : row.events.length ? '历史事项已解决' : row.coverage === 'unavailable' ? '风险资料待补' : '财报初筛记录'}
      {current.length > 0 && historical.length > 0 && <span className="governance-history-note">另有控制人历史记录</span>}
      {weekly?.status === 'new_filings_need_interpretation' && <span className="governance-history-note">新申报待判</span>}
      {current.some(event => isReviewStale(reviewedAt, event.review_due_at)) && <span className="governance-history-note">复核已逾期</span>}
    </button>
    <dialog ref={dialog} className="fundamental-dialog governance-dialog" aria-label={`${row.code} 重大事项`}>
      <div className="fundamental-dialog-heading"><h2>{row.code} · 重大事项</h2><button onClick={() => dialog.current?.close()} autoFocus>关闭</button></div>
      <p>复核 {reviewedAt} · {row.coverage === 'targeted' ? '重点事项原文复核' : row.coverage === 'screened' ? '定期财报初筛' : '资料待补'}{row.filing_date && ` · 所查报告申报 ${row.filing_date}`}</p>
      {weekly?.status === 'new_filings_need_interpretation' && <section className="fundamental-gap"><strong>本周机器发现新申报，旧风险结论保留</strong>{weekly.attention?.map(item => <p key={item}>{item}</p>)}{weekly.filings.map(item => <p key={item.accession}><a href={item.url} target="_blank" rel="noreferrer">{item.form} · {item.filed} · 原始申报</a></p>)}</section>}
      <section className="distress-summary"><h3>生存 / 退市风险：{distress ? distressLabels[distress.level] : '核查待补'}</h3>{distress?.reasons.map(reason => <p key={reason}>{reason}</p>)}<p>{distress?.level === 'major' ? '存在具体红旗，需要结合下列原始公告和后续进展判断；不等于已经破产或退市。' : '事件分层不是财务安全结论，也不能判断股票是否适合长期持有或承受回撤。'}</p><details><summary>尚未完整核验</summary><p>可自由动用现金及短期投资、未来12/24个月到期债务、自由现金流趋势、授信提款条件及稀释融资。旧版现金/经营消耗估算不是完整资金跑道，不据此自动判定重大风险。</p></details></section>
      {!row.events.length && <p>本轮未列出已核实事件，不等于没有风险；初筛不能排除隐瞒事项、后续公告或尚未发现的问题。</p>}
      {row.events.map((event, i) => <section className="governance-event" key={i}><h3>{event.label}</h3><small>{stateLabels[event.state]} · {legalLabels[event.legal_status]} · 披露 {event.disclosed_at}{event.state === 'current' && ` · 下次复核 ${reviewDue(reviewedAt, event.review_due_at) ?? '待定'}${isReviewStale(reviewedAt, event.review_due_at) ? '（已逾期）' : ''}`}</small><p>{event.detail}</p>{event.sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>)}</section>)}
      <details><summary>初筛报告</summary>{row.sources.map(s => <p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}</details>
    </dialog>
  </div>
}
