# PROJECT_RULES

本文件定义项目的长期约束。人工或 AI 修改项目前先读 `AGENTS.md` 获取完整摘要，再按任务读取本文件以及 `docs/REQUIREMENTS.md`、`docs/DECISIONS.md`、`docs/CHANGE_REQUESTS.md`。

## 1. 项目边界

项目是个人日线研究看板，优先保证数据口径一致、失败可见、移动端可读和低维护成本。

项目不是实时行情、交易终端、自动交易系统、价格预警系统或投资建议工具。不得把页面数据描述为实时数据。

## 2. 权威来源

- 新 AI 一次读懂入口：`AGENTS.md`
- 产品范围和验收标准：`docs/REQUIREMENTS.md`
- 技术选择及理由：`docs/DECISIONS.md`
- 指标公式：`docs/METRIC_DEFINITIONS.md`
- 已确认需求的修改：`docs/CHANGE_REQUESTS.md`
- 发布历史：`docs/CHANGELOG.md`

聊天、截图和临时草稿只作为输入；写入正式需求并获得编号后才成为长期约束。

`AGENTS.md` 是便于一次阅读的项目摘要，不替代上述权威文件。正式需求变化时必须同步更新摘要；若摘要与权威文件冲突，应先停止实现并修复冲突。

## 3. 数据规则

1. 核心指标只在 Python 数据层计算，React 只展示和排序。
2. 复权价与未复权价必须独立计算，不得混用历史基准。
3. MA250 使用最近 250 个有效日线收盘价。
4. 52 周窗口使用最近 252 个有效数据点，最高点取 `high`，最低点取 `low`。
5. YTD 基准为当前自然年第一条有效日线的收盘价。
6. 百分比字段存储百分比数值；`5.2` 表示 `5.2%`。
7. 缺失或历史不足必须输出 `null` 或错误，不得伪装成 `0`。
8. 单只标的失败不应阻断其他标的；整批无有效结果时不得覆盖已有有效 JSON。
9. `updated_at` 使用带 UTC 偏移的纽约时间；`data_date` 表示最新常规市场数据日期，两者不得混称。
10. 展示代码与查询代码分离；修改特殊映射时必须验证 yfinance symbol。

改变任何公式、窗口、复权含义或缺失值策略前，必须建立 Change Request。

## 4. 股票列表规则

`scripts/stock_list.csv` 是自选列表的唯一来源。

- `code` 唯一且用于页面展示。
- `symbol` 是 yfinance 查询代码，可以与 `code` 不同。
- `asset_type` 只允许 `stock`、`etf`、`index`、`crypto`。
- 重复 `code` 或未知类型必须让数据生成明确失败。
- 加入新标的后必须验证至少能获取两条日线；不足 250/252 条不等于下载失败。

## 5. 前端规则

- 移动端优先，同时保证桌面端可用。
- 关键指标必须能快速扫描；不要为装饰牺牲信息可读性。
- 缺失指标显示“—”。
- 排序时缺失值始终放在末尾。
- 股票和 ETF 价格可显示美元符号；指数和加密交叉盘不强行标美元。
- 数据来源、数据日期和生成时间必须可见。

## 6. 工程规则

- TypeScript 避免 `any`，数据结构变化时同步修改类型。
- 不在多个文件复制指标公式。
- 新依赖必须在 ADR 或变更记录中说明原因。
- 修改后至少运行 Python 单元测试、前端 lint 和生产构建。
- 不提交 API Key、Cookie、Token、本地虚拟环境或缓存。
- yfinance 上游行为可能变化；依赖升级必须运行真实数据生成验证。

## 7. 需求与变更流程

新功能：讨论 -> 分配需求编号 -> 写入需求与验收标准 -> 必要时新增 ADR -> 实现 -> 验证 -> 更新 CHANGELOG。

修改已确认需求：建立 CR -> 记录原要求、新要求、原因和影响 -> 接受后更新需求/ADR -> 实现和验证。

状态使用：`Draft`、`Accepted`、`In Progress`、`Implemented`、`Superseded`、`Deferred`、`Rejected`。

## 8. Definition of Done

只有同时满足以下条件才算完成：

- 有对应需求编号和验收标准
- 实现与指标文档一致
- Python 测试通过
- 前端 lint 和构建通过
- 用真实 yfinance 数据执行过生成流程
- 移动端布局没有明显回归
- 相关文档及 CHANGELOG 已更新
- 已记录尚存风险，不把未知状态描述为成功

## 9. 提交规范

建议格式：

```text
feat(DATA-002): add ticker mapping support
fix(UI-001): keep missing metrics at end of ranking
docs(ADR-001): clarify yfinance usage boundary
```
