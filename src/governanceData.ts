import { useEffect, useState } from 'react'

export const riskKinds = { controls: '重大内控缺陷', accounting: '重述/财报可靠性', listing: '上市合规', survival: '持续经营', financing: '融资依赖', controller: '控制人历史', management: '高管刑事事项', enforcement: '监管调查', operations: '核心业务/许可' }
export const distressLabels = { major: '重大风险', watch: '风险观察', unknown: '核查待补', not_flagged: '事件初筛未触发', not_applicable: '公司生存评估不适用' }
type Distress = { level: keyof typeof distressLabels; reasons: string[] }
export type RiskKind = keyof typeof riskKinds
export type GovernanceEvent = { kind: RiskKind; label: string; detail: string; state: 'current' | 'historical' | 'resolved'; legal_status: 'disclosed' | 'investigation' | 'charged' | 'admitted' | 'adjudicated' | 'alleged'; severity: 'high' | 'elevated' | 'info'; disclosed_at: string; review_due_at?: string; sources: { title: string; url: string }[] }
export type GovernanceRow = { code: string; coverage: 'targeted' | 'screened' | 'unavailable' | 'not_applicable'; filing_date: string | null; sources: { title: string; url: string }[]; events: GovernanceEvent[]; distress?: Distress }
export type GovernanceReview = { schema_version: number; reviewed_at: string; rows: GovernanceRow[] }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const sources = (v: unknown) => Array.isArray(v) && v.every(s => record(s) && text(s.title) && text(s.url) && /^https:\/\/[^\s]+$/.test(s.url))
export function validGovernance(v: unknown): v is GovernanceReview {
  if (!record(v) || v.schema_version !== 1 || !text(v.reviewed_at) || !Array.isArray(v.rows)) return false
  return v.rows.every(r => record(r) && text(r.code) && (r.distress === undefined || (record(r.distress) && text(r.distress.level) && Object.hasOwn(distressLabels, r.distress.level) && Array.isArray(r.distress.reasons) && r.distress.reasons.every(text) && (!['major', 'watch'].includes(r.distress.level) || r.distress.reasons.length > 0))) && ['targeted', 'screened', 'unavailable', 'not_applicable'].includes(String(r.coverage)) && (r.filing_date === null || text(r.filing_date)) && sources(r.sources) &&
    (!['targeted', 'screened'].includes(String(r.coverage)) || (r.sources as unknown[]).length > 0) && Array.isArray(r.events) && r.events.every(e => record(e) && text(e.kind) && Object.hasOwn(riskKinds, e.kind) && text(e.label) && text(e.detail) &&
      ['current', 'historical', 'resolved'].includes(String(e.state)) && ['disclosed', 'investigation', 'charged', 'admitted', 'adjudicated', 'alleged'].includes(String(e.legal_status)) && ['high', 'elevated', 'info'].includes(String(e.severity)) && text(e.disclosed_at) && (e.review_due_at === undefined || text(e.review_due_at)) && sources(e.sources) && (e.sources as unknown[]).length > 0)) && new Set(v.rows.map(r => r.code)).size === v.rows.length
}
export function reviewDue(reviewedAt?: string, dueAt?: string): string | null {
  if (dueAt && /^\d{4}-\d{2}-\d{2}$/.test(dueAt)) return dueAt
  if (!reviewedAt || !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) return null
  const date = new Date(`${reviewedAt}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 30)
  return date.toISOString().slice(0, 10)
}
export function isReviewStale(reviewedAt?: string, dueAt?: string, today = new Date().toISOString().slice(0, 10)): boolean {
  const due = reviewDue(reviewedAt, dueAt)
  return due !== null && today > due
}
export function matchesGovernance(row: GovernanceRow | undefined, filter: string) {
  if (filter === 'all') return true
  if (filter.startsWith('distress:')) return (row?.distress?.level ?? 'unknown') === filter.slice(9)
  if (filter === 'historical') return !!row?.events.some(e => e.state === 'historical')
  return !!row?.events.some(e => e.state !== 'resolved' && (filter === 'current' ? e.state === 'current' : e.kind === filter))
}
export function useGovernance() {
  const [data, setData] = useState<GovernanceReview | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/governance-review.json`, { signal: controller.signal }).then(r => { if (!r.ok) throw Error('unavailable'); return r.json() }).then((v: unknown) => {
      if (!validGovernance(v)) throw Error('invalid governance')
      setData(v)
    }).catch(e => { if (e.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [])
  return { data, error }
}
