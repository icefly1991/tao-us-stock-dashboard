import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cikFromSources, recentFilings, scan } from '../scripts/scan_research_weekly.mjs'

test('extracts verified CIK and filters relevant new filings', () => {
  assert.equal(cikFromSources([{ url: 'https://www.sec.gov/Archives/edgar/data/12345/123/doc.htm' }]), '0000012345')
  const result = recentFilings({ filings: { recent: {
    accessionNumber: ['0001-26-000001', '0001-26-000002', '0001-26-000003'],
    form: ['10-Q', '4', '8-K'],
    filingDate: ['2026-09-28', '2026-09-29', '2026-09-26'],
    primaryDocument: ['a.htm', 'b.htm', 'c.htm'],
  } } }, '2026-09-27')
  assert.deepEqual(result.map(item => item.form), ['10-Q'])
})

test('keeps failed company scans visible without refreshing research dates', async () => {
  const coverage = { rows: [
    { code: 'AAA', coverage: 'screened', sources: [{ url: 'https://www.sec.gov/Archives/edgar/data/12345/1/a.htm' }] },
    { code: 'BBB', coverage: 'screened', sources: [{ url: 'https://www.sec.gov/Archives/edgar/data/67890/1/b.htm' }] },
    { code: 'VIX', coverage: 'not_applicable', sources: [] },
  ] }
  const report = await scan({ coverage, pool: { reviewed_at: '2026-09-27', rows: [{ code: 'AAA' }] }, governance: { reviewed_at: '2026-09-27' }, email: 'research@example.com', pauseMs: 0, fetchCompany: async cik => {
    if (cik === '0000067890') throw new Error('HTTP 429')
    return { filings: { recent: { accessionNumber: ['0001-26-000001'], form: ['8-K'], filingDate: ['2026-09-28'], primaryDocument: ['a.htm'] } } }
  } })
  assert.equal(report.rows.find(row => row.code === 'AAA').status, 'review_needed')
  assert.equal(report.rows.find(row => row.code === 'VIX').status, 'not_applicable')
  assert.deepEqual(report.errors.map(row => row.code), ['BBB'])
  assert.equal(report.pool_reviewed_at, '2026-09-27')
})

test('requires a SEC contact and refuses inconsistent API columns', async () => {
  await assert.rejects(scan({ coverage: { rows: [] }, pool: { rows: [], reviewed_at: '2026-09-27' }, governance: { reviewed_at: '2026-09-27' }, email: '' }), /SEC_CONTACT_EMAIL/)
  assert.throws(() => recentFilings({ filings: { recent: { accessionNumber: ['1'], form: [], filingDate: ['2026-09-28'], primaryDocument: ['a.htm'] } } }, '2026-09-27'), /Inconsistent/)
})
