# Tao US Stock Dashboard

一个面向个人研究的美股趋势看板。项目每天从 yfinance 获取日线数据，在 Python 中统一计算指标，生成静态 JSON，再由 React 页面展示，并通过 GitHub Actions 部署到 GitHub Pages。

> 本项目包含股票、ETF、指数和加密资产，仅用于个人研究，不构成投资建议，也不是实时行情或自动交易系统。

## 当前功能

- 展示截图中整理的 42 个自选标的
- 支持复权价与未复权价切换
- 展示当日涨跌、距 MA250、YTD、距 52 周高点、距 52 周低点和 52 周区间位置
- 支持按指标排序和移动端横向浏览
- 区分最新数据日期与文件生成时间
- 单只标的失败时保留其他成功数据，并把原因写入 `errors`
- 新上市、历史不足 250/252 个数据点的标的仍显示；无法可靠计算的长期指标显示为空

## 数据流程

```text
yfinance
  -> scripts/data_pipeline/yfinance_client.py 获取原始日线并生成两套口径
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

第一次部署：

1. 在仓库 `Settings -> Pages` 中选择 `GitHub Actions`。
2. 打开 `Actions -> Deploy Dashboard -> Run workflow`。
3. 确认数据生成、测试、前端构建和部署全部成功。

yfinance 不需要 API Key，因此仓库不需要行情密钥。

## 文档治理

修改项目前先阅读：

1. [项目长期规则](./PROJECT_RULES.md)
2. [正式需求](./docs/REQUIREMENTS.md)
3. [技术决策](./docs/DECISIONS.md)
4. [变更请求](./docs/CHANGE_REQUESTS.md)
5. [版本记录](./docs/CHANGELOG.md)

功能修改必须关联需求编号；改变已确认口径时必须先记录 Change Request。
