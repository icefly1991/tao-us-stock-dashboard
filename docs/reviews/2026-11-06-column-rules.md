# 逐列生成规则文档核对（REQ-004）

2026-11-06，用户要求每列必须记录生成依据，以便以后更新，不得凭行业猜ETF或猜其它事实。此轮是文档整理，不开展新一轮财务/ETF研究，也不刷新行情。

新增[逐列规则总表](../COLUMN_RULES.md)，从页面字段进入现有专项权威文档。对照`src/App.tsx`、`PriceResearchCell.tsx`、`BoxScreener.tsx`、`RsiCell.tsx`、`VolatilityCell.tsx`及Python的indicators/summary/config/sector_etf、research_pool和已接受CR进行核对。

核对覆盖：

- 主表全部列：序号、标的名称/代码及治理角标、业务/板块与ETF子行、融资稀释整格及三维、收盘、今日、本月、距年线、今年、52周高/低点及进度、建议价四值、近3月波幅、RSI与自身年内分位。
- 研究详情：三档模型/输入/假设/来源及估值日，分析师低/均/高、抓取日与报告日期，融资事实日期/来源/完整性，治理事件状态及复核提醒。
- 箱体全部八列、窗口/宽转窄、长期过滤、未完成耗时、日/周K、原始成交量、RSI、单股研究复用、页头汇总与日期、停牌/失败/短历史。
- 暂隐池类型、等级、亮点/风险和财务事实只记录维护规则；明确没有重启或重新核查该池。

特别保留容易误用的边界：MTD以相邻上月最后有效收盘为基准，YTD仍按现行年内首日有效收盘，不能自行统一；RSI超卖红/超买绿与涨跌颜色不同；三档情景是显式假设下的模型值，不把它当已披露事实；分析师汇总不能改名成情景价格；ETF必须有发行商实际直接持仓，不是行业代理、指数成员或衍生品敞口。

修正文档冲突：README仍写42/43持仓、100活跃、横滑和高风险页可见；业务标签把历史133当现行；VALUATION_SCENARIOS融合展示段仍写机构仅详情；METRIC早期笼统机构时效被后续CR覆盖；RISK_CLASSIFICATION_METHOD类型来源还写按资金等级默认映射，与CR-023及代码不符。均依据既有规则和实现修正，未改金融定义。

变更文件：新增COLUMN_RULES与本报告；更新AGENTS、PROJECT_RULES、README、REQUIREMENTS、CHANGELOG、MONTHLY_REVIEW、ACTIVE_LIST_UPDATE、RESEARCH_MAINTENANCE、BUSINESS_LABELS、RISK_CLASSIFICATION_METHOD、FINANCIAL_DISTRESS、VALUATION_SCENARIOS、METRIC_DEFINITIONS，发布记录写OPERATIONS。

JSON契约影响：无。源码、CSV和public/data研究快照保持不变；没有新研究日期或自动任务。公式/来源/窗口的以后变更仍须按原CR流程记录授权，不能因新增索引绕过。

验证完成：对受影响文档的115条本地文件/标题引用检查通过，0缺失链接；git diff --check通过，变更均为Markdown。Python报告180项通过、Node 4项通过、lint及生产构建成功、Playwright报告107 passed。未重新下载真实行情，原因是本轮没有数据层、symbol、依赖或快照变化；最新功能真实生产验证继续引用CR-049 / Actions 42279725287，不冒充本轮新执行。
