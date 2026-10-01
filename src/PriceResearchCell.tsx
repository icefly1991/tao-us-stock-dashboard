import { useRef } from 'react'
import { AnalystTargetCell } from './AnalystTargets'
import type { TargetRow } from './AnalystTargets'
import { scenarioLabels } from './valuationData'
import type { ScenarioKey, ValuationRow } from './valuationData'
import { isReviewStale } from './governanceData'

const price = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: value < 1 ? 4 : 2 })}`
const models = { enterprise_dcf: '企业现金流折现', asset_recovery: '普通股压力回收估值' }
const assumptions: Record<string, string> = { business: '经营假设', valuation: '估值假设', financing: '融资路径', dilution: '股权稀释', failure_case: '压力事件' }
const inputs: Record<string, string> = {
  fcff: '未来逐年企业自由现金流（百万美元）', discount_rate: '年折现率', terminal_growth: '终值增长率', cash_and_nonoperating_assets: '现金及非经营资产（百万美元）', debt_and_other_claims: '债务及其他优先权益（百万美元）', diluted_shares: '融资后稀释股数（百万股）', recoverable_assets: '可回收资产（百万美元）', senior_claims: '优先偿付债权（百万美元）', recovery_costs: '回收及处置成本（百万美元）', current_common_shares: '现有普通股数（百万股）', years_to_recovery: '预计回收等待年数',
}
inputs.existing_common_entitlement = '现有普通股对剩余权益的保留比例'

export default function PriceResearchCell({ code, assetType, valuation, valuationAvailable, target, analystAvailable, analystDate, rawClose }: {
  code: string; assetType: 'stock' | 'etf' | 'index' | 'crypto'; valuation?: ValuationRow; valuationAvailable: boolean; target?: TargetRow; analystAvailable: boolean; analystDate?: string; rawClose?: number
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cases = valuation?.status === 'available' ? valuation.scenarios : null
  const keys = Object.keys(scenarioLabels) as ScenarioKey[]
  const conservative = cases?.conservative.value
  const comparison = rawClose !== undefined && conservative !== undefined
    ? rawClose < conservative ? '现价低于保守估值' : rawClose > conservative ? '现价高于保守估值' : '现价等于保守估值'
    : null
  return <div className="price-research-cell target-cell">
    {cases ? <><div className="scenario-prices">{keys.map(key => <div key={key}><span>{scenarioLabels[key]}</span><strong>{price(cases[key].value)}</strong></div>)}</div><small>{comparison ?? '暂无可比现价'}</small>{valuation?.valued_at && <small>估值 {valuation.valued_at}{isReviewStale(valuation.valued_at) ? ' · 请复核' : ''}</small>}</>
      : <span>{!valuationAvailable ? '情景资料不可用' : valuation?.status === 'not_applicable' ? '需专门估值方法' : '情景估值待核实'}</span>}
    {target?.status === 'available' && target.mean !== null && <small>机构均 {price(target.mean)}</small>}
    <button className="fundamental-open" aria-label={`${code} 价格研究依据`} onClick={() => dialog.current?.showModal()}>情景 / 机构依据</button>
    <dialog ref={dialog} className="fundamental-dialog price-research-dialog" aria-label={`${code} 价格研究`}>
      <div className="fundamental-dialog-heading"><h2>{code} · 情景估值与机构预期</h2><button autoFocus onClick={() => dialog.current?.close()}>关闭</button></div>
      <p>按估值日已知信息折现到今天的情景价值；极端保守是压力情景，可能为零，不是保证底价。</p>
      <p>{rawClose === undefined ? '暂无可比未复权收盘价' : `对比未复权收盘价 ${assetType === 'stock' || assetType === 'etf' ? price(rawClose) : rawClose.toLocaleString('en-US', { maximumFractionDigits: rawClose < 1 ? 6 : 2 })}`}</p>
      <p>{valuation?.reason ?? '该标的尚无可核实的情景估值记录。'}</p>
      {cases && <><p>估值日 {valuation?.valued_at} · 原文基准日 {valuation?.evidence_date}{valuation?.valued_at && isReviewStale(valuation.valued_at) ? ' · 已过30天，请复核假设' : ''}</p>{keys.map(key => <section key={key}>
        <h3>{scenarioLabels[key]} {price(cases[key].value)} · {models[cases[key].model]}</h3>
        {Object.entries(cases[key].assumptions).map(([field, value]) => <p key={field}><strong>{assumptions[field] ?? field}：</strong>{value}</p>)}
        <details><summary>计算参数与单位</summary>{Object.entries(cases[key].inputs).map(([field, value]) => <p key={field}>{inputs[field] ?? field}：{Array.isArray(value) ? value.join(' / ') : ['discount_rate', 'terminal_growth', 'existing_common_entitlement'].includes(field) ? `${(value * 100).toFixed(2)}%` : value}</p>)}</details>
        {cases[key].sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>)}
      </section>)}</>}
      <section><h3>分析师低／均／高目标价</h3><p>Yahoo 抓取 {analystDate?.slice(0, 10) ?? '日期不可用'}；抓取日不是报告日，机构目标价与今天情景估值的时间口径可能不同。</p><AnalystTargetCell target={target} rawClose={rawClose} available={analystAvailable} /><p><a href={`https://finance.yahoo.com/quote/${encodeURIComponent(target?.symbol ?? code)}/analysis/`} target="_blank" rel="noreferrer">Yahoo 分析师资料</a></p></section>
    </dialog>
  </div>
}
