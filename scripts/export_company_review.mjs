import fs from 'node:fs'

const pool = JSON.parse(fs.readFileSync('public/data/pool-review.json', 'utf8'))
const governance = JSON.parse(fs.readFileSync('public/data/governance-review.json', 'utf8'))
const risk = new Map(governance.rows.map(row => [row.code, row.distress?.level ?? 'unknown']))
const categories = { clinical: '临床研发型', precommercial: '商业化前期', funded_loss: '亏损融资型', turnaround: '经营修复/扩张', commercial_medical: '医药商业化', digital_assets: '数字资产型', financial: '金融/地产/投资', operating: '经营已有支撑', disclosure_risk: '财报/披露风险', unresolved: '类型未核实' }
const grades = { supported: '当期经营初筛有支撑', watch: '亏损/转型观察', pressure: '融资/经营压力', unknown: '待核实' }
const risks = { major: '重大风险', watch: '风险观察', unknown: '核查待补', not_flagged: '事件初筛未触发', not_applicable: '不适用' }
const cashCover = row => {
  if (['financial', 'digital_assets', 'disclosure_risk'].includes(row.category)) return null
  const cash = row.facts.cash
  const ocf = row.facts.operating_cash_flow
  if (!cash || !ocf || !ocf.start || ocf.value >= 0 || cash.value < 0) return null
  const days = (Date.parse(ocf.end) - Date.parse(ocf.start)) / 86400000 + 1
  return Number.isFinite(days) && days >= 60 ? cash.value / -ocf.value * days / 365.25 * 12 : null
}
const rows = pool.rows.map(row => ({
  code: row.code,
  name: row.name,
  category: categories[row.category] ?? row.category,
  category_method: row.category_method,
  grade: grades[row.grade] ?? row.grade,
  grade_method: row.review_method,
  distress: risks[risk.get(row.code)] ?? '核查待补',
  cash_cover_months: cashCover(row),
  review_signal: cashCover(row) !== null && cashCover(row) < 12 ? '现金覆盖<12月：待核' : '',
  reason: row.reason,
}))
const priority = { '重大风险': 0, '风险观察': 1, '核查待补': 2, '事件初筛未触发': 3, '不适用': 4 }
rows.sort((a, b) => priority[a.distress] - priority[b.distress] || a.code.localeCompare(b.code))
const headers = ['代码', '公司', '经营类型', '类型依据', '基本面等级', '等级依据', '生存风险', '现金覆盖月', '复核信号', '等级解释']
const values = row => [row.code, row.name, row.category, row.category_method, row.grade, row.grade_method, row.distress, row.cash_cover_months === null ? '' : row.cash_cover_months.toFixed(1), row.review_signal, row.reason]
const csv = [headers, ...rows.map(values)].map(items => items.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n') + '\n'
fs.writeFileSync('docs/reviews/2026-09-29-company-results.csv', '\uFEFF' + csv)
const md = [
  '# 高风险股票池逐家公司结果',
  '',
  `研究快照：基本面 ${pool.reviewed_at}；治理风险 ${governance.reviewed_at}。共 ${rows.length} 只。表中等级沿用现有人工覆盖及财报初筛结果，没有按现金覆盖信号批量重分级。`,
  '',
  '“现金覆盖<12月”只表示需要核查可动用资金、债务和后续融资；金融、数字资产和披露风险类型不套用该通用估算。空白表示不触发、行业不适用或可比值不足，不表示安全。“事件初筛未触发”也不是安全评级。',
  '',
  '完整等级解释、依据方法和每家公司原因见同目录 CSV；逐只资金复核细项见 [资金压力清单](2026-09-29-pressure-diff.md)。',
  '',
  '| 代码 | 公司 | 经营类型 | 基本面等级 | 生存风险 | 现金覆盖月 | 复核信号 |',
  '| --- | --- | --- | --- | --- | ---: | --- |',
  ...rows.map(row => `| ${row.code} | ${row.name.replaceAll('|', '\\|')} | ${row.category} | ${row.grade} | ${row.distress} | ${row.cash_cover_months === null ? '—' : row.cash_cover_months.toFixed(1)} | ${row.review_signal || '—'} |`),
]
fs.writeFileSync('docs/reviews/2026-09-29-company-results.md', md.join('\n') + '\n')
console.log(`Exported ${rows.length} companies; ${rows.filter(row => row.review_signal).length} cash cover signals`)
