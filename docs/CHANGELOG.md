# Changelog

记录用户可见功能、数据口径、部署和重要文档变化。日期使用 `YYYY-MM-DD`。

## 2026-09-15 — Production launch and documentation review

关联需求：REQ-001、REQ-002、REQ-003、DATA-001 至 DATA-006、UI-001、OPS-001、OPS-002、NFR-001、NFR-002。

### Added

- 增加 `AGENTS.md` 一次读懂入口，集中记录用户明确需求、V1 实现选择、42 个标的、职责边界和验证基线。
- 记录 GitHub 仓库、线上 Pages 地址和首次生产验证结果。
- 在正式需求中补全三张截图对应的 42 个展示代码及 `PG` 去重说明。

### Changed

- 明确参考项目只提供方向，不继承 Tushare、A 股分类或历史需求。
- 修正文档中的数据流：复权/未复权来自同一次批量下载，V1 指标契约使用 `Close/High/Low` 与 `Adj Close`。
- 将 GitHub Pages 首次启用验收项更新为完成。

### Verified

- [GitHub Actions 端到端运行](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/34970500432)成功：10 个 Python 测试、42/42 标的、复权/未复权各 42 行、失败 0、`data_date=20260915`、Pages 部署成功。

## 2026-09-14 — Initial US dashboard

关联需求：REQ-001、REQ-002、REQ-003、DATA-001 至 DATA-006、UI-001、OPS-001、OPS-002、NFR-001、NFR-002。

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

## 2026-09-18 · 新列表（本地实现，待发布）

- DATA-007 / UI-002、CR-001、ADR-007：保留原 42 只 watchlist，新增 100 只股票和 A/B/C（30/35/35）筛选；合计 133 个唯一代码。
- 汇总随列表与复权模式切换；缺失行情代码在当前列表显示；指标公式和更新时间不变。
- JSON 向后兼容地新增 collections；CSV 仍为唯一成员来源。表格在手机上使用容器内横向滚动。
