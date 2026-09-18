# Metric Definitions

本文档是指标公式的权威技术说明。所有百分比字段保存百分比数值，例如 `5.25` 表示 `5.25%`；有效结果四舍五入到两位小数。

## 公共输入规则

- 数据按 `trade_date` 升序排序并按日期去重。
- `close`、`high`、`low` 必须是有效数值。
- `adjusted` 与 `raw` 从同一次批量下载中分别派生、分别计算，不共享历史基准。
- 至少两条日线才能生成一行。

## 当日涨跌 `today_return_pct`

```text
(最新 close / 上一条有效 close - 1) * 100
```

使用相邻有效数据点，不假设自然日前一天是交易日。该字段需要至少两条记录。

## 距 MA250 `distance_ma250_pct`

```text
MA250 = 最近 250 条有效 close 的算术平均
(最新 close / MA250 - 1) * 100
```

少于 250 条时返回 `null`。不得自动改用 MA200、MA240 或可用历史均值。

## YTD `ytd_return_pct`

```text
(最新 close / 当前自然年第一条有效 close - 1) * 100
```

如果当前年没有有效记录或基准为零，返回 `null`。加密资产也使用自然年第一条可用日线。

## 距 52 周高点 `distance_52w_high_pct`

```text
high_52w = 最近 252 条有效记录中的最大 high
(最新 close / high_52w - 1) * 100
```

少于 252 条时返回 `null`；通常不大于零。

## 距 52 周低点 `distance_52w_low_pct`

```text
low_52w = 最近 252 条有效记录中的最小 low
(最新 close / low_52w - 1) * 100
```

少于 252 条时返回 `null`；通常不小于零。

## 52 周区间位置 `position_52w_pct`

```text
(最新 close - low_52w) / (high_52w - low_52w) * 100
```

`0%` 对应区间低点，`100%` 对应区间高点。这是价格在线性区间中的位置，不是时间进度。少于 252 条或高低点相同时返回 `null`。

## 价格精度

`close` 在 JSON 中最多保留四位小数，以兼容低价股票和加密资产；页面中大于等于 1 的数值通常显示两位，小于 1 的数值最多显示六位。

## K 线历史区间（CR-004 / DATA-009）

同次请求近五个自然年的日线，历史不足时按实际区间展示，不替代严格的 252 条 52 周指标。high=max(high)、low=min(low)、close=最后有效 close；distance_high_pct=(close/high-1)*100；position_pct=(close-low)/(high-low)*100，高低相同则 null；仅在 indicators.py 计算。价格最多 8 位小数、百分比 2 位。

复权 K 线逐日按 Adj Close/Close 调整 OHLC；volume 保留原始数量（股票为股），缺失 null、零值保留。周 K 按周一至周日聚合：open 首条、high 最大、low 最小、close 末条，volume 仅在周内全部有效时求和，否则 null；日期为该周首条有效数据日期。末周可能未结束。

CR-004 数据质量处理：已验证 Yahoo 的 MNTN/ONON/IOT 含历史 OHLC 矛盾日线。图表不修造价格，跳过并以 skipped_dates 记录、窗口明确提示；受影响周按可用日线聚合，周成交量置 null，避免不完整总量冒充完整周。若最新日异常导致图表最后日期与榜单不同，则图表仍不可用。原榜单计算不变。
