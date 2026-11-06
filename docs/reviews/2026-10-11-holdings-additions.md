# 持仓补充核验（CR-047 / DATA-035）

用户最终要求加入 EIKN、UPST、SOFI、XE。EIKN 原已在持仓；本轮实际新增 UPST、SOFI、XE。UPST/SOFI 保留活跃 A 档，XE 保留高风险池，复用 CSV 唯一代码。持仓46、活跃100、交集12、两列表并集134、高风险池234、全CSV350。

XE 对应 X-Energy，公司 SEC 公告确认 Nasdaq 代码 XE 和先进核反应堆及核燃料业务：[第二季度公告](https://www.sec.gov/Archives/edgar/data/2088896/000119312526347740/xe-ex99_1.htm)。CSV 将泛行业短语“专用工业机械”修正为“先进核反应堆/核燃料”，pool-review 派生字段同步；其它研究结论和日期不变。

## 真实数据核验

同批 yfinance 350成功/0失败/0停牌，data_date=20261009；700历史文件/0图表错误，活跃100及高风险池234箱体扫描均0错误。真实输出在忽略目录 `.cache/sofi-2026-10-11/data/`；仓库dashboard仍安全占位，仅同步集合。生成后按最终CSV重建同批行情集合，持仓46行。

| 代码 | 日线/周线条数 | 收盘价（两口径相同） | RSI14 | 近3月日均波幅 | 融资记录 |
| --- | --- | --- | --- | --- | --- |
| EIKN | 171/36 | 7.47 | 34.5 | 8.14% | 完整，2026-10-06 |
| UPST | 1255/261 | 24.10 | 42.7 | 5.02% | 部分核实，2026-10-06 |
| SOFI | 1255/261 | 15.80 | 38.9 | 4.24% | 部分核实，2026-10-06 |
| XE | 117/25 | 13.71 | 38.4 | 8.68% | 部分核实，2026-10-07 |

两口径身份/版本/最新日匹配，日周K和RSI历史存在。EIKN/XE不足250/252条，不补造MA250或52周值。四只三月波幅各65样本；均有三档估值（实际估值日2026-10-02）、分析师目标价（2026-10-01纽约12:45抓取）及治理记录（研究日2026-09-27）。来源保留于已有逐只详情。

本轮复用已有研究，不是完整月度复核；分析师抓取日不等于报告日，融资partial不升级为complete，名单及其它研究日期不刷新。

## 验证和交付

- Python151项、lint、TypeScript/build通过；Playwright90项通过。默认下载浏览器缺失，沙箱内Edge启动异常，使用已安装Edge在沙箱外完成离线回归，无测试跳过；最终Python直跑退出0。
- 真实构建1440/390px、复权/未复权四组合：持仓46行、四代码唯一、四价可见、价格弹窗显示实际估值日，无页面错误或横向溢出。`.cache/holdings-qa.cjs`退出0。
- 未commit、push或部署。本地真实预览：`http://127.0.0.1:4176/tao-us-stock-dashboard/#/watchlist`。

变更文件：`scripts/stock_list.csv`、`public/data/dashboard.json`、`public/data/pool-review.json`、`tests/test_collections.py`、`tests/history-ui-regression.cjs`、`AGENTS.md`、`docs/REQUIREMENTS.md`、`docs/CHANGE_REQUESTS.md`、`docs/CHANGELOG.md`、`docs/OPERATIONS.md`及本报告。JSON字段/schema、金融公式及更新频率无变化。剩余限制为短历史及既有融资研究缺口，线上尚未更新。
