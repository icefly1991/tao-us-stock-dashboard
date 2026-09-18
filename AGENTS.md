# AI 一次读懂：Tao US Stock Dashboard

本文件是新 AI 或新维护者进入仓库时的首要入口。读完本文件，应能理解用户原始意图、V1 已实现范围、不可静默改变的约束、职责边界和验证方式。正式验收条款仍以 `docs/REQUIREMENTS.md` 为准；公式以 `docs/METRIC_DEFINITIONS.md` 为准。

## 1. 项目一句话

这是一个独立的美股日线趋势看板：参考 `icefly1991/feng-team-stock-dashboard` 的信息密度和浏览方式，将用户截图中的自选列表改为美股/ETF/指数/加密资产，使用 yfinance 获取数据，生成静态 JSON，并由 React 页面通过 GitHub Pages 展示。

- 项目及仓库名：`tao-us-stock-dashboard`
- GitHub：`https://github.com/icefly1991/tao-us-stock-dashboard`
- 线上页面：`https://icefly1991.github.io/tao-us-stock-dashboard/`
- 本地标准位置：`C:\Users\Tao\tao-us-stock-dashboard`
- 用途：个人研究与趋势观察；不是实时行情、交易终端、自动交易或投资建议工具

## 2. 用户明确提出过的需求

1. 做一个与参考项目相似、但股票列表换成美股的独立项目。
2. 首版行情源使用 yfinance 试运行。
3. 项目名为 `tao-us-stock-dashboard`。
4. 首版列表来自用户提供的三张截图。
5. 文档必须清晰、完整，方便未来持续迭代；新 AI 应能一次读懂需求。
6. 必须分清哪些事项需要用户决定，哪些代码、测试和文档由 AI/开发者完成。

参考项目只提供产品方向和交互参考，不把其 A 股、Tushare、创业板/科创板或其他历史需求继承到本项目。

## 3. V1 已实现并上线的范围

### 自选列表

CSV 唯一来源是 `scripts/stock_list.csv`。当前共 133 个唯一展示代码：持仓股 43 只，活跃股观察列表 99 只（A/B/C 为 30/34/35），跨列表重合 9 只。CSV 的 `watchlist=original` 和 `tier=A/B/C` 管理归属；页面默认原列表（#/watchlist），通过链接进入独立新增列表页面（#/research），后者支持 A/B/C 分档深链接。五个指标均数值升序、弱势优先，缺失与停牌置后；榜单标题、选项和表头统一吸顶，参见 UI-004/CR-003。JSON 通过可选 `collections` 提供成员与 Python 生成的汇总；旧字段与指标公式不变。参见 DATA-007 / UI-002、CR-001、ADR-007。新增功能已通过云端发布：133 只行情成功、0 失败、1 只停牌，新列表 99 只有行情 + CFLT 停牌。PSTG 已核实更名为 P，CR-002 已获用户确认，保留展示代码 PSTG 并查询 P。CFLT 已被收购停止交易，用户要求显示“停牌”：CSV 显式标记 trading_status=suspended，JSON 可选 suspended 数组保留身份与说明；页面末尾展示停牌、指标“—”，不计涨跌或下载失败，不替换为 IBM。未知下载失败不得推断为停牌。最终验证见 docs/OPERATIONS.md。

最初 42 个代码基线如下（历史记录）；当前持仓已按 CR-004 移除 OSCR，加入 EIKN 与 TTAN：

```text
SMR, VIX, IMSR, NABL, HOOD, MP, ORCL, HIMS, BITX, CRWV, IBIT, RZLV,
MCD, IREN, ATCH, CRCL, NVDA, NKE, KLAR, MNTN, MSFT, META, RGTI, NXH,
AVGO, QQQ, ETOR, ARKO, UAA, PG, DOGEUSD, STUB, VOR, MSTR, GEMI, OSCR,
DKNG, AMD, TQQQ, APP, WBTN, FIG
```

