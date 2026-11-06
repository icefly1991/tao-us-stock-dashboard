const sectors: Record<string, string> = {
  XLC: '通信服务', XLK: '信息技术', XLY: '可选消费', XLP: '必需消费', XLE: '能源',
  XLF: '金融', XLV: '医疗保健', XLI: '工业', XLB: '原材料', XLRE: '房地产', XLU: '公用事业',
}

export default function SectorEtf({ code, assetType }: { code?: string; assetType?: string }) {
  if (!code || !sectors[code]) return <span className="sector-etf-empty">{assetType && assetType !== 'stock' ? '板块ETF · 不适用' : '板块ETF · 待核实'}</span>
  return <a className="sector-etf" href={`https://finance.yahoo.com/quote/${code}/`} target="_blank" rel="noopener noreferrer"
    aria-label={`${sectors[code]}板块ETF ${code}（新窗口）`}
    title={`${sectors[code]}行业参考ETF；不代表该公司是基金的实际持仓`}>
    <span className="sr-only">板块ETF</span><strong>{code}</strong><svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 9l6-6M3 3h6v6" /></svg>
  </a>
}
