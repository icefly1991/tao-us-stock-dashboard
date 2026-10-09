import { useRef } from 'react'
import { scenarioLabels } from './valuationData'
import type { ScenarioKey, ValuationRow } from './valuationData'
import { priceDateState } from './priceFreshness'
import type { TargetRow } from './AnalystTargets'

const price = (value: number) => `$${value.toLocaleString('en-US', { maximumFractionDigits: value < 1 ? 4 : 2 })}`
const models = { enterprise_dcf: '企业现金流折现', equity_dcf: '股权现金流折现', asset_recovery: '普通股压力回收估值' }
const assumptions: Record<string, string> = { business: '经营假设', valuation: '估值假设', financing: '融资路径', dilution: '股权稀释', failure_case: '压力事件' }
const inputs: Record<string, string> = {
  fcff: '未来逐年企业自由现金流（百万美元）', discount_rate: '年折现率', terminal_growth: '终值增长率', cash_and_nonoperating_assets: '现金及非经营资产（百万美元）', debt_and_other_claims: '债务及其他优先权益（百万美元）', diluted_shares: '融资后稀释股数（百万股）', recoverable_assets: '可回收资产（百万美元）', senior_claims: '优先偿付债权（百万美元）', recovery_costs: '回收及处置成本（百万美元）', current_common_shares: '现有普通股数（百万股）', years_to_recovery: '预计回收等待年数',
}
inputs.existing_common_entitlement = '现有普通股对剩余权益的保留比例'
inputs.fcfe = '未来逐年股权自由现金流（百万美元）'
inputs.excess_equity_assets = '未计入现金流的可分配额外权益资产（百万美元）'
inputs.additional_common_claims = '未计入现金流的额外优先索偿（百万美元）'