截图中 `PG` 在相邻截图的重叠区域重复出现，V1 只保留一行。截图里的 DOGE 代码被截断，V1 将其解释为展示代码 `DOGEUSD`；特殊查询映射是 `VIX -> ^VIX`、`DOGEUSD -> DOGE-USD`。这些是对截图和 yfinance symbol 的 V1 解释，不是用户逐字指定的映射；如果用户更正，应按变更流程更新。不要根据展示代码继续猜测其他特殊 symbol。

### 数据与指标

- 一次 yfinance 批量请求取得原始日线及 `Adj Close`，再派生复权价与未复权价两套结果。
- 榜单指标只需要 `close/high/low`。CR-004 新增独立 K 线 JSON，包含 OHLC 与原始 volume（缺失 null），不改变榜单指标公式。一次下载范围扩展至五年，以支持周 K / 日 K 速览。
- 指标：当日涨跌、距 MA250、YTD、距 52 周高点、距 52 周低点、52 周区间位置。
- MA250 严格要求 250 条有效日线；52 周指标严格要求 252 条；历史不足时输出 `null`，但保留标的。
- `updated_at` 是带偏移的纽约生成时间；`data_date` 是最新常规市场数据日，两者含义不同。
- 单只失败时保留其他标的；整批无有效行时不得覆盖已有有效 JSON。

### 页面与自动化

- 默认显示“复权价”和“距年线”，用户可切换复权口径及五个长期指标。
- 手机优先，桌面可用；缺失指标显示“—”并排在排序末尾。
- GitHub Actions 在纽约时间工作日 18:30 尝试更新，也支持手动触发。
- 工作流依次安装依赖、运行 Python 测试、生成真实行情、lint、构建并部署 Pages。
- 仓库中的 `public/data/dashboard.json` 是无真实行情的安全占位文件；线上真实 JSON 在工作流构建时生成，不回写 `main`。

## 4. 明确需求与 V1 实现选择的区别

用户明确选择了美股列表、yfinance、项目名称和文档优先。

以下属于 V1 的实现选择或技术事实：yfinance 当前不需要 API Key；指标使用 250/252 窗口；自动任务按纽约时间 18:30 尝试运行；项目采用静态 JSON、React/Vite 和 GitHub Pages。这些内容已记录为当前基线，但不应伪称为用户逐项原话。

这些 V1 选择现在构成已接受基线。若要改变数据源、公式、窗口、复权含义、更新时间、JSON 契约或部署方式，必须先在 `docs/CHANGE_REQUESTS.md` 建立 CR，说明影响并取得用户确认。

## 5. 职责边界

需要用户决定或操作：

- 确认新增/删除哪些标的，以及含糊截图代码的真实含义。
- 批准指标口径、数据源、更新频率、页面方向等产品级变化。
- 完成只有仓库所有者能做的账号授权、付费服务选择或敏感凭据配置。

由 AI/开发者完成：

- 编写和维护 Python、React、测试、工作流及文档。
- 验证 symbol、真实行情、指标边界、移动端表现和部署结果。
- 把每次功能变更关联到需求编号，更新 ADR/CR/CHANGELOG，并如实报告失败和风险。

未经用户确认，不得替用户选择收费行情源、改变金融指标含义、扩大为交易系统，或根据模糊截图猜测并固化新代码。

## 6. 权威文件与阅读路由

1. `docs/REQUIREMENTS.md`：功能范围、来源、状态和验收标准。
2. `PROJECT_RULES.md`：长期不可静默破坏的工程规则。
3. `docs/METRIC_DEFINITIONS.md`：指标公式唯一权威来源。
4. `docs/DECISIONS.md`：V1 技术选择及代价。
5. `docs/ARCHITECTURE.md`：数据流和 JSON 契约。
6. `docs/OPERATIONS.md`：部署、更新、排错和生产基线。
7. `docs/CHANGE_REQUESTS.md`：修改已接受需求的流程。
8. `docs/CHANGELOG.md`：已经发布的变化。

若摘要与正式文件冲突，停止实现并先修正文档冲突，不要自行挑选有利版本。

