import { useEffect, useState } from 'react'

export type WeeklyFinancial = { code: string; status: 'new_structured_facts' | 'unchanged' | 'no_structured_facts'; grade: string | null; grade_reason?: string; highlights: { text: string; sources: { title: string; url: string }[] }[]; risks: { text: string; sources: { title: string; url: string }[] }[]; facts: Record<string, { value: number; unit: string; end: string; filed: string; url: string } | null>; facts_filed_at: string | null; source: string | null; manual_grade?: string }
export type WeeklyCompany = { code: string; status: 'new_filings_need_interpretation' | 'no_new_relevant_filing' | 'not_applicable'; filings: { filed: string; form: string; accession: string; url: string }[]; attention?: string[]; sic_description: string | null }
export type WeeklyResearch = { schema_version: 1; scanned_at: string; pool_reviewed_at: string; governance_reviewed_at: string; pool_count: number; company_count: number; pool_rows: WeeklyFinancial[]; company_rows: WeeklyCompany[] }

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const phrase = (value: unknown) => record(value) && typeof value.text === 'string' && Array.isArray(value.sources) && value.sources.every(source => record(source) && typeof source.title === 'string' && typeof source.url === 'string' && source.url.startsWith('https://'))
export function validWeeklyResearch(value: unknown): value is WeeklyResearch {
  if (!record(value)) return false
  const data = value as Partial<WeeklyResearch>
  if (data.schema_version !== 1 || typeof data.scanned_at !== 'string' || typeof data.pool_reviewed_at !== 'string' || typeof data.governance_reviewed_at !== 'string' || !Array.isArray(data.pool_rows) || !Array.isArray(data.company_rows) || data.pool_count !== data.pool_rows.length || data.company_count !== data.company_rows.length) return false
  return data.pool_rows.every(row => record(row) && typeof row.code === 'string' && ['new_structured_facts', 'unchanged', 'no_structured_facts'].includes(row.status) &&
    (row.grade === null || typeof row.grade === 'string') && (row.facts_filed_at === null || typeof row.facts_filed_at === 'string') && (row.source === null || typeof row.source === 'string' && row.source.startsWith('https://')) &&
    Array.isArray(row.highlights) && row.highlights.every(phrase) && Array.isArray(row.risks) && row.risks.every(phrase) && record(row.facts) && Object.values(row.facts).every(fact => fact === null || record(fact) && typeof fact.value === 'number' && Number.isFinite(fact.value) && typeof fact.unit === 'string' && typeof fact.end === 'string' && typeof fact.filed === 'string' && typeof fact.url === 'string' && fact.url.startsWith('https://'))) &&
    new Set(data.pool_rows.map(row => row.code)).size === data.pool_rows.length &&
    data.company_rows.every(row => record(row) && typeof row.code === 'string' && ['new_filings_need_interpretation', 'no_new_relevant_filing', 'not_applicable'].includes(row.status) &&
      (row.attention === undefined || Array.isArray(row.attention) && row.attention.every(item => typeof item === 'string')) &&
      (row.sic_description === null || typeof row.sic_description === 'string') && Array.isArray(row.filings) && row.filings.every(filing => record(filing) &&
        typeof filing.url === 'string' && filing.url.startsWith('https://www.sec.gov/') && typeof filing.form === 'string' && typeof filing.filed === 'string' && typeof filing.accession === 'string')) &&
    new Set(data.company_rows.map(row => row.code)).size === data.company_rows.length
}

export function useWeeklyResearch() {
  const [data, setData] = useState<WeeklyResearch | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch(`${import.meta.env.BASE_URL}data/weekly-research.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('weekly research unavailable'); return response.json() })
      .then((value: unknown) => { if (!validWeeklyResearch(value)) throw new Error('invalid weekly research'); setData(value) })
      .catch(reason => { if (reason?.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [])
  return { data, error }
}
