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

## K 线静态数据（CR-004）

一次 yfinance 批量请求扩展至五年。history.py 校验 OHLC 并聚合周 K，indicators.py 计算区间指标。图表错误单独记录 history_errors，不删除可用榜单。行新增可选 history_available。

生成脚本在榜单 JSON 前导出 data/history/{adjusted|raw}/{code}.json，字段 code/adjustment/updated_at/source/requested_start/actual_start/actual_end/daily/weekly/metrics。daily/weekly 元素 time(YYYY-MM-DD)/open/high/low/close/volume（可 null）。updated_at 与 dashboard 同次生成。CFLT 不生成文件；仓库不提交真实历史行情。

StockCopy/clipboard 提供写剪贴板、旧接口降级和手动复制框。StockHistoryPreview 使用 portal，StockHistoryChart 懒加载 lightweight-charts，按 code/adjustment/updated_at 缓存，失败移除缓存允许重试。页面或口径改变会卸载旧预览；前端只绘图和时间筛选，不计算金融指标。

CR-004 数据质量处理：已验证 Yahoo 的 MNTN/ONON/IOT 含历史 OHLC 矛盾日线。图表不修造价格，跳过并以 skipped_dates 记录、窗口明确提示；受影响周按可用日线聚合，周成交量置 null，避免不完整总量冒充完整周。若最新日异常导致图表最后日期与榜单不同，则图表仍不可用。原榜单计算不变。


## 箱体原型的独立数据流（DATA-013）
同批 dashboard.json + history/adjusted/*.json → generate_boxes.py → data/boxes.json → #/boxes。正常数据生成尾部调用箱体导出，也可 --data-dir 指向本地真实快照重跑。
boxes.json v1：schema_version、updated_at、data_date、source、adjustment、universe/count、market_scan_enabled=false、rows、errors。row包含code/name、状态/原因、基本面待复核标记、箱体指标、形成/观察日期、120条日线及单程端点索引/日期/收益/耗时。全批失败不覆盖旧文件并抛错，主流水线不会部署混合版本。
新文件为生成物并忽略提交；不改变原 dashboard.json 字段与自选CSV。前端仅渲染、筛选和排序，价格指标全在 indicators.py。未来外部发现池是研究输入，未审核前不写入自选CSV。

## CR-008 增量契约
boxes.json升级schema_version=2，新增一年/长期背景字段及独立原始形态状态；前端拒绝v1以避免新页面误用未过滤数据。public/data/list-review.json为提交版本的静态名单维护记录（last_updated、report）；两个生成脚本均不写此文件，UI按北京时间日历差实时计算提醒。日期用于名单维护，与行情生成时间分开。


## CR-009：boxes.json v3
新增每只股票的windows数组（60/90/120/252可用窗口）、默认selected_window_days、prior_box/contracting。窗口含完整rounds、cycle_days、latest_cycle_days、pending_start/days/phase、speed_band、maturity、inner_space_pct、efficiency及图表相对一年背景的索引。bars只保存一份近一年日线，窗口不重复携带日线；所有金融计算仍在indicators.py。
高位过滤作用于每个窗口并保留shape_status，前端切换对照不能绕过。前端仅渲染和排序，详情窗口选择不改变表格默认结果。UI仅接受schema_version=3。原dashboard.json、静态list-review.json、CSV无变化。


## CR-010：向后兼容的RSI辅助对象
dashboard.json两口径每行新增可选rsi，boxes.json v3行同样新增可选rsi，来源是对应同批adjusted行而非另算图表窗口。旧数据没有该字段时UI明确缺失；不更改现有版本门槛和其他字段。
对象字段：period=14、value、percentile_ytd、state、percentile_state、sample_count、sample_start、sample_end、as_of。数值缺失为null，日期ISO自然日或null，样本数为整数。state枚举oversold/neutral/overbought/unavailable；percentile_state为low/high/normal/insufficient/unavailable。
RsiCell为三类表格共用显示组件，前端只格式化数值、展示后端状态与样本说明，不计算RSI或百分位。safe public占位行仍为空，真实数据不提交。


## CR-011 增量契约
- CSV新增business，WatchlistItem默认为空字符串；dashboard两口径行、停牌摘要及boxes行透传该字段。前端没有第二份公司映射。
- 每个history/{adjustment}/{code}.json新增可选rsi_history：{period:14, requested_start:YYYY-MM-DD|null, complete:boolean, points:[{time:YYYY-MM-DD,value:number}]}。使用与表格相同的normalize_history收盘序列计算；不从裁切后的K线重新计算RSI。
- requested_start为该标的最新行情日期减两个自然年。points仅包含裁切区间内有效RSI，值保留一位小数；complete表示有效RSI历史到达起点（容许7个自然日假期差）。历史不足不补数据。上市初期预热缺口也计入不足判断。
- 前端悬停/点击后才请求既有history文件，复用其code/adjustment/updated_at校验并核对最后RSI数值；网络失败、旧版本、缺字段不展示曲线，允许重试。不改变旧K线读取方式，旧前端可忽略附加字段。
- 历史OHLC文件若构建失败，表格RSI仍可用，预览会提示暂不可用。没有增加行情请求或数据源。


## CR-012 / DATA-018：箱体v4
boxes.json schema_version=4。全窗口分位边界与穿越；每轮turns四个side/time/index取代peak三点结构；cycle_days改为三单程轮次自然日算术平均，speed_band=qualified/slow/unknown。新增pending_completed_legs、third_leg_progress_pct、window_start/window_end/recognition_method，去除formation/observation字段。只有v4前端可渲染，不把旧v3两单程计数混用。标签match/watch/rejected/slow/broken/breakout/outside/insufficient/excluded；默认只match/watch。既有RSI/business兼容字段保留但候选表不显示。其他JSON/名单元数据不变。

## CR-013 / DATA-019 增量详情数据
boxes v4的bars保留原始volume并新增可选rsi_value:number|null。生成器用同一history文件的rsi_history.points按time关联到一年bars，不重新计算或截断后重置RSI；既有文件code/mode/updated_at校验仍适用。缺rsi_history则逐日null。所有窗口与一年背景共享该序列，React仅裁切绘图。business复用已有行字段，显示详情而非候选列。向后兼容，schema仍4。
