import fs from 'node:fs'

const review = JSON.parse(fs.readFileSync('public/data/pool-review.json', 'utf8'))
const governance = JSON.parse(fs.readFileSync('public/data/governance-review.json', 'utf8'))
const riskByCode = new Map(governance.rows.map(row => [row.code, row.distress?.level ?? 'unknown']))
const lines = ['# 资金压力与分类交叉复核清单', '', `研究快照：${review.reviewed_at}；本报告仅使用现有结构化事实，不更新研究日期、等级或风险标签。`, '', '现金覆盖=现金及等价物÷报告期经营现金净流出×报告期月数；不含短期投资、受限资金、资本开支与到期债务。低于12个月仅是复核信号。', '', '| 代码 | 现金覆盖月 | 流动资产覆盖月 | 融资现金流 | 当前等级 | 类型 | 生存风险 | 复核重点 |', '| --- | ---: | ---: | --- | --- | --- | --- | --- |']
const candidates = []
const conflicts = []
for (const row of review.rows) {
  const facts = row.facts
  const ocf = facts.operating_cash_flow
  if (row.grade === 'supported' && riskByCode.get(row.code) === 'major') conflicts.push(`${row.code}: supported + major`)
  if (row.category === 'operating' && row.grade === 'pressure') conflicts.push(`${row.code}: operating + pressure`)
  if (['financial', 'digital_assets', 'disclosure_risk'].includes(row.category)) continue
  if (!ocf || ocf.value >= 0 || !ocf.start || !facts.cash || facts.cash.value < 0) continue
  const days = (Date.parse(ocf.end) - Date.parse(ocf.start)) / 86400000 + 1
  if (!Number.isFinite(days) || days < 60) continue
  const months = days / 365.25 * 12
  const cashCover = facts.cash.value / -ocf.value * months
  if (cashCover >= 12) continue
  const asset = facts.current_assets?.value
  const assetCover = asset == null || asset < 0 ? null : asset / -ocf.value * months
  const financing = facts.financing_cash_flow?.value
  const financeLabel = financing == null ? '缺值' : financing > 0 ? '净流入' : financing < 0 ? '净流出' : '零'
  const needs = [row.review_method === '原文专项核查' ? '核对人工覆盖理由' : '核对最新原文', '核对可动用短期投资/受限资金', '核对到期债务']
  candidates.push({code: row.code, cashCover, assetCover, financing, grade: row.grade, category: row.category})
  lines.push(`| ${row.code} | ${cashCover.toFixed(1)} | ${assetCover == null ? '缺值' : assetCover.toFixed(1)} | ${financeLabel} | ${row.grade} | ${row.category} | ${riskByCode.get(row.code)} | ${needs.join('；')} |`)
}
lines.push('', `候选 ${candidates.length} 只；其中融资非正或缺值 ${candidates.filter(r => r.financing == null || r.financing <= 0).length} 只；最终等级不是 pressure ${candidates.filter(r => r.grade !== 'pressure').length} 只。`, '', '## 跨轴复核', '', ...(conflicts.length ? conflicts.map(v => `- ${v}`) : ['- 当前快照没有 supported + major 或 operating + pressure 组合。']), '', '以上为筛查，不是逐只最新公告核查或评级变更。')
fs.writeFileSync('docs/reviews/2026-09-29-pressure-diff.md', lines.join('\n') + '\n')
console.log(`Cash cover candidates: ${candidates.length}; cross-axis conflicts: ${conflicts.length}`)
