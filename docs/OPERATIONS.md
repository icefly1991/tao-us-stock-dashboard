# Operations Guide

## 当前生产基线

- 仓库：`https://github.com/icefly1991/tao-us-stock-dashboard`
- 页面：`https://icefly1991.github.io/tao-us-stock-dashboard/`
- Pages Source：GitHub Actions，已启用
- 2026-09-15 [首次端到端验证](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/34970500432)：10 个 Python 测试通过，42/42 个标的成功，复权与未复权各 42 行，失败 0，`data_date=20260915`，构建与部署成功

该基线只证明当次发布成功。排障时必须查看最新工作流和页面 `data_date`，不能据此假设 yfinance 永久可用。

## 首次部署或仓库迁移

1. 将代码推送到名为 `tao-us-stock-dashboard` 的 GitHub 仓库。
2. 进入 `Settings -> Pages`，把 Source 设为 `GitHub Actions`。
3. 进入 `Actions -> Deploy Dashboard`，手动运行一次。
4. 确认 Generate、Python tests、Build frontend、Deploy 四个阶段均成功。

项目不使用行情密钥，不需要配置 GitHub Secrets。

当前仓库已经完成上述步骤；日常不需要用户手工运行。

## 谁负责什么

- 用户：确认标的和含糊代码；批准指标、数据源、频率和页面方向变化；处理仓库账号权限、付费服务或敏感凭据。
- AI/开发者：维护代码、测试、文档、工作流；验证 symbol 和真实数据；排查失败并提交修复。
- 自动化：工作日收盘后获取数据、测试、构建并部署。

## 添加或修改标的

1. 编辑 `scripts/stock_list.csv`。
2. 特殊资产先在 yfinance 验证查询 symbol。
3. 运行 `python scripts/generate_dashboard.py`。
4. 检查终端失败数及 JSON 的 `errors`。
5. 运行 Python 测试、lint 和 build。
6. 更新 `docs/CHANGELOG.md`；若改变既有规则，先建立 CR。

## 常见问题

### 某只标的不显示

- 检查 `symbol` 是否为 yfinance 使用的代码。
- 检查是否刚改名、换代码或退市。
- 查看数据生成日志及 `dashboard.json.errors`。
- 至少两条有效日线才会显示；历史不足 250/252 条只会让长期指标为空，不会删除整行。

### 当天数据没有更新

- 比较页面的 `data_date`，不要只看 `updated_at`。
- 美国节假日没有新日线；GitHub 定时任务也可能延迟。
- yfinance 上游日线可能在收盘后延迟可用，可稍后手动重跑工作流。

### 全部下载失败

- 查看 GitHub Actions 是否能访问 Yahoo 数据源。
- 检查 yfinance 版本升级或上游限流错误。
- 不要用空数据覆盖有效 JSON；当前生成脚本会保留旧文件。

### GitHub Pages 空白或资源 404

- 仓库名称必须与 `vite.config.ts` 的 `base` 一致。
- Pages Source 必须设置为 GitHub Actions。
- 检查前端构建和 Pages artifact 上传步骤。

## 发布前检查清单

- [ ] `python scripts/generate_dashboard.py`
- [ ] 成功/失败标的数量符合预期
- [ ] `python -m unittest discover -s tests -v`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] 页面能切换复权模式和五个长期指标
- [ ] 缺失指标显示“—”并排在末尾
- [ ] CHANGELOG 已更新
- [ ] `AGENTS.md` 的一次读懂摘要已与正式需求同步

## 多列表验证

DATA-007 / UI-002：生成时下载 133 个唯一代码，原列表 42、新列表 100、A/B/C 为 30/35/35。检查 collections 的代码和 summaries，以及页面两种口径下的列表切换。失败代码不删除或猜测替换，按 errors 排障。Windows 可使用 .venv\Scripts\python.exe 和 npm.cmd 执行命令。

### 2026-09-18 多列表生产验证

[运行 35295285660](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35295285660) 已成功部署 ec2ed60。13 项 Python 测试、lint、build 通过，成功 131、失败 2（PSTG、CFLT），两口径各 131 行，data_date=20260917。原列表 42/42、新列表 98/100，A/B/C 分别 30/30、33/35、35/35。PSTG 的 P 映射已准备但待 CR-002 用户确认；CFLT 保留为缺失成员（已收购停止交易）。本地请求因 Yahoo 限流 0 成功 / 133 失败，data_date 不可用，未覆盖占位文件；真实验证以云端运行及线上 JSON 为准。

2026-09-18 验证：[运行 35319942727](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35319942727)，功能提交 dfa84c7；14 项 Python 测试、lint、build、Pages 部署通过。真实数据成功 132、失败 0、停牌 1；两口径各 132 行，data_date=20260918。PSTG 使用 symbol=P，CFLT 独立 suspended 元数据。新列表 99 只有行情 + 1 只停牌，原列表 42 只有行情。

本次变更文件：AGENTS.md、README.md、docs/ARCHITECTURE.md、docs/CHANGELOG.md、docs/CHANGE_REQUESTS.md、docs/DECISIONS.md、docs/REQUIREMENTS.md、docs/OPERATIONS.md、public/data/dashboard.json（仅安全占位与停牌身份）、scripts/stock_list.csv、scripts/data_pipeline/config.py、scripts/data_pipeline/summary.py、scripts/data_pipeline/yfinance_client.py、scripts/generate_dashboard.py、src/App.tsx、tests/test_collections.py。需求 DATA-008/UI-003；JSON 仅新增可选 suspended，原行情行和金融公式不变。风险：停牌配置需按核实结果维护，上游可用性仍取决于 Yahoo；普通取数失败不会被标记为停牌。

