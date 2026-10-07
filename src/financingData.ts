import { useEffect, useState } from 'react'

export const financingLabels = { severe: '严重', high: '高风险', watch: '关注', clear: '暂未发现突出信号', unknown: '待核实', not_applicable: '不适用' }
export type FinancingLevel = keyof typeof financingLabels
export type FinancingAxis = { summary: string; detail: string; as_of: string | null; sources: { title: string; url: string }[] }
export type FinancingRow = { code: string; symbol: string; asset_type: string; level: FinancingLevel; completeness: 'complete' | 'partial' | 'unreviewed' | 'not_applicable'; reviewed_at: string | null; reason: string; actual: FinancingAxis; potential: FinancingAxis; funding: FinancingAxis }
export type FinancingReview = { schema_version: 1; generated_at: string; rows: FinancingRow[] }

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const date = (v: unknown): v is string => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v
const axis = (v: unknown): v is FinancingAxis => record(v) && text(v.summary) && v.summary.length <= 42 && text(v.detail) &&
  Array.isArray(v.sources) && v.sources.every(s => record(s) && text(s.title) && text(s.url) && /^https:\/\/[^\s]+$/.test(s.url)) &&
  (v.as_of === null ? v.sources.length === 0 && ['待核实', '不适用'].includes(v.summary) : date(v.as_of) && v.sources.length > 0)

export function validFinancing(v: unknown): v is FinancingReview {
  if (!record(v) || v.schema_version !== 1 || !text(v.generated_at) || !/T.*[+-]\d\d:\d\d$/.test(v.generated_at) || !Number.isFinite(Date.parse(v.generated_at)) || !Array.isArray(v.rows)) return false
  if (!v.rows.every(r => {
    if (!record(r) || !text(r.code) || !text(r.symbol) || !['stock', 'etf', 'index', 'crypto'].includes(String(r.asset_type)) || !text(r.level) || !Object.hasOwn(financingLabels, r.level) || !text(r.reason) || !axis(r.actual) || !axis(r.potential) || !axis(r.funding)) return false
    const axes = [r.actual, r.potential, r.funding]
    if (r.level === 'not_applicable') return r.asset_type !== 'stock' && r.completeness === 'not_applicable' && r.reviewed_at === null && axes.every(a => a.as_of === null && a.summary === '不适用')
    if (r.asset_type !== 'stock' || axes.some(a => a.summary === '不适用')) return false
    if (r.completeness === 'unreviewed') return r.level === 'unknown' && r.reviewed_at === null && axes.every(a => a.as_of === null)
    if (!date(r.reviewed_at) || !['complete', 'partial'].includes(String(r.completeness))) return false
    if (axes.some(a => a.as_of !== null && a.as_of > String(r.reviewed_at))) return false
    if (!axes.some(a => a.as_of !== null)) return false
    if (r.completeness === 'complete' && axes.some(a => a.as_of === null)) return false
    return r.level !== 'clear' || r.completeness === 'complete'
  })) return false
  return new Set(v.rows.map(r => r.code)).size === v.rows.length
}

export function useFinancing() {
  const [data, setData] = useState<FinancingReview | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/financing-review.json`, { signal: controller.signal }).then(r => { if (!r.ok) throw Error('missing financing'); return r.json() }).then((v: unknown) => {
      if (!validFinancing(v)) throw Error('invalid financing')
      setData(v)
      setError(false)
    }).catch(e => { if (e.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [attempt])
  return { data, error, retry: () => setAttempt(v => v + 1) }
}

export function matchesFinancing(row: FinancingRow | undefined, assetType: string, filter: string) {
  return filter === 'all' || (assetType !== 'stock' ? 'not_applicable' : row?.level ?? 'unknown') === filter
}
