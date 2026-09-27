import { useEffect, useState } from 'react'

export const gradeLabels = { supported: '经营支撑较好', watch: '亏损/转型观察', pressure: '融资/经营压力', unknown: '待核实' }
export type Grade = keyof typeof gradeLabels
type Fact = { value: number; unit: string; start?: string; end: string; filed: string; url: string }
export type Assessment = { code: string; grade: Grade; tags: string[]; reason: string; business: string; reviewed_at: string; review_method: string; facts: Record<string, Fact | null>; sources: { title: string; url: string }[]; runway_months: number | null }
export type PoolReview = { schema_version: number; reviewed_at: string; rows: Assessment[]; excluded: { code: string; reason: string; url: string }[] }

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string'
const url = (value: unknown) => text(value) && /^https:\/\/[^\s]+$/.test(value)
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
export function isPoolReview(value: unknown): value is PoolReview {
  if (!record(value) || value.schema_version !== 1 || !text(value.reviewed_at) || !Array.isArray(value.rows) || !Array.isArray(value.excluded)) return false
  if (!value.rows.every(row => record(row) && text(row.code) && text(row.grade) && Object.hasOwn(gradeLabels, row.grade) &&
    text(row.reason) && text(row.business) && text(row.reviewed_at) && text(row.review_method) &&
    Array.isArray(row.tags) && row.tags.every(text) && Array.isArray(row.sources) && row.sources.every(source => record(source) && text(source.title) && url(source.url)) &&
    (row.runway_months === null || finite(row.runway_months)) && record(row.facts) && Object.values(row.facts).every(fact => fact === null ||
      (record(fact) && finite(fact.value) && text(fact.unit) && text(fact.end) && text(fact.filed) && (fact.start === undefined || text(fact.start)) && url(fact.url))))) return false
  return new Set(value.rows.map(row => row.code)).size === value.rows.length && value.excluded.every(row => record(row) && text(row.code) && text(row.reason) && url(row.url))
}

export function usePoolReview(enabled: boolean) {
  const [data, setData] = useState<PoolReview | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/pool-review.json`, { signal: controller.signal }).then(res => {
      if (!res.ok) throw new Error('missing review')
      return res.json()
    }).then((value: unknown) => {
      if (!isPoolReview(value)) throw new Error('invalid review')
      setData(value)
    }).catch(err => { if (err.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [enabled])
  return { data, error }
}

