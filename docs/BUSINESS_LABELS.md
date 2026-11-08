# 业务/板块标签维护

UI-014 / DATA-017。唯一内容来源为scripts/stock_list.csv business字段，当前成员以CSV为准；2026-09-19的133个标的是历史快照。页面不重复维护映射；这是便于浏览的主营业务短语，不是评级或统一行业分类标准。逐列维护见[COLUMN_RULES](COLUMN_RULES.md)。

业务标签和ETF持仓是两项独立核查：知道主营业务不代表某ETF实际持有该股票。ETF必须按[ETF_HOLDINGS](ETF_HOLDINGS.md)查发行商官方直接持仓；无证据不配代码。

原活跃列表标签以用户提供的主营业务说明为基础，补足持仓资产、后续增补公司，ETF明确杠杆/指数/期货或现货属性。名称/代码/成员及风险分档本轮不变。

对较容易沿用旧业务的公司，核验以下官方资料：
- NXH：[Neighborhood Intelligence官网](https://www.neighborhoodintelligence.com/)，概括为家居零售/服务。
- VOR：[Vor Bio管线](https://www.vorbio.com/our-pipeline/)，概括为自身免疫新药，避免沿用旧肿瘤业务描述。
- EIKN：[Eikon管线](https://www.eikontx.com/pipeline/)，概括为肿瘤新药研发。

后续名单维护同时复核business；信息不确定则留空显示“—”，不得用代码替代业务描述。此轮短标签核验不等同于完成箱体候选公司的财务/基本面专项复核。
