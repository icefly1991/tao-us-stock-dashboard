# 基本面与风险研究维护

判定含义见[基本面分类与风险提示](RISK_CLASSIFICATION_METHOD.md)。用户每月发起名单与研究更新；AI/维护者负责原文核查和发布，完整范围以[月度维护流程](MONTHLY_REVIEW.md)为准。

1. 核对 CSV 成员、主体身份、最新 SEC/公司原始披露及后续事件。记录报告期、申报日、币种、原文链接，区分已完成与计划中的融资。
2. 分别更新 `scripts/pool_review_overrides.json`、`scripts/pool_categories.json`、`scripts/pool_briefs.json`、`scripts/governance_events.json` 和治理覆盖清单。更换研究日期必须重新取证，不能仅改日期。保留历史/已解决事件并记录当前进展。
3. 先运行 `node scripts/review_pressure.mjs` 生成现金覆盖与跨轴复核清单；逐只审查人工覆盖，尤其是自动初筛 `pressure` 而最终 `watch`、金融专门口径、`supported` 同时重大事件等组合。清单不能代替最新公告核验。
4. 按 `docs/POOL_RESEARCH.md` 的完整命令生成 `pool-review.json`；治理输出用 `python scripts/research_governance.py --coverage <本轮覆盖清单>`。核对成员、等级/类型分布、事件分布、研究日期、来源及页面筛选。
5. 验证：`python -m unittest discover -s tests -v`、`npm run lint`、`npm run build`、`npm test`。研究结果、用户可见解释或 JSON 契约变化同步需求、CR、方法文档、变更记录及生产验证。

不得从 Yahoo 每日行情更新研究日期；目前没有自动新闻监控。当前事件的30天日期是行政复核提醒，不是事件的法定期限或证据更新；过期时页面提醒但不自动解除或升级风险。资金初筛规则变更须先逐只核验可动用资金、债务和人工覆盖，再更新代码及研究快照。

## 按需手动取得 SEC 证据（CR-025）

`.github/workflows/weekly-research-scan.yml`现在只有`workflow_dispatch`，没有定时器、写入仓库或部署权限。用户发起月度更新后，AI/维护者可手动触发它辅助取证；无需用户自己操作 GitHub。`SEC_CONTACT_EMAIL` 只作为 SEC User-Agent 使用，不提交到仓库。脚本`scripts/scan_research_weekly.mjs`读取SEC submissions/companyfacts；报告和研究草稿仅保存在30天artifact中。请求失败时保留旧研究快照并报告失败。

草稿只列自上次研究日起的新申报及结构化财务事实，不代替逐篇原文判读。核查10-K/10-Q/20-F/6-K/8-K及上市事项时，还须按月度流程补查交易所、公司IR、监管等来源。只有名单与研究各自完成覆盖验证，才能分别推进对应日期；辅助扫描时间不能冒充研究日期。旧版`weekly-research.json`不再在页面加载或自动更新。