## UI-004 浏览器回归

安装临时浏览器检查依赖（不影响生产依赖）：`npm.cmd install --prefix .cache/browser --cache .cache/npm playwright --no-audit --no-fund`。本机须有 Edge。启动 `npm.cmd run dev -- --host 127.0.0.1 --port 5174` 后运行 `node tests/ui-regression.cjs`。可以用 DASHBOARD_TEST_URL 指定其他地址。测试从占位 JSON 生成明确标记的合成数据，仅拦截浏览器请求，不写入产品数据；验证 5 个列表 × 2 口径 × 5 指标的完整排序、缺失和停牌、链接/刷新/前后退、390/768/1440 布局、首行无重叠、滚动吸顶和横向列对齐。

UI-004 已发布：[运行 35327105376](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35327105376)，功能提交 844a8b6。14 项 Python 测试、lint/build、Pages 部署通过。浏览器合成数据回归覆盖 50 组排序、链接刷新/前后退、390/768/1440 吸顶与横向对齐。线上真实数据复核原列表 42、新列表 99 行 + 1 停牌，5 个指标升序；390/1440 首行完整可见且标题表头持续吸顶。云端成功 132、失败 0、停牌 1，data_date=20260918。

本次 UI-004 文件：src/App.tsx、src/index.css、tests/ui-regression.cjs、AGENTS.md、README.md、docs/REQUIREMENTS.md、docs/CHANGE_REQUESTS.md、docs/DECISIONS.md、docs/ARCHITECTURE.md、docs/CHANGELOG.md、docs/OPERATIONS.md。JSON 契约和金融公式不变；hash 链接无需额外服务器路由。无已知阻塞，手机宽度仍使用横向滚动浏览完整指标。

## 复制与 K 线检查（CR-004）

测试：`python -m unittest discover -s tests -v`（当前 21 项）、`npm run lint`、`npm run build`。本地 Vite 5174 启动后运行 `node tests/ui-regression.cjs` 和 `node tests/history-ui-regression.cjs`，使用合成数据拦截检查，不写入生产行情。后者覆盖持仓 43/OSCR 观察归属、复制及失败手动降级、悬停/固定/Esc/焦点返回、缓存、周日切换、口径、版本校验、重试、停牌无图表和手机窗口边界。

生成脚本新增 Chart files / Chart errors 日志；预期 133 个非停牌标的、两口径合计最多 266 个图表文件。图表失败独立记录，不影响有效榜单行；K 线文件 version（updated_at）必须与 dashboard 一致，避免不同发布批次混用。历史文件仅在工作流生成，不提交仓库；本地预览同步同一发布批次的 dashboard 和 history 文件。

EIKN 代码依据：[Nasdaq 上市记录](https://www.nasdaqprivatemarket.com/company/eikon-therapeutics/)，[Yahoo](https://finance.yahoo.com/quote/EIKN/)。实际取数验收以本次生成记录为准。


### 2026-09-19 CR-004 发布验收

[运行 35365878362](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35365878362)，功能提交 5494105：21 项 Python 测试、lint、build、Pages 部署通过。data_date=20260918；榜单成功 133、失败 0、停牌 1。持仓 43（移出 OSCR，加入 EIKN/TTAN），观察列表 100（OSCR 保留）。

图表成功 130 只、两口径共 260 文件；6 个口径级错误对应 MNTN/ONON/IOT 三只股票：源数据最新日 OHLC 不一致，过滤后末日与榜单不同，因此显示暂不可用，不展示旧日冒充当前。原榜单指标未修改。此为剩余上游数据限制，后续每日生成会重新检查。

浏览器合成数据回归通过：原 50 组排序/吸顶/导航检查，以及复制、悬浮/固定、日周切换、复权、失败重试、版本拒绝、缺失提示、移动端边界。真实数据另验本地 5175 与生产页面的 EIKN/TTAN 图表、43 只持仓、OSCR 观察列表归属、MNTN 不可用提示及手机窗口；260 份历史 JSON 同步本地前逐份校验版本/代码/口径。

关联需求 DATA-009/UI-005/UI-006、CR-004、ADR-010。JSON 契约：榜单行新增可选 history_available，独立 data/history/{adjusted|raw}/{code}.json 新增 OHLCV 日/周线、实际区间、区间指标及 skipped_dates；原指标公式不变。实际行情及历史文件不提交仓库。

变更文件：scripts/stock_list.csv、scripts/data_pipeline/{config,indicators,history,yfinance_client}.py、scripts/generate_dashboard.py、src/{App,StockCopy,StockHistoryPreview,StockHistoryChart,icons}.tsx、src/clipboard.ts、package.json/package-lock.json、.gitignore、public/data/dashboard.json（安全占位）、tests/{test_collections,test_history}.py、tests/history-ui-regression.cjs，以及 AGENTS.md、README.md 和 docs 下需求、CR、ADR、架构、指标、变更日志、运行文档。
