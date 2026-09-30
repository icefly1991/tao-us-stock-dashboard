import { useEffect, useState } from 'react'

export const gradeLabels = { supported: '当期经营初筛有支撑', watch: '亏损/转型观察', pressure: '融资/经营压力', unknown: '待核实' }
export type Grade = keyof typeof gradeLabels
export const categoryLabels = { clinical: '临床研发型', precommercial: '商业化前期', funded_loss: '亏损融资型', turnaround: '经营修复/扩张', commercial_medical: '医药商业化', digital_assets: '数字资产型', financial: '金融/地产/投资', operating: '经营已有支撑', disclosure_risk: '财报/披露风险', unresolved: '类型未核实' }
export type Category = keyof typeof categoryLabels
type Fact = { value: number; unit: string; start?: string; end: string; filed: string; url: string }
export type FundamentalPhrase = { text: string; method: string; sources: { title: string; url: string }[] }
export type Assessment = { highlights?: FundamentalPhrase[]; risks?: FundamentalPhrase[]; code: string; grade: Grade; category: Category; category_reason: string; category_method: string; category_sources: { title: string; url: string }[]; evidence_gap: string; tags: string[]; reason: string; business: string; reviewed_at: string; review_method: string; facts: Record<string, Fact | null>; sources: { title: string; url: string }[]; runway_months: number | null }
export type PoolReview = { schema_version: number; reviewed_at: string; rows: Assessment[]; excluded: { code: string; reason: string; url: string }[] }

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown): value is string => typeof value === 'string'
const url = (value: unknown) => text(value) && /^https:\/\/[^\s]+$/.test(value)
const phrases = (value: unknown) => value === undefined || (Array.isArray(value) && value.length <= 3 && value.every(item => record(item) && text(item.text) && item.text.trim().length > 0 && item.text.length <= 24 && ['原文提炼', '财报规则初筛'].includes(String(item.method)) && Array.isArray(item.sources) && item.sources.length > 0 && item.sources.every(source => record(source) && text(source.title) && url(source.url))))
const finite = (value: unknown) => typeof value === 'number' && Number.isFinite(value)
export function isPoolReview(value: unknown): value is PoolReview {
  if (!record(value) || value.schema_version !== 2 || !text(value.reviewed_at) || !Array.isArray(value.rows) || !Array.isArray(value.excluded)) return false
  if (!value.rows.every(row => record(row) && text(row.code) && text(row.grade) && Object.hasOwn(gradeLabels, row.grade) &&
    text(row.category) && Object.hasOwn(categoryLabels, row.category) && text(row.category_reason) && text(row.category_method) && text(row.evidence_gap) &&
    Array.isArray(row.category_sources) && row.category_sources.length > 0 && row.category_sources.every(source => record(source) && text(source.title) && url(source.url)) &&
    phrases(row.highlights) && phrases(row.risks) && text(row.reason) && text(row.business) && text(row.reviewed_at) && text(row.review_method) &&
    Array.isArray(row.tags) && row.tags.every(text) && Array.isArray(row.sources) && row.sources.every(source => record(source) && text(source.title) && url(source.url)) &&
    (row.runway_months === null || finite(row.runway_months)) && record(row.facts) && Object.values(row.facts).every(fact => fact === null ||
      (record(fact) && finite(fact.value) && text(fact.unit) && text(fact.end) && text(fact.filed) && (fact.start === undefined || text(fact.start)) && url(fact.url))))) return false
  return new Set(value.rows.map(row => row.code)).size === value.rows.length && value.excluded.every(row => record(row) && text(row.code) && text(row.reason) && url(row.url))
}

export function matchesPoolReview(assessment: Assessment | undefined, grade: string, category: string) {
  return (grade === 'all' || (assessment?.grade ?? 'unknown') === grade) &&
    (category === 'all' || (assessment?.category ?? 'unresolved') === category)
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

