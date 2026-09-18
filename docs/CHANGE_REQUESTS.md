# Change Requests

本文件只记录对已接受需求或 ADR 的修改。新功能先写入 `REQUIREMENTS.md`；修正文案或不改变行为的小问题不必建立 CR。

## 状态

`Draft`、`Proposed`、`Accepted`、`Implemented`、`Rejected`、`Deferred`、`Cancelled`。

## 模板

```markdown
## CR-001：标题

- 状态：Accepted
- 提出日期：YYYY-MM-DD
- 决定日期：
- 关联原需求：DATA-xxx / UI-xxx / OPS-xxx
- 关联新需求：
- 关联决策：ADR-xxx

### 原要求

### 新要求

### 修改原因

### 影响分析

- 数据与公式：
- JSON 兼容性：
- 前端与移动端：
- 自动化与部署：
- 测试与文档：

### 风险与回退

### 验收标准

- [ ] ...

### 决定

### 实施记录
```

## 当前记录

首版为独立美股项目，不把参考 A 股仓库的历史需求视为本项目需求。

## CR-001：新增独立的 A/B/C 股票列表

- 状态：Accepted
- 提出及决定日期：2026-09-18
- 关联：DATA-002、DATA-007、UI-002、ADR-007
- 决定依据：用户本次明确要求在原 watchlist 之外展示所提供的另一份列表，沿用相同数据需求。
- 原要求：42 个标的、一个列表。
- 新要求：保留原 42 个标的，新增 100 只股票及 A/B/C 分档；9 只跨列表重合，共 133 个唯一代码。
- 影响：CSV 增加列表归属与分档；JSON 增加可选 collections，各集合包含代码和 Python 生成的分口径汇总。既有字段、指标、数据源、调度、部署方式保持原义；顶层汇总覆盖全部唯一代码。
- 前端：默认原 watchlist，可切换新列表及 A/B/C；失败股票计入列表总数，并明确展示缺失代码。
- 风险：请求规模增大，上游可能缺失/限流；不得替换无法获取的代码。回退可恢复本次修改前的 CSV 和代码。
- 验收：原列表 42、新列表 100、分档 30/35/35；交集不重复下载；汇总和排序随筛选同步；真实数据与规定测试验证。

## CR-002：PSTG 查询映射到 P 与停牌展示

- 状态：Accepted
- 日期：2026-09-18
- 关联：DATA-002、DATA-007
- 确认依据：用户明确回复“pstg cflt你帮我处理吧，停牌的就显示停牌即可”，授权修复查询映射与停牌展示。
- 影响：仅将 PSTG 查询 symbol 改为 P，展示 code 保留 PSTG、名称 Everpure (P)，列表数量与指标不变。
- 回退：symbol=PSTG，继续显示该标的缺失。
- 实施：PSTG 查询 P；CSV 增加 trading_status/status_note，CFLT 显式标记 suspended。JSON 新增可选 suspended 数组，存储 code/name/symbol/note；停牌标的不下载、不生成数值、不计下载失败或涨跌数，仍计入列表总数；页面在榜单末尾显示停牌与“—”。普通下载失败不得推断为停牌；整批无有效行情仍禁止覆盖。

### 核实依据

2026-09-18，首次云端验证 131/133 成功，PSTG、CFLT 无行情。用户指定公司和列表成员不变：根据 [Everpure 官方公告](https://www.everpuredata.com/company/newsroom/press-releases/everpure-to-change-ticker-symbol.html)，PSTG 的同一家公司已改用 P 交易，保留展示 code PSTG，查询 symbol=P，名称 Everpure (P)，用户已确认。这是本次新增标的的已核实查询映射，非替换投资标的或猜测截图。根据 [Nasdaq 公告](https://www.nasdaqtrader.com/TraderNews.aspx?id=ECA2026-164)，CFLT 收购完成后自 2026-03-18 停止交易；保留该用户输入的成员及缺失提示，不替换为 IBM。
