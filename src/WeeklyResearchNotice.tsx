import type { WeeklyResearch } from './weeklyResearch'

export default function WeeklyResearchNotice({ pool = false, data, error = false }: { pool?: boolean; data: WeeklyResearch | null; error?: boolean }) {
  if (!data) return error ? <p className="fundamental-gap" role="status">每周机器研究资料暂不可用；页面仍显示上次人工研究结果。</p> : null
  const financial = data.pool_rows.filter(row => row.status === 'new_structured_facts')
  const filings = data.company_rows.filter(row => row.status === 'new_filings_need_interpretation')
  return <details className="page-help" aria-label="每周机器研究">
    <summary>每周机器扫描 {data.scanned_at.slice(0, 10)} · 新财报事实 {financial.length} 只 · 人工研究日后申报待判 {filings.length} 只</summary>
    <p>结构化财务数字可自动初筛；新公告须读原文才能确认经营、治理或生存影响。下面的机器提示与原有人工研究分开，旧风险不会因无新申报而解除。</p>
    {pool && financial.length > 0 && <><h3>新财报机器初筛</h3><ul>{financial.map(row => <li key={row.code}>
      <strong>{row.code}</strong> · 报告申报 {row.facts_filed_at} · 机器等级 {row.grade ?? '待核'}，原等级 {row.manual_grade ?? '—'}。{row.grade_reason}
      {row.highlights.length > 0 && <>亮点：{row.highlights.map(item => item.text).join('、')}。</>}
      {row.risks.length > 0 && <>风险：{row.risks.map(item => item.text).join('、')}。</>}
      {row.source && <> <a href={row.source} target="_blank" rel="noreferrer">原始财报</a></>}
    </li>)}</ul></>}
    {filings.length > 0 && <><h3>人工研究日后申报待判</h3><ul>{filings.map(row => <li key={row.code}><strong>{row.code}</strong> · {row.attention?.length ? `${row.attention.join('；')} · ` : ''}{row.filings.map((item, index) => <span key={item.accession}>{index > 0 && '、'}<a href={item.url} target="_blank" rel="noreferrer">{item.form} {item.filed}</a></span>)}</li>)}</ul></>}
    {!financial.length && !filings.length && <p>本次未发现相对上次人工研究日的新结构化财务事实或相关申报；这不构成安全结论。</p>}
  </details>
}
