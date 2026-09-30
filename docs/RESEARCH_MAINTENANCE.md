# 基本面与风险研究维护

判定含义见[基本面分类与风险提示](RISK_CLASSIFICATION_METHOD.md)。本页供下一轮人工复核和发布使用。

1. 核对 CSV 成员、主体身份、最新 SEC/公司原始披露及后续事件。记录报告期、申报日、币种、原文链接，区分已完成与计划中的融资。
2. 分别更新 `scripts/pool_review_overrides.json`、`scripts/pool_categories.json`、`scripts/pool_briefs.json`、`scripts/governance_events.json` 和治理覆盖清单。更换研究日期必须重新取证，不能仅改日期。保留历史/已解决事件并记录当前进展。
3. 先运行 `node scripts/review_pressure.mjs` 生成现金覆盖与跨轴复核清单；逐只审查人工覆盖，尤其是自动初筛 `pressure` 而最终 `watch`、金融专门口径、`supported` 同时重大事件等组合。清单不能代替最新公告核验。
4. 按 `docs/POOL_RESEARCH.md` 的完整命令生成 `pool-review.json`；治理输出用 `python scripts/research_governance.py --coverage <本轮覆盖清单>`。核对成员、等级/类型分布、事件分布、研究日期、来源及页面筛选。
5. 验证：`python -m unittest discover -s tests -v`、`npm run lint`、`npm run build`、`npm test`。研究结果、用户可见解释或 JSON 契约变化同步需求、CR、方法文档、变更记录及生产验证。

不得从 Yahoo 每日行情更新研究日期；目前没有自动新闻监控。当前事件的30天日期是行政复核提醒，不是事件的法定期限或证据更新；过期时页面提醒但不自动解除或升级风险。资金初筛规则变更须先逐只核验可动用资金、债务和人工覆盖，再更新代码及研究快照。

## 每周 SEC 发现任务（CR-024）

`.github/workflows/weekly-research-scan.yml`计划纽约时间每周日10:00运行，可手动触发。先在仓库 Actions Secret 中设置 `SEC_CONTACT_EMAIL` 为用户提供的联系邮箱；不能把值提交到仓库。脚本`scripts/scan_research_weekly.mjs`以最多约每秒3次请求读取SEC submissions API，按治理覆盖清单中的官方CIK扫描；报告写Actions Summary及30天artifact。请求失败使工作流失败，已有人工研究JSON不受影响。

报告列的是自上次人工研究日以来的相关SEC申报，不是逐篇原文结论。周度工作流另下载高风险池companyfacts，复用现有Python规则生成独立`weekly-research.json`，自动发布新财报初筛等级、数字短语、行业描述与新申报提示。旧人工`pool-review.json`、`governance-review.json`和CSV不覆写；新10-K/10-Q/20-F/6-K/8-K及上市事项中的经营/法律语义仍标“待判”。SEC之外的交易所、法院、公司IR和媒体来源仍须另查；无新SEC申报不能解释为无风险。机器扫描日期和人工研究日期不可混称；范围详见[每周基本面清单](WEEKLY_FUNDAMENTALS.md)。
