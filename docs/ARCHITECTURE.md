# Architecture

## 目标

用最少运维组件提供每日趋势看板，同时把行情依赖、计算口径和页面展示分离，便于未来更换数据源或新增指标。

## 组件

```text
scripts/stock_list.csv
        |
        v
yfinance_client.py -- 批量下载原始价格与 Adj Close，派生 adjusted/raw
        |
        v
indicators.py ------ 唯一的指标计算层
        |
        v
summary.py --------- 汇总、来源、时间和错误元数据
        |
        v
public/data/dashboard.json
        |
        v
src/App.tsx -------- 展示、排序、模式切换
        |
        v
Vite dist ---------- GitHub Pages
```

## 数据契约

顶层字段：

- `source`：固定为 `yfinance`。
- `updated_at`：带 UTC 偏移的纽约时间生成时间。
- `data_date`：成功的股票、ETF 或指数中的最新日期，格式 `YYYYMMDD`；仅在没有常规市场数据时才回退到加密资产日期。
- `adjustments.adjusted/raw`：每种口径的 `summary` 和 `rows`。
- `errors`：可选；仅在发生错误时存在。

仓库中的 `public/data/dashboard.json` 是无真实行情的安全占位文件。GitHub Actions 在构建期间生成真实文件并打入 Pages artifact，不把每日行情回写 `main`。

行字段：

- 身份：`code`、`name`、`symbol`、`asset_type`
- 数据：`close`、`history_days`、`adjustment`
- 指标：`today_return_pct`、`distance_ma250_pct`、`ytd_return_pct`、`distance_52w_high_pct`、`distance_52w_low_pct`、`position_52w_pct`

长期指标允许为 `null`，前端不得将其转换为零。

## 失败边界

- 单个 symbol 缺失：按受影响口径记录错误，其他 symbol 继续。
- 整次批量下载失败：两个口径均无可生成行，记录批量错误和逐标的错误。
- 没有任何有效行：生成脚本不覆盖已有 JSON，并返回失败状态阻止空看板部署。
- 前端 JSON 加载失败：显示明确错误状态，不显示伪造数据。

## 扩展点

- 更换数据源：新增客户端并继续输出标准化 `trade_date/close/high/low` DataFrame。
- 新增指标：先写需求与公式，再在 `indicators.py` 实现，更新 JSON 类型和 UI。
- 新增资产：先确认 yfinance symbol 和资产类型，不在前端硬编码映射。

## 多列表扩展（CR-001 / DATA-007 / UI-002）

CSV 增加 watchlist、tier：原 42 只标记 watchlist=original，新 100 只标记 tier=A/B/C，9 只兼属两个列表。所有代码仍唯一，共 133 只。旧 CSV 无新增列时默认为原列表。

可选顶层 collections 为数组，每项包含 id（original/research/A/B/C）、label、codes（含下载失败的代码）及 summaries.adjusted/raw。汇总仍为 watchlist_total/today_up/today_down，总数为成员数量，涨跌数仅统计成功行。原 adjustments 行字段不变，顶层汇总涵盖全部唯一代码。页面根据 codes 筛选行，显示当前列表缺失代码；无 collections 的旧 JSON 回退为原有单列表视图。

## 停牌扩展（CR-002）

CSV 新增 trading_status（active 默认 / suspended）和 status_note。顶层可选 suspended 数组：code/name/symbol/note。该数组仅为身份和已知状态，独立于 adjustments.rows；停牌标的不下载、不生成行情行、不计涨跌/成功/失败数，总数仍保留。前端兼容没有 suspended 的旧 JSON。普通下载失败仍使用 errors，不标记停牌。

## 页面与榜单（UI-004）

默认根 URL 展示原列表；#/watchlist 与 #/research 是两个独立视图，通过原生链接切换，新增分档支持 #/research/A、B、C。hashchange 响应前后退并回到页面顶部。JSON 契约未改。榜单表头在表体横向滚动容器外吸顶，表头表体 scrollLeft 双向同步，列宽共享 .market-grid。五个指标数值升序；不在 React 计算金融指标。
