# Tao US Stock Dashboard

一个面向个人研究的美股趋势看板。项目每天从 yfinance 获取日线数据，在 Python 中统一计算指标，生成静态 JSON，再由 React 页面展示，并通过 GitHub Actions 部署到 GitHub Pages。

- 在线看板：<https://icefly1991.github.io/tao-us-stock-dashboard/>
- GitHub 仓库：<https://github.com/icefly1991/tao-us-stock-dashboard>
- AI/维护者一次读懂入口：[AGENTS.md](./AGENTS.md)

> 本项目包含股票、ETF、指数和加密资产，仅用于个人研究，不构成投资建议，也不是实时行情或自动交易系统。

## 当前功能

- 展示截图中整理的 42 个自选标的
- 支持复权价与未复权价切换
- 展示当日涨跌、距 MA250、YTD、距 52 周高点、距 52 周低点和 52 周区间位置
- 支持按指标排序和移动端横向浏览
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

详细结构见 [架构说明](./docs/ARCHITECTURE.md)，指标定义见 [指标口径](./docs/METRIC_DEFINITIONS.md)。

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
```

## 修改自选列表

编辑 `scripts/stock_list.csv`：

```csv
code,name,symbol,asset_type
VIX,CBOE Volatility Index,^VIX,index
DOGEUSD,Dogecoin / US Dollar,DOGE-USD,crypto
NVDA,NVIDIA,NVDA,stock
QQQ,Invesco QQQ Trust,QQQ,etf
```

- `code`：页面显示代码，必须唯一。
- `name`：页面显示名称；为空时使用 `code`。
- `symbol`：交给 yfinance 查询的代码。
- `asset_type`：只允许 `stock`、`etf`、`index`、`crypto`。

修改后先本地运行数据生成和测试。更多说明见 [运行手册](./docs/OPERATIONS.md)。

## 自动更新与部署

工作流位于 `.github/workflows/deploy.yml`，默认在纽约时间工作日 18:30 触发，也支持手动运行。GitHub 定时任务可能延迟，不应把该时间理解为精确承诺。

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

原 Watchlist 保留 42 只；2026-09-18 新增用户提供的 100 只列表，A/B/C 分别 30/35/35。页面按钮可切换两份列表和各档，所有列表共用原有指标和复权切换。共 133 个唯一代码，重合股票在两个列表都可见。

维护只编辑 scripts/stock_list.csv：watchlist=original 表示原列表成员；tier=A/B/C 表示新列表成员；两列可同时有值。新增代码没有用户提供的公司名称时，名称使用 ticker。无法获取行情的代码保留成员资格并在页面提示。相关需求 DATA-007 / UI-002，变更 CR-001。

停牌处理：CSV trading_status 默认 active；已核实且确认的停牌标的设 suspended，并填写 status_note。页面显示“停牌”、指标“—”；不得把限流或下载错误标记为停牌。PSTG 保留展示代码、以新代码 P 查询，CFLT 因收购停止交易按用户要求显示停牌。
