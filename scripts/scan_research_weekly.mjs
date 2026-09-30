import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RELEVANT = /^(10-K|10-Q|20-F|40-F|6-K|8-K|NT 10-K|NT 10-Q|25|15|DEF 14A|S-3|F-3|424B)/
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

export function cikFromSources(sources) {
  for (const source of sources) {
    const match = source.url.match(/\/Archives\/edgar\/data\/(\d+)\//i) ?? source.url.match(/[?&]CIK=(\d+)/i)
    if (match) return match[1].padStart(10, '0')
  }
  return null
}

export function recentFilings(submissions, since) {
  const recent = submissions?.filings?.recent
  if (!recent || !Array.isArray(recent.accessionNumber) || !Array.isArray(recent.form) || !Array.isArray(recent.filingDate) || !Array.isArray(recent.primaryDocument)) throw new Error('Invalid SEC submissions structure')
  if (![recent.form, recent.filingDate, recent.primaryDocument].every(values => values.length === recent.accessionNumber.length)) throw new Error('Inconsistent SEC submissions columns')
  return recent.accessionNumber.map((accession, index) => ({
    accession,
    form: recent.form[index],
    filed: recent.filingDate[index],
    document: recent.primaryDocument[index],
    items: Array.isArray(recent.items) ? recent.items[index] ?? '' : '',
  })).filter(item => item.filed >= since && RELEVANT.test(item.form))
}

async function secJson(cik, email, type = 'submissions') {
  const url = type === 'companyfacts' ? `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json` : `https://data.sec.gov/submissions/CIK${cik}.json`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': `TaoUSStockDashboard weekly-research ${email}`, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
      if ((response.status === 429 || response.status >= 500) && attempt < 2) { await wait(1500 * (attempt + 1)); continue }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    } catch (error) {
      if (attempt === 2) throw error
      await wait(1500 * (attempt + 1))
    }
  }
  throw new Error('SEC request failed')
}

export async function scan({ coverage, pool, governance, email, fetchCompany = secJson, fetchFacts, onEvidence, pauseMs = 300 }) {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('SEC_CONTACT_EMAIL is required for the SEC User-Agent')
  const poolCodes = new Set(pool.rows.map(row => row.code))
  const rows = []
  const errors = []
  for (const company of coverage.rows) {
    const cik = cikFromSources(company.sources)
    if (company.coverage === 'not_applicable') { rows.push({ code: company.code, status: 'not_applicable', filings: [] }); continue }
    if (!cik) { errors.push({ code: company.code, error: 'No verified CIK in coverage sources' }); continue }
    const since = poolCodes.has(company.code) && pool.reviewed_at < governance.reviewed_at ? pool.reviewed_at : governance.reviewed_at
    try {
      const submissions = await fetchCompany(cik, email)
      const oldest = submissions?.filings?.recent?.filingDate?.at(-1)
      if (oldest && oldest > since && submissions?.filings?.files?.length) throw new Error('SEC recent history does not reach research baseline; older archive needed')
      const filings = recentFilings(submissions, since).map(item => ({
        ...item,
        url: `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${item.accession.replaceAll('-', '')}/${encodeURIComponent(item.document)}`,
      }))
      let companyfacts = null
      let factsStatus = 'not_applicable'
      if (poolCodes.has(company.code) && fetchFacts) {
        try { companyfacts = await fetchFacts(cik, email, 'companyfacts'); factsStatus = 'available' }
        catch (error) {
          if (error instanceof Error && error.message === 'HTTP 404') factsStatus = 'not_available'
          else throw error
        }
      }
      if (onEvidence) await onEvidence(company.code, submissions, companyfacts)
      rows.push({ code: company.code, cik, status: filings.length ? 'review_needed' : 'no_relevant_filing', since, filings, pool_member: poolCodes.has(company.code), facts_status: factsStatus, sic: submissions.sic ?? null, sic_description: submissions.sicDescription ?? null, entity_name: submissions.name ?? null })
    } catch (error) {
      errors.push({ code: company.code, cik, error: error instanceof Error ? error.message : 'Unknown SEC error' })
    }
    if (pauseMs) await wait(pauseMs)
  }
  return { schema_version: 1, scanned_at: new Date().toISOString(), pool_reviewed_at: pool.reviewed_at, governance_reviewed_at: governance.reviewed_at, rows, errors }
}

function markdown(report) {
  const relevant = report.rows.filter(row => row.status === 'review_needed')
  const lines = [
    '# 每周 SEC 研究扫描', '',
    `扫描时间：${report.scanned_at}；基本面研究日：${report.pool_reviewed_at}；治理研究日：${report.governance_reviewed_at}。`,
    '',
    `覆盖 ${report.rows.length + report.errors.length} 只：${relevant.length} 只出现待读原文申报，${report.errors.length} 只扫描失败。未见新申报不代表没有风险；SEC 之外的交易所、法院及公司 IR 信息不在本次自动扫描范围。`,
    '',
    '**本任务只发现新申报，不自动更新公司分类、亮点/风险短语、治理事件或“风险观察”，也不改变研究日期。**人工核查原文后按研究维护流程发布。',
    '',
  ]
  for (const row of relevant) {
    lines.push(`## ${row.code}${row.pool_member ? ' · 高风险股票池' : ''}`, '')
    for (const filing of row.filings) lines.push(`- ${filing.filed} · ${filing.form} · [${filing.accession}](${filing.url})`)
    lines.push('')
  }
  if (report.errors.length) {
    lines.push('## 扫描错误', '')
    for (const item of report.errors) lines.push(`- ${item.code}: ${item.error}`)
    lines.push('')
  }
  return lines.join('\n') + '\n'
}

async function main() {
  const coverage = JSON.parse(fs.readFileSync('docs/reviews/2026-09-27-governance-coverage.json', 'utf8'))
  const pool = JSON.parse(fs.readFileSync('public/data/pool-review.json', 'utf8'))
  const governance = JSON.parse(fs.readFileSync('public/data/governance-review.json', 'utf8'))
  if (coverage.rows.length !== governance.rows.length || new Set(coverage.rows.map(row => row.code)).size !== governance.rows.length) throw new Error('Coverage and governance membership mismatch')
  const out = path.resolve('.cache/weekly-research')
  fs.mkdirSync(out, { recursive: true })
  const evidence = path.join(out, 'sec')
  fs.mkdirSync(evidence, { recursive: true })
  const report = await scan({ coverage, pool, governance, email: process.env.SEC_CONTACT_EMAIL ?? '', fetchFacts: secJson, onEvidence: (code, submissions, facts) => {
    fs.writeFileSync(path.join(evidence, `${code}-submissions.json`), JSON.stringify(submissions))
    if (facts) fs.writeFileSync(path.join(evidence, `${code}-facts.json`), JSON.stringify(facts))
  } })
  fs.writeFileSync(path.join(out, 'scan.json'), JSON.stringify(report, null, 2) + '\n')
  const summary = markdown(report)
  fs.writeFileSync(path.join(out, 'report.md'), summary)
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)
  console.log(`SEC scan: ${report.rows.length} rows, ${report.rows.filter(row => row.status === 'review_needed').length} with filings, ${report.errors.length} errors`)
  if (report.errors.length) process.exitCode = 1
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(error => { console.error(error.message); process.exitCode = 1 })
