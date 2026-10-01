import { useEffect, useState } from 'react'

export type TargetRow = { code: string; symbol: string; status: 'available' | 'unavailable'; low: number | null; mean: number | null; high: number | null }
type Snapshot = { schema_version: 1; source: string; fetched_at: string; rows: TargetRow[] }

const validNumber = (value: unknown) => value === null || (typeof value === 'number' && Number.isFinite(value) && value > 0)

function validSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const data = value as Record<string, unknown>
  if (data.schema_version !== 1 || typeof data.source !== 'string' || typeof data.fetched_at !== 'string' || !Array.isArray(data.rows)) return false
  const codes = new Set<string>()
  return data.rows.every((item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return false
    const row = item as Record<string, unknown>
    if (typeof row.code !== 'string' || typeof row.symbol !== 'string' || codes.has(row.code) ||
      !['available', 'unavailable'].includes(String(row.status)) || ![row.low, row.mean, row.high].every(validNumber)) return false
    codes.add(row.code)
    if (row.status === 'available' && row.low === null && row.mean === null && row.high === null) return false
    if (row.status === 'unavailable' && (row.low !== null || row.mean !== null || row.high !== null)) return false
    if (typeof row.low === 'number' && typeof row.high === 'number' && row.low > row.high) return false
    if (typeof row.mean === 'number' && ((typeof row.low === 'number' && row.mean < row.low) || (typeof row.high === 'number' && row.mean > row.high))) return false
    return true
  })
}

// The hook and cell share the same snapshot type and validation boundary.
// eslint-disable-next-line react-refresh/only-export-components
export function useAnalystTargets() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    fetch(`${import.meta.env.BASE_URL}data/analyst-targets.json`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('target fetch failed')))
      .then((value: unknown) => {
        if (!validSnapshot(value)) throw new Error('invalid analyst targets')
        if (active) setSnapshot(value)
      })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])
  return { snapshot, error }
}

const price = (value: number | null) => value === null ? '—' : `$${value.toLocaleString('en-US', { maximumFractionDigits: value < 1 ? 4 : 2 })}`

export function AnalystTargetCell({ target, rawClose, available }: { target?: TargetRow; rawClose?: number; available: boolean }) {
  if (!available) return <div className="target-cell text-slate-400">资料不可用</div>
  if (!target || target.status === 'unavailable') return <div className="target-cell text-slate-400">暂无分析师目标价</div>
  const comparison = rawClose && target.mean !== null
    ? rawClose < target.mean ? '现价低于均值' : rawClose > target.mean ? '现价高于均值' : '现价等于均值'
    : '暂无可比现价'
  return <div className="target-cell" title="Yahoo 分析师目标价低／均／高；比较使用同一标的未复权收盘价。目标价不是实时估值或公允价值。">
    <div><span>低</span>{price(target.low)} <span>均</span><strong>{price(target.mean)}</strong> <span>高</span>{price(target.high)}</div>
    <small>{comparison}{rawClose ? ` · 未复权 ${price(rawClose)}` : ''}</small>
  </div>
}
