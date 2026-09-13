# Changelog

记录用户可见功能、数据口径、部署和重要文档变化。日期使用 `YYYY-MM-DD`。

## 2026-09-14 — Initial US dashboard

关联需求：REQ-001、DATA-001 至 DATA-006、UI-001、OPS-001、OPS-002、NFR-001、NFR-002。

### Added

- 建立 `tao-us-stock-dashboard` 独立项目结构。
- 根据三张截图整理 42 个标的，支持股票、ETF、VIX 指数和 DOGE/USD。
- 增加展示代码到 yfinance symbol 的显式映射。
- 增加 yfinance 批量日线下载、复权/未复权双口径和失败记录。
- 增加纽约时间生成时间、最新数据日期和历史数据点数。
- 增加指标与配置单元测试。
- 建立需求、ADR、CR、指标、架构和运维文档。

### Changed

- 数据源由参考项目的 Tushare A 股接口改为 yfinance。
- 页面改为美股趋势看板并使用美元/非美元分类格式。
- 新上市标的历史不足时保留行，长期指标显示为空。
- 自动任务改为纽约时间工作日 18:30。

### Removed

- 移除创业板/科创板小市值股票池及 Tushare Token 依赖。
