export type EtfHolding = {
  etf: string; etf_name: string; theme: string; holding_symbol: string; holding_name: string
  identifier: string; position_type: 'direct_equity'; shares: number; weight_pct: number
  as_of: string; verified_on: string; source: string
}

const issuerHosts = ['www.ssga.com', 'www.globalxetfs.com', 'www.ishares.com', 'www.ftportfolios.com', 'www.defianceetfs.com', 'assets.ark-funds.com', 'sprottetfs.com', 'www.proshares.com']
const isoDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
export function isEtfHolding(value: unknown, symbol: unknown, etf: unknown): value is EtfHolding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const h = value as Record<string, unknown>
  try {
    const url = new URL(String(h.source))
    return url.protocol === 'https:' && !url.username && !url.password && issuerHosts.includes(url.hostname) &&
      typeof h.etf === 'string' && /^[A-Z][A-Z0-9]{1,9}$/.test(h.etf) && h.etf === etf && h.holding_symbol === symbol &&
      ['etf_name', 'theme', 'holding_name', 'identifier'].every(key => typeof h[key] === 'string' && String(h[key]).trim().length > 0) &&
      h.position_type === 'direct_equity' && typeof h.shares === 'number' && Number.isFinite(h.shares) && h.shares > 0 &&
      typeof h.weight_pct === 'number' && Number.isFinite(h.weight_pct) && h.weight_pct > 0 && h.weight_pct <= 100 &&
      isoDate(h.as_of) && isoDate(h.verified_on) && h.as_of <= h.verified_on
  } catch { return false }
}

export function staleEtfHolding(asOf: string, now = Date.now()): boolean {
  return now - Date.parse(`${asOf}T00:00:00Z`) > 30 * 86400000
}
