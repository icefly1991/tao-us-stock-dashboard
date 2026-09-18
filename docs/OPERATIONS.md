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
