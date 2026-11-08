# Tao US Stock Dashboard

一个面向个人研究的美股趋势看板。项目每天从 yfinance 获取日线数据，在 Python 中统一计算指标，生成静态 JSON，再由 React 页面展示，并通过 GitHub Actions 部署到 GitHub Pages。

- 在线看板：<https://icefly1991.github.io/tao-us-stock-dashboard/>
- GitHub 仓库：<https://github.com/icefly1991/tao-us-stock-dashboard>
- AI/维护者一次读懂入口：[AGENTS.md](./AGENTS.md)
- 每一列的数据来源、生成、核实、日期和缺失规则：[逐列生成规则](./docs/COLUMN_RULES.md)；以后维护数据先读此表及对应专项文档。

> 本项目包含股票、ETF、指数和加密资产，仅用于个人研究，不构成投资建议，也不是实时行情或自动交易系统。

## 当前功能

- 展示CSV维护的持仓与活跃列表（2026-11-06为持仓46、活跃101）；高风险池两页暂隐，历史资料保留
- 支持复权价与未复权价切换
- 展示当日及本月涨跌、距MA250、YTD、52周指标、近3月日均波幅和RSI
- 展示已核实业务、官方实际持仓ETF、融资稀释与重大风险、三档情景估值及分析师低位参考
- 支持双向排序，窄屏按股票纵向分组展示全部字段，不依赖横向滚动
- 区分最新数据日期与文件生成时间
- 单只标的失败时保留其他成功数据，并把原因写入 `errors`
- 新上市、历史不足 250/252 个数据点的标的仍显示；无法可靠计算的长期指标显示为空

## 原始需求与范围边界

用户要求参考 `icefly1991/feng-team-stock-dashboard` 建立一个独立的美股版本，首版使用 yfinance，项目名为 `tao-us-stock-dashboard`，自选列表来自三张截图，并重点保证文档适合未来迭代。

参考项目只提供产品和交互方向。本项目不继承 Tushare、A 股市场分类、创业板/科创板股票池或其他参考仓库历史需求。完整的“用户明确要求”与“V1 实现选择”区分见 [正式需求](./docs/REQUIREMENTS.md)。

## 职责边界

用户负责确认新增/删除标的、含糊代码、指标或数据源等产品变化，以及账号授权、付费选择和敏感凭据配置。AI/开发者负责实现代码、测试、文档、symbol 与真实数据验证、自动化和部署排错。日常更新由 GitHub Actions 自动完成。

## 数据流程

```text
yfinance
  -> scripts/data_pipeline/yfinance_client.py 一次获取原始价格与 Adj Close，派生两套口径
  -> scripts/data_pipeline/indicators.py 计算指标
  -> public/data/dashboard.json
  -> React + Vite 构建
  -> GitHub Pages
```

逐列来源和维护先查[生成规则总表](./docs/COLUMN_RULES.md)，详细结构见[架构说明](./docs/ARCHITECTURE.md)，金融公式见[指标口径](./docs/METRIC_DEFINITIONS.md)。ETF实际持仓、业务与风险属于需核实的事实；估值中的研究预测须显式列出假设，不能伪装成披露事实。

## 本地运行

环境要求：Node.js 22+、Python 3.11+。

```bash
python -m pip install -r requirements.txt
python scripts/generate_dashboard.py
npm ci
npm run dev
```

验证：

```bash
python -m unittest discover -s tests -v
npm run lint
npm run build
npx playwright install chromium
npm test
```

## 修改自选列表

编辑 `scripts/stock_list.csv`：

以下仅解释身份列，不是可替换生产CSV的完整模板。正式增删按[名单流程](docs/ACTIVE_LIST_UPDATE.md)和[逐列维护规则](docs/COLUMN_RULES.md)，同步所需研究与ETF证据；不能只加一个ticker或按行业猜ETF。

```csv
code,name,symbol,asset_type
VIX,CBOE Volatility Index,^VIX,index
DOGEUSD,Dogecoin / US Dollar,DOGE-USD,crypto
NVDA,NVIDIA,NVDA,stock
QQQ,Invesco QQQ Trust,QQQ,etf
```

- `code`：页面显示代码，必须唯一。
- `name`：已核实的公司名称，不使用代码占位。
- `symbol`：交给 yfinance 查询的代码。
- `asset_type`：只允许 `stock`、`etf`、`index`、`crypto`。

修改后先本地运行数据生成和测试。更多说明见 [运行手册](./docs/OPERATIONS.md)。

## 自动更新与部署

工作流位于 `.github/workflows/deploy.yml`，纽约工作日16:15首次尝试，随后每15分钟补跑至19:45，22:30及次日03:15兜底。成功发布同版本目标交易日后跳过后续定时构建；手动/代码推送仍更新。GitHub 定时任务可能延迟，不承诺准点。交易日历、过期门禁与重试细则见[每日更新策略](docs/DAILY_UPDATE.md)。

