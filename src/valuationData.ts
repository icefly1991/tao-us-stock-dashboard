import { useEffect, useState } from 'react'

export const scenarioLabels = { optimistic: '乐观', conservative: '保守', stress: '极端保守' } as const
export type ScenarioKey = keyof typeof scenarioLabels
export type Scenario = { value: number; model: 'enterprise_dcf' | 'asset_recovery'; inputs: Record<string, number | number[]>; assumptions: Record<string, string>; sources: { title: string; url: string }[] }
export type ValuationRow = { code: string; symbol: string; status: 'available' | 'pending' | 'not_applicable'; currency: 'USD'; valued_at: string | null; evidence_date: string | null; reason: string; scenarios: Record<ScenarioKey, Scenario> | null }
type ValuationSnapshot = { schema_version: 1; basis: 'present_value'; generated_at: string; coverage: { available: number; pending: number; not_applicable: number }; rows: ValuationRow[] }

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const date = (v: unknown): v is string => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v

function validInputs(model: unknown, value: Record<string, unknown>): boolean {
  const common = ['discount_rate']
  const expected = model === 'enterprise_dcf'
    ? [...common, 'fcff', 'terminal_growth', 'cash_and_nonoperating_assets', 'debt_and_other_claims', 'diluted_shares']
    : [...common, 'recoverable_assets', 'senior_claims', 'recovery_costs', 'current_common_shares', 'existing_common_entitlement', 'years_to_recovery']
  if (Object.keys(value).length !== expected.length || !expected.every(key => Object.hasOwn(value, key)) || !finite(value.discount_rate) || value.discount_rate <= 0 || value.discount_rate > 1) return false
  if (model === 'enterprise_dcf') return Array.isArray(value.fcff) && value.fcff.length >= 1 && value.fcff.length <= 10 && value.fcff.every(finite) && Number(value.fcff.at(-1)) > 0 &&
    finite(value.terminal_growth) && value.terminal_growth > -1 && value.terminal_growth < value.discount_rate &&
    ['cash_and_nonoperating_assets', 'debt_and_other_claims'].every(key => finite(value[key]) && value[key] >= 0) && finite(value.diluted_shares) && value.diluted_shares > 0
  return ['recoverable_assets', 'senior_claims', 'recovery_costs', 'years_to_recovery'].every(key => finite(value[key]) && value[key] >= 0) &&
    finite(value.years_to_recovery) && value.years_to_recovery <= 10 && finite(value.current_common_shares) && value.current_common_shares > 0 &&
    finite(value.existing_common_entitlement) && value.existing_common_entitlement >= 0 && value.existing_common_entitlement <= 1
}

export function isValuationSnapshot(value: unknown): value is ValuationSnapshot {
  if (!record(value) || value.schema_version !== 1 || value.basis !== 'present_value' || !text(value.generated_at) || !Number.isFinite(Date.parse(value.generated_at)) || !record(value.coverage) || !Array.isArray(value.rows)) return false
  const codes = new Set<string>()
  const counts: Record<string, number> = { available: 0, pending: 0, not_applicable: 0 }
  const valid = value.rows.every(row => {
    if (!record(row) || !text(row.code) || !text(row.symbol) || codes.has(row.code) || row.currency !== 'USD' || !text(row.reason) || !Object.hasOwn(counts, String(row.status))) return false
    codes.add(row.code)
    counts[String(row.status)]++
    if (row.status !== 'available') return row.valued_at === null && row.evidence_date === null && row.scenarios === null
    if (!date(row.valued_at) || !date(row.evidence_date) || row.evidence_date > row.valued_at || !record(row.scenarios)) return false
    const cases = row.scenarios
    if (Object.keys(cases).length !== 3 || !Object.keys(scenarioLabels).every(key => {
      const scenario = cases[key]
      if (!record(scenario) || !finite(scenario.value) || scenario.value < 0 || !['enterprise_dcf', 'asset_recovery'].includes(String(scenario.model)) || !record(scenario.inputs) || !record(scenario.assumptions) || !Array.isArray(scenario.sources) || scenario.sources.length === 0) return false
      const required = ['business', 'valuation', 'financing', 'dilution', ...(key === 'stress' ? ['failure_case'] : [])]
      return required.every(field => text((scenario.assumptions as Record<string, unknown>)[field])) && Object.values(scenario.assumptions).every(text) && validInputs(scenario.model, scenario.inputs) &&
        scenario.sources.every(s => record(s) && text(s.title) && text(s.url) && s.url.startsWith('https://'))
    })) return false
    return (cases.optimistic as Scenario).value >= (cases.conservative as Scenario).value && (cases.conservative as Scenario).value >= (cases.stress as Scenario).value
  })
  return valid && Object.entries(counts).every(([key, count]) => value.coverage && (value.coverage as Record<string, unknown>)[key] === count)
}

export function useValuations() {
  const [data, setData] = useState<ValuationSnapshot | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    fetch(`${import.meta.env.BASE_URL}data/valuation-scenarios.json`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error('valuation fetch failed')))
      .then((value: unknown) => {
        if (!isValuationSnapshot(value)) throw new Error('invalid valuation snapshot')
        if (active) setData(value)
      }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])
  return { data, error }
}