## 7. 修改规则

- 每个功能变更必须引用现有需求 ID，或先新增带验收标准的需求。
- 修改已接受公式、窗口、复权含义、缺失值规则、更新时间、数据源或 JSON 契约前，先建立并接受 CR。
- 指标只在 `scripts/data_pipeline/indicators.py` 计算；React 只展示和排序。
- 自选列表只改 `scripts/stock_list.csv`，不要在前端再维护一份映射。
- 用户可见、数据、部署或文档治理变化必须更新 `docs/CHANGELOG.md`。
- 正式需求变化时同步更新本文件的“一次读懂”摘要。

## 8. 完成前验证

```text
python -m unittest discover -s tests -v
npm run lint
npm run build
```

数据层、symbol 或依赖变化还必须运行 `python scripts/generate_dashboard.py`，或用 GitHub Actions 对真实 yfinance 数据完成同等验证。报告成功/失败标的数和 `data_date`，不得把限流或未知状态写成成功。

最终交付需列出：变更文件、需求 ID、验证结果、JSON 契约影响和剩余风险。

## 9. 已验证生产基线

2026-09-15 的 [GitHub Actions 端到端运行](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/34970500432)通过：10 个 Python 测试通过、42/42 个标的成功、复权与未复权各 42 行、失败 0、最新数据日 `20260915`、Pages 部署成功。该记录是当时的验证证据，不代表 Yahoo/yfinance 永久可用。

当前 V1 没有已知阻塞项，也不需要用户配置行情密钥或手动执行每日更新。待用户确认的仅是未来产品变化，以及用户若认为截图中的 DOGE 代码解释或其他 symbol 映射不正确时给出的更正。

## 当前页面命名（2026-09-18 用户确认）

原 watchlist 对应“持仓股”（#/watchlist），新增 100 只列表对应“活跃股观察列表”（#/research）。历史文档中的原列表/新增列表指这两个集合；成员、代码和公式不变。

## 复制与 K 线速览（CR-004）

持仓 43、观察列表 100、交集 9、合计 134（CFLT 停牌）。EIKN 为 Eikon Therapeutics；OSCR 仅移出持仓，TTAN 同时属于两列表。点击名称/代码复制；悬停代码预览，点图标固定，手机点击打开。data/history/{adjusted|raw}/{code}.json 按需加载，版本、代码、口径须与榜单一致；停牌不请求图表。参见 DATA-009/UI-005/UI-006。

CR-004 已发布并验证：21 项 Python 测试、lint/build 及浏览器回归通过；data_date=20260918，133 只榜单成功、0 失败、CFLT 停牌。130 只提供两口径共 260 个 K 线文件；MNTN/ONON/IOT 最新日 OHLC 矛盾，图表明确不可用，榜单保留。生产与本地真实数据窗口验证见 docs/OPERATIONS.md。

CR-005 / UI-007 / DATA-010（2026-09-19）覆盖此前要求：名称为纯文本，仅代码可复制；CFLT 已从 CSV 移除，当前停牌成员为 0，通用停牌支持保留。持仓 43、观察 99、交集 9、合计 133。前述 CFLT 保留、134/100 数量和名称复制是历史记录。季度研究标准和待配置任务见 docs/LIST_REVIEW.md；未注册自动任务。

CR-005 最新发布：133 成功/0 失败/0 停牌，data_date=20260918；K 线 262 文件，ONON/IOT 暂不可用，MNTN 恢复。21 项测试、lint/build 和浏览器检查通过；历史运行数量不代表当前列表。

研究偏好 RES-001（2026-09-19 用户纠正）：高波动优先、实质业务支撑；CRWV/CRCL 是正面目标样本，不因融资/监管/估值风险自动降级，不要求已盈利、正现金流或无需融资。撤回以 NVDA/AVGO/ANET 为更稳健替代方向的建议；不改现有持仓。具体标准与季度模板以 docs/LIST_REVIEW.md 最新目标为准。
