import { isEtfHolding, staleEtfHolding, type EtfHolding } from './sectorEtfData'

export default function SectorEtf({ code, symbol, assetType, holding }: { code?: string; symbol?: string; assetType?: string; holding?: EtfHolding | null }) {
  if (assetType && assetType !== 'stock') return <span className="sector-etf-empty">板块ETF · 不适用</span>
  if (!isEtfHolding(holding, symbol, code)) return <span className="sector-etf-empty">{code ? 'ETF持仓未核实' : '未找到已核实ETF'}</span>
  const stale = staleEtfHolding(holding.as_of)
  return <span className="sector-etf-block">
    <a className={`sector-etf${stale ? ' sector-etf-stale' : ''}`} href={holding.source} target="_blank" rel="noopener noreferrer"
      aria-label={`${holding.theme}ETF ${code} 官方持仓（新窗口）`}
      title={`${holding.etf_name}；${holding.holding_name}（${holding.holding_symbol}）；持仓 ${holding.shares.toLocaleString()} 股，权重 ${holding.weight_pct}%；持仓截至 ${holding.as_of}，核查 ${holding.verified_on}。${stale ? '已超过30天，请重新核查。' : ''}仅代表该日官方快照，持仓会变化。`}>
      <span className="sr-only">行业/主题ETF</span><strong>{code}</strong><svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 9l6-6M3 3h6v6" /></svg>
    </a>
    <small className="sector-etf-date">{stale ? '待复核 · ' : '持仓 · '}{holding.as_of.slice(5)}</small>
  </span>
}
