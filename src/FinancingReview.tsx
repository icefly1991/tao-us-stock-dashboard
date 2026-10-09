import { useRef } from 'react'
import { financingLabels } from './financingData'
import type { FinancingRow } from './financingData'
import { isReviewStale } from './governanceData'

const axes = [['actual', '已发生稀释'], ['potential', '潜在稀释'], ['funding', '融资紧迫性']] as const

export default function FinancingCell({ code, assetType, row, error }: { code: string; assetType: string; row?: FinancingRow; error: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const applicable = assetType === 'stock'
  if (!applicable) return <div data-label="融资／稀释风险" className="financing-cell financing-na" aria-label="融资风险不适用">—</div>
  const level = row?.level ?? 'unknown'
  const unavailable = error
  const status = unavailable ? '资料读取失败' : financingLabels[level]
  return <div data-label="融资／稀释风险" className="financing-cell">
    <button className="financing-block" onClick={() => dialog.current?.showModal()} aria-label={`${code} 融资／稀释风险详情`} aria-haspopup="dialog">
      <strong className={`financing-level ${level}`}>{status}</strong>
      {axes.map(([key, label]) => <span className="financing-line" key={key}><span>{label}</span><b>{!applicable ? '不适用' : unavailable ? '资料不可用' : row?.[key].summary ?? '待核实'}</b></span>)}
      {applicable && row?.completeness === 'partial' && <small>部分核实 · 缺口见详情</small>}
      {applicable && isReviewStale(row?.reviewed_at ?? undefined) && <small>研究超过30天，请复核</small>}
    </button>
    <dialog ref={dialog} className="fundamental-dialog financing-dialog" aria-label={`${code} 融资／稀释风险`}>
      <div className="fundamental-dialog-heading"><h2>{code} · 融资／稀释风险</h2><button autoFocus onClick={() => dialog.current?.close()}>关闭</button></div>
      <p>{status}{row?.reviewed_at ? ` · 专项核查 ${row.reviewed_at}` : applicable ? ' · 尚未完成专项核查' : ''}{row?.completeness === 'partial' && ' · 部分核实'}{isReviewStale(row?.reviewed_at ?? undefined) && ' · 已过30天，请复核'}</p>
      <p>{!applicable ? 'ETF、指数及加密资产不套用公司融资和现金消耗模型。' : unavailable ? '研究资料读取失败；行情仍可使用，不能据此判断低风险。' : row?.reason ?? '此代码没有匹配的融资研究。缺失数据不能视为低风险。'}</p>
      {applicable && !unavailable && axes.map(([key, label]) => <section key={key} className="governance-event"><h3>{label}：{row?.[key].summary ?? '待核实'}</h3><small>事实日期 {row?.[key].as_of ?? '未知'}</small><p>{row?.[key].detail ?? '尚未完成专项核查。'}</p>{row?.[key].sources.map(s => <p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></p>)}</section>)}
      <details className="financing-method"><summary>判定原理</summary><p>已发行股数、未来融资额度和资金紧迫性分开判断。融资完成可能增加稀释同时缓解资金压力。储架注册不等于已发行；ATM额度／市值不是实际稀释率。不使用未经验证总分，不自动删股或设置持有禁令。</p><p>资料按月度手动核查，日常行情不推进研究日期。暂未发现突出信号不是安全评级；银行等需专门资金口径。</p><a href="https://github.com/icefly1991/tao-us-stock-dashboard/blob/main/docs/FINANCING_RISK.md" target="_blank" rel="noreferrer">完整融资风险原理</a></details>
    </dialog>
  </div>
}

export function FinancingFilter({ value, onChange, error, retry, counts }: { value: string; onChange: (v: string) => void; error: boolean; retry: () => void; counts?: { complete: number; partial: number; pending: number } }) {
  return <div className="governance-controls financing-controls"><label>融资／稀释风险 <select aria-label="融资风险筛选" value={value} onChange={e => onChange(e.target.value)}><option value="all">全部标的</option>{Object.entries(financingLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>{error ? <><small role="status">融资资料读取失败，不代表低风险</small><button onClick={retry}>重试融资资料</button></> : <small>{counts ? `本列表三维核实 ${counts.complete} · 部分核实 ${counts.partial} · 待核 ${counts.pending}` : '读取融资资料…'} · 月度研究，非每日重判</small>}</div>
}