当前仓库已经启用 GitHub Actions Pages。复制或新建同类仓库时，第一次部署需要：

1. 在仓库 `Settings -> Pages` 中选择 `GitHub Actions`。
2. 打开 `Actions -> Deploy Dashboard -> Run workflow`。
3. 确认数据生成、测试、前端构建和部署全部成功。

yfinance 不需要 API Key，因此仓库不需要行情密钥。

仓库中的 `public/data/dashboard.json` 是占位文件；线上真实行情在每次 GitHub Actions 构建时生成并进入部署产物，不会每天提交回 `main`。

## 文档治理

修改项目前先阅读：

1. [AI/维护者一次读懂入口](./AGENTS.md)
2. [正式需求](./docs/REQUIREMENTS.md)
3. [项目长期规则](./PROJECT_RULES.md)
4. [技术决策](./docs/DECISIONS.md)
5. [变更请求](./docs/CHANGE_REQUESTS.md)
6. [版本记录](./docs/CHANGELOG.md)

功能修改必须关联需求编号；改变已确认口径时必须先记录 Change Request。

## 两份股票列表

2026-11-06已验证持仓46、活跃101，A/B/C为30/36/35，交集12，联合135；所有CSV成员共351，包含保留的隐藏池成员。以后实际数量以CSV及新复核报告为准。两份可见列表和各档共用指标及复权切换。

维护只编辑 scripts/stock_list.csv：watchlist=original 表示原列表成员；tier=A/B/C 表示新列表成员；两列可同时有值。公司名称须核实，不使用 ticker 占位；短业务词组由 CSV business 维护。无法获取行情的代码保留成员资格并在页面提示。相关需求 DATA-007 / UI-002，变更 CR-001。

停牌处理：CSV trading_status 默认 active；已核实且确认的停牌标的设 suspended，并填写 status_note。页面显示“停牌”、指标“—”；不得把限流或下载错误标记为停牌。PSTG 保留展示代码、以新代码 P 查询，CFLT 已按 CR-005 移除，当前没有停牌成员，通用停牌支持保留。

## 页面链接与默认排序

- [原 Watchlist](https://icefly1991.github.io/tao-us-stock-dashboard/#/watchlist)
- [新增列表](https://icefly1991.github.io/tao-us-stock-dashboard/#/research)，分档可用 #/research/A、#/research/B、#/research/C。

默认52周内进度升序；今日、本月及长期指标支持升降序，波幅可降序，缺失与停牌置后，同值按代码。榜单标题、指标按钮与表头吸顶；窄屏按字段标签纵向分组，无需横滑。

当前页面名称为“持仓股”和“活跃股观察列表”，分别对应 #/watchlist 和 #/research，旧链接继续有效。

## 快速复制与 K 线

点击代码即可复制以便粘贴，名称为纯文本；悬停代码速览K线，点击图标固定，手机直接点击。支持最多五年周K、近一年日K和成交量，跟随页面复权模式。Esc/关闭按钮/窗口外点击关闭；历史不足显示实际区间，停牌无图表。成员以CSV为准。

Yahoo最新日线缺价或批次未到目标交易日时阻止发布，保留旧页面。定时任务单次尝试，由下一次15分钟补跑重试；手动/推送最多3次、间隔10分钟。完整目标日历史缓存复用，只补抓失败标的，详见OPS-009 / CR-045。

## 默认视图与回归保障

持仓、活跃及A/B/C分档默认“52周内进度”，导航进入会重置默认指标。详细选股与箱体标准见docs/LIST_REVIEW.md和docs/BOX_DEFINITIONS.md；页面保留折叠说明。

PR及部署前自动执行Python、Node、lint、TypeScript/build与浏览器回归；测试使用固定数据，真实Yahoo数据另由部署验证。最新已发布功能CR-049通过180项Python、4项Node、107项浏览器检查，历史审查见[质量报告](./docs/reviews/2026-09-26-quality.md)，后续实际结果见OPERATIONS。

## 高风险公司股票池
[高风险公司股票池](https://icefly1991.github.io/tao-us-stock-dashboard/#/pool)与[高风险公司箱体研究](https://icefly1991.github.io/tao-us-stock-dashboard/#/pool-boxes)当前按用户要求暂隐，旧链接显示暂停；234个成员和历史资料保留，不因本轮持仓/活跃更新而续其研究日期。恢复前按月度流程确认范围并补齐核查。以下方法供历史维护与以后恢复参考。

按临床研发、商业化前期、亏损融资等类型与资金等级交叉筛选，单股可看原文依据。原57待核实补查56，HUBG保留财报重述缺口；不因池名把全部成员判为经营危机。详见[方法](docs/POOL_RESEARCH.md)和[逐只补充报告](docs/reviews/2026-09-27-high-risk-pool.md)。研究人工维护，不随行情自动更新。