export default function PriceResearchCell({ code, assetType, valuation, valuationAvailable, rawClose, comparison, target, targetsLoaded, targetsError, targetsDate }: {
  code: string; assetType: 'stock' | 'etf' | 'index' | 'crypto'; valuation?: ValuationRow; valuationAvailable: boolean; rawClose?: number; comparison?: Record<ScenarioKey, { value: number; raw_close: number; gap_pct: number }>
  target?: TargetRow; targetsLoaded: boolean; targetsError: boolean; targetsDate?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  if (assetType !== 'stock') return <div data-label="建议价 · 乐观 / 保守 / 极端保守 / 分析师低位" className="price-research-cell"><div className="scenario-prices" aria-label={`${code} 按要求跳过估值`}>{['optimistic', 'conservative', 'stress', 'analyst-low'].map(key => <span key={key} className="scenario-line equal"><strong>—</strong></span>)}</div></div>
  const cases = valuation?.status === 'available' ? valuation.scenarios : null
  const scenarioCurrent = priceDateState(valuation?.valued_at) === 'current'
  const keys = Object.keys(scenarioLabels) as ScenarioKey[]
  const quote = rawClose === undefined ? '—' : assetType === 'stock' || assetType === 'etf' ? price(rawClose) : rawClose.toLocaleString('en-US', { maximumFractionDigits: 6 })
  const tone = (value?: number) => value === undefined || rawClose === undefined || value === rawClose ? 'equal' : value > rawClose ? 'below' : 'above'
  const analystLow = target?.status === 'available' ? target.low ?? undefined : undefined
  const analystStatus = targetsError ? '读取失败' : !targetsLoaded ? '加载中' : analystLow === undefined ? '暂无目标价' : '目标价'
  const analystHistorical = priceDateState(targetsDate?.slice(0, 10)) !== 'current'
  const gap = (key: ScenarioKey) => {
    const item = comparison?.[key]
    if (!cases || !item || item.value !== cases[key].value || item.raw_close !== rawClose || !Number.isFinite(item.gap_pct)) return '—'
    return `${item.gap_pct > 0 ? '+' : ''}${item.gap_pct.toFixed(1)}%`
  }
  const missing = !valuationAvailable ? '读取失败' : valuation?.status === 'not_applicable' ? '需专门模型' : '待估值'
  const status = cases && !scenarioCurrent ? priceDateState(valuation?.valued_at) === 'expired' ? '已过期' : '日期待核' : missing
  const rows = (expanded = false) => keys.map(key => <div key={key} className={`scenario-line ${tone(scenarioCurrent ? cases?.[key].value : undefined)}`} data-scenario={key}>
    <span className="scenario-label">{scenarioLabels[key]}</span><strong>{cases ? price(cases[key].value) : '—'}</strong><span className="scenario-gap">{scenarioCurrent ? gap(key) : '—'}</span>
    {expanded && <><p>{cases ? `${cases[key].assumptions.business.split('。')[0]}。` : missing}{key === 'stress' && cases ? ' · 压力情景' : ''}</p><div className="scenario-sources">{cases?.[key].sources.slice(0, 1).map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div></>}
  </div>)
  return <div data-label="建议价 · 乐观 / 保守 / 极端保守 / 分析师低位" className="price-research-cell">
    <div className="scenario-prices">
      {keys.map(key => {
        const value = scenarioCurrent ? cases?.[key].value : undefined
        const label = scenarioLabels[key]
        return <div key={key} data-scenario={key} className={`scenario-line ${tone(value)}`} title={`${label} · ${value === undefined ? status : valuation?.valued_at}`}>
          <button aria-label={key === 'optimistic' ? `${code} 价格研究依据` : `${code} ${label}依据`} onClick={() => dialog.current?.showModal()}><strong>{value === undefined ? '—' : price(value)}</strong></button>
          <span className="scenario-gap">{value === undefined ? '—' : gap(key)}</span>
        </div>
      })}
      <div data-scenario="analyst-low" className={`scenario-line ${tone(analystHistorical ? undefined : analystLow)}`} title={`分析师低位目标价 · 非建议买入价 · 抓取 ${targetsDate?.slice(0, 10) ?? '日期未知'}${analystHistorical ? ' · 历史或日期未核实快照' : ''} · ${target?.quoted_at ? `报告 ${target.quoted_at}` : '报告日期未核实'}`}>
        <button aria-label={`${code} 分析师低位依据`} onClick={() => dialog.current?.showModal()}><strong>{analystLow === undefined ? '—' : price(analystLow)}</strong></button>
        <span className="scenario-gap">{analystStatus}</span>
      </div>
    </div>
    {(!cases || !scenarioCurrent) && <small className="price-status" title={valuation?.reason ?? status}>{status}</small>}
    <dialog ref={dialog} className="fundamental-dialog price-research-dialog" aria-label={`${code} 价格研究`}>
      <div className="fundamental-dialog-heading"><h2>{code} · 合理价</h2><button autoFocus onClick={() => dialog.current?.close()}>关闭</button></div>
      <div className="price-context"><span>现价 <strong>{quote}</strong><small>未复权收盘</small></span><span>估值日 {valuation?.valued_at ?? '—'}{cases && !scenarioCurrent ? ' · 已过期或日期未核实' : ''}</span></div>
      {cases ? !scenarioCurrent ? <details className="price-evidence"><summary>历史估值 · 不参与现价比较</summary><div className="scenario-cards">{rows(true)}</div></details> : <div className="scenario-cards">{rows(true)}</div> : <p className="price-pending-reason">{missing} · {valuation?.reason ?? '情景模型尚未完成，暂不填入价格。'}</p>}
      <section className="analyst-reference" aria-label="分析师目标价（参考）">
        <header><b>分析师目标价（参考）</b><span>非建议买入价</span></header>
        {targetsError ? <p>目标价读取失败</p> : !targetsLoaded ? <p>加载目标价…</p> : target?.status !== 'available' ? <p>暂无分析师目标价</p> : <>
          <table><thead><tr><th>低位</th><th>均值</th><th>高位</th></tr></thead><tbody><tr>{(['low', 'mean', 'high'] as const).map(key => <td key={key}><strong>{target[key] === null ? '—' : price(target[key])}</strong>{target[key] !== null && target.source_url && <a href={target.source_url} target="_blank" rel="noreferrer" aria-label={`${code} 分析师${key === 'low' ? '低位' : key === 'mean' ? '均值' : '高位'}来源`}>来源</a>}</td>)}</tr></tbody></table>
          <small>抓取 {targetsDate?.slice(0, 10) ?? '日期未知'}{priceDateState(targetsDate?.slice(0, 10)) === 'expired' ? ' · 历史快照' : ''} · {target.quoted_at ? `报告日期 ${target.quoted_at}` : '报告日期未核实'}</small>
        </>}
      </section>
      {cases && <details className="price-evidence"><summary>研究依据与参数</summary>
        {cases ? keys.map(key => <section key={key}><h3>{scenarioLabels[key]} · {models[cases[key].model]}</h3>
          {Object.entries(cases[key].assumptions).map(([field, value]) => <p key={field}><strong>{assumptions[field] ?? field}：</strong>{value}</p>)}
          {Object.entries(cases[key].inputs).map(([field, value]) => <p key={field}>{inputs[field] ?? field}：{Array.isArray(value) ? value.join(' / ') : ['discount_rate', 'terminal_growth', 'existing_common_entitlement'].includes(field) ? `${(value * 100).toFixed(2)}%` : value}</p>)}
          {cases[key].sources.map(source => <p key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></p>)}
        </section>) : <p>{valuation?.reason ?? missing}</p>}
        <p><a href="https://github.com/icefly1991/tao-us-stock-dashboard/blob/main/docs/VALUATION_SCENARIOS.md" target="_blank" rel="noreferrer">估值方法</a> · 压力价不是保证底价。</p>
      </details>}
    </dialog>
  </div>
}
