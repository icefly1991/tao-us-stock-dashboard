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


## 2026-09-19 CR-005 验收

需求 UI-007/DATA-010：名称纯文本，仅代码复制；观察列表移除 CFLT。持仓 43、观察 99（30/34/35），唯一代码 133，无停牌成员。JSON 结构和指标公式不变，通用停牌支持继续保留。

[生产运行 35373688987](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35373688987)，提交 ee880f8：21 项 Python 测试、lint、build、Pages 部署成功。真实 yfinance 榜单成功 133、失败 0、停牌 0，data_date=20260918。K 线 262 文件，ONON/IOT 最新 OHLC 源数据不一致导致 4 个口径级错误，窗口明确暂不可用；MNTN 本次已恢复。

本地浏览器通过原 50 组排序/吸顶/导航与复制/K 线回归；真实本地页面确认 99 只观察、43 只持仓、名称无按钮、代码按钮保留、TTAN K 线正常。季度复核文档仅是研究规范和待配置模板，未注册自动任务，未应用建议的主观增删/分档。

变更文件：src/App.tsx、scripts/stock_list.csv、public/data/dashboard.json（安全占位）、tests/test_collections.py、tests/history-ui-regression.cjs、AGENTS.md、docs/{REQUIREMENTS,CHANGE_REQUESTS,CHANGELOG,DECISIONS,OPERATIONS,LIST_REVIEW}.md。研究代表性公司资料截至 2026-09-19，非全名单逐只尽调或当前估值审核。

线上另验名称按钮移除、观察 99/无停牌、TTAN 真实 K 线；首次图表网络加载超时，重试通过。最新 262 份历史文件已逐份校验同批版本并同步本地。

## DATA-011 名称数据修复

原因：CSV 中大量新增股票的 name 被初始化为 ticker；不是 React 重复渲染。数据源核实于 2026-09-19：[Nasdaq 股票目录](https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt)、[其他交易所目录](https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt)。移除证券类别后保留公司名称；RH 现名确实与代码相同，显示 RH (formerly Restoration Hardware)，依据 [RH FAQ](https://ir.rh.com/resources/faq)。名称仅改 CSV，不增加行情请求、前端映射或 JSON 字段。

DATA-011 验收：补齐 91 条名称。21 项 Python 测试、lint/build 通过；本地与线上浏览器逐行检查两页面/两口径，133 条名称非空且不重复代码，持仓 43/观察 99、名称无复制按钮。生产运行 [35375181062](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35375181062)，提交 c1c9951：真实行情 133 成功、0 失败、0 停牌，data_date=20260918；262 个 K 线文件，4 个口径级源数据错误沿用明确不可用提示。变更文件 scripts/stock_list.csv、AGENTS.md、docs/REQUIREMENTS.md、docs/CHANGELOG.md、docs/OPERATIONS.md；JSON 契约不变。长名称按现有布局省略，鼠标停留可查看完整名称；名称未来变更需维护 CSV。


## 2026-09-19 CR-006 名单更新

DATA-012/RES-003：按用户要求排除中概，边界 AOSL 因中国经营敞口从严排除。移除 FUTU/TIGR/LI/XPEV/BILI/ACMR/AOSL，增加观察 FIG/FSLY/POWL/HUT/WULF/ASTS/IONQ/CRSP。观察 100（30/35/35），持仓 43，交集 10，唯一代码 133。FIG 仅加观察归属，不新增重复行。

[生产运行 35420819068](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35420819068)，功能提交 7a3399a。21 项 Python 测试、lint/build、50 组排序/吸顶/导航及复制/K 线浏览器回归通过；真实 yfinance 133 成功、0 失败、0 停牌，data_date=20260918，266 个 K 线文件、图表错误 0。之前 ONON/IOT 等图表不可用是历史数据源状态，本批已恢复。

变更文件：scripts/stock_list.csv、public/data/dashboard.json（安全占位）、tests/test_collections.py、AGENTS.md、docs/{REQUIREMENTS,CHANGE_REQUESTS,CHANGELOG,LIST_REVIEW,OPERATIONS}.md、docs/reviews/2026-09-19-ex-china.md。JSON 契约、榜单公式、数据源与更新频率不变。详细业务依据、波动证据、分类边界见研究记录。定时复核任务尚未注册，不因模板更新声称自动执行。

CR-006 最终复核：本地 5175 与线上页面均通过 100 只观察/43 只持仓、七只剔除、八只新增和两口径全部 16 个新成员 K 线及手机边界检查。266 份历史文件已逐份核验版本/代码/口径并同步本地；同批 60 日波动及流动性代理统计存入研究记录。

## 2026-09-19 UI-008 本地验证

52 周位置视图新增距 52 周低点列。变更文件：src/App.tsx、src/index.css、tests/ui-regression.cjs、AGENTS.md、docs/{REQUIREMENTS,CHANGELOG,OPERATIONS}.md。直接读取现有字段，JSON 契约、公式、数据源及排序均不变。

21 项 Python 测试、lint、build、开发页面浏览器回归通过；50 组列表/口径/指标检查新增列数及百分比（含缺失），390/768/1440 下同时验证原七列和新增八列的首行、吸顶及横向对齐。本地 5175 已构建并恢复原有真实行情及配套历史文件，行情日期 20260918；本次未重新抓取行情，未发布线上。无新增已知风险。

## 2026-09-19 UI-009 / DATA-013 箱体原型本地验收

入口：http://127.0.0.1:5175/tao-us-stock-dashboard/#/boxes 。未发布线上。对应 CR-007 / RES-004；范围扩展方案见 BOX_DISCOVERY.md。

变更文件：src/{App,BoxScreener}.tsx、src/index.css、scripts/generate_boxes.py、scripts/generate_dashboard.py、scripts/data_pipeline/indicators.py、tests/{test_boxes.py,boxes-ui-regression.cjs}、.gitignore、AGENTS.md、docs/{REQUIREMENTS,CHANGE_REQUESTS,METRIC_DEFINITIONS,ARCHITECTURE,CHANGELOG,BOX_DISCOVERY,OPERATIONS}.md。本工作区还保留上一项UI-008变更，未覆盖。

验证：26项Python测试通过，覆盖宽箱体重复单程、冻结边界不受后续价格影响、单边下跌、短/零宽历史和版本错误不覆盖；lint/build通过。独立页面真实100只回归通过：筛选、搜索、空/错误状态、CRWV对照、日线/穿越、链接导航和390/768/1440布局；旧页面50组路由/口径/指标及7/8列吸顶/横向对齐通过。已查看桌面与手机截图，产物位于.cache/browser/boxes-*.png。

本地复用此前经生产验证、同版本的真实yfinance快照重新派生：data_date=20260918，箱体100成功、0失败，0形态全部达标；NBIS/COHR/SITM三项达标，均因往返次数不足保留为待观察。26日线相关单元测试使用合成数据，浏览器箱体回归使用上述真实快照；不混称实时抓取。

另外尝试运行真实 generate_dashboard.main()，输出隔离至.cache/boxes-live-check/data，55秒内未完成，已终止；本次新下载成功/失败数未知，未把它写成成功。日志.cache/boxes-live-check.log。有效预览数据保留，未用失败结果覆盖。未重新发布云端生成验证。

契约：新增独立 data/boxes.json schema_version=1，原dashboard.json不变；原CSV/指标不变。生成脚本已接入现有日更流程，但本地改动尚未部署，因此不能声称已启用自动箱体更新。全市场定期发现、联网业务尽调仍未启用；当前所有候选基本面标待专项复核。

剩余限制：固定分位箱体是可解释近似，可能漏掉新形成/漂移箱体；穿越是底/顶20%区域间收盘路径，不是精确最低到最高收益；仅最近一个120日窗口，未做滚动收益回测，不声称未来可盈利或可无条件扛跌。

## 2026-09-19 CR-008 最终本地验证
UI-010 / DATA-014 / RES-005 已实现。本地 http://127.0.0.1:5175/tao-us-stock-dashboard/#/boxes 与 #/research 均显示名单维护日期；未发布线上。

变更文件：src/{App,BoxScreener,ListReviewNotice}.tsx、src/index.css、scripts/data_pipeline/indicators.py、scripts/generate_boxes.py、public/data/list-review.json、tests/{test_boxes.py,boxes-ui-regression.cjs,list-review-ui.cjs}、AGENTS.md、docs/{ACTIVE_LIST_UPDATE,LIST_REVIEW,BOX_DISCOVERY,REQUIREMENTS,CHANGE_REQUESTS,METRIC_DEFINITIONS,ARCHITECTURE,CHANGELOG,OPERATIONS}.md。名单成员、持仓、原dashboard.json金融指标均未改。

验证：30项Python测试、lint/build通过；真实箱体浏览器检查通过，覆盖NBIS默认隐藏/排除筛选可查、长期曲线、一年图表、搜索、缺失/错误、导航和390/768/1440宽度。日期提醒测试覆盖北京时间30/31天、跨午夜、未来/非法/缺失日期，两页面一致。原有50组排序与7/8列表头吸顶对齐回归通过。已检查手机截图，并放大长期图纵向空间。

基于已验证的同批yfinance真实快照重算（不是本轮新下载）：data_date=20260918，100成功/0失败，24只按高位或暴涨排除，形态与价格过滤均通过1只AMBA（基本面待复核）。NBIS一年收益137.61%、较一年低点上涨204.1%，触发通用过滤；可用历史479交易日，不伪称完整四年，其活跃归属保留。名单维护日期沿用真实上一轮2026-09-19，不因为此次改界面/公式而刷新。

契约：boxes.json v2替代v1；新增独立静态list-review.json（last_updated/report），不被每日生成器写入。UI拒绝旧v1，防止使用没有高位过滤的数据。原dashboard.json契约不变。未创建/部署周期名单任务；旧季度/全市场自动方案由手动规范替代。

剩余限制：80%/100%/200%为当前实现阈值，可按用户反馈通过CR调整；短历史明示，基本面未逐只重新尽调。固定半窗口形成箱体仍可能漏掉新形成的局部箱体，不是收益回测。

## 2026-09-19 UI-011 长期图箱体投影
本地已完成，未发布。变更src/BoxScreener.tsx、src/index.css、tests/boxes-ui-regression.cjs、AGENTS与REQUIREMENTS/CHANGELOG/OPERATIONS。长期图用当前日线的同一low/high绘制上下沿、价格标签与蓝色区间；说明仅为当前箱体在长期价格图上的投影。
30项Python测试、lint/build、真实数据浏览器回归通过；验证上下沿字段一致、上下顺序正确、390/768/1440标签不重叠及页面不溢出。已检查手机截图。本次无JSON契约或金融指标变化，真实快照日期20260918、扫描100成功0失败、筛选结果不变。
用户提出20%以上窄箱体及宽转窄、完整往返两个月最佳四个月太慢，本轮只讨论优化方案，尚未改动阈值/周期公式。未新增已知风险。

## 2026-09-19 CR-009 多尺度箱体最终本地验收
关联UI-012/DATA-015。本地 http://127.0.0.1:5175/tao-us-stock-dashboard/#/boxes 已更新，未发布线上。

变更文件：scripts/data_pipeline/indicators.py、scripts/generate_boxes.py、src/BoxScreener.tsx、src/index.css、tests/test_boxes.py、tests/boxes-ui-regression.cjs、AGENTS.md、docs/{REQUIREMENTS,CHANGE_REQUESTS,METRIC_DEFINITIONS,ARCHITECTURE,ACTIVE_LIST_UPDATE,BOX_DISCOVERY,CHANGELOG,OPERATIONS}.md。当前工作区保留此前本地功能改动。

规则：空间下限20%；60/90/120/252窗口分别前半形成/后半验证；优先合格近期窗，支持较长窗口与宽转窄对照。完整低→高→低实际自然日，两轮已验证、一轮新形成；<=60优先，61–120次级，>120过慢，最新完成/当前未完成亦参与判定。内部空间和效率另列且不称收益率。切换窗口与近期/一年范围时日线坐标、四年边界和周期记录同步。

验证：35项Python测试通过，新增20%精确边界/内部11.54%、宽转窄、往返不可用单程中位数相加、非重复计数、60/61/120/121天及未完成121天超时、单次上涨不算一轮。lint/build通过。真实100只浏览器检查通过，包含四个窗口边界/轮次一致、日线范围切换、NBIS/SITM高位排除、较长窗口对照、搜索/错误、路由、390/768/1440图表与标签；已检查桌面与手机截图。原50组榜单排序/吸顶回归及名单30/31天提醒回归均通过。

真实同批已验证快照重算：data_date=20260918，100成功/0失败。默认窗口0只已验证快速、2只新形成快速（AVAV：40.22%边界空间，38自然日1轮；AMBA：36.22%，46自然日1轮）；5只次级，2只过慢，24只高位/暴涨排除。SITM90日22.52%空间、33自然日1轮，但稳定性未过且触发暴涨排除，仅供对照，不写成合格窄箱体。

再次尝试真实generate_dashboard.main()，输出隔离至.cache/boxes-v3-live-check/data，55秒内未完成后终止；本轮重新下载的成功/失败数未知，日志.cache/boxes-v3-live-check.log。预览仍使用上述可核验快照，未覆盖为未知新数据，也不声称重下载成功。

契约：boxes.json v3，新增windows/rounds/pending/efficiency/内部空间/多窗口索引及原形态保留；仅一份一年日线。前端拒绝旧v2。原dashboard.json指标契约、CSV及名单日期2026-09-19不变。

剩余限制：箱体为固定分位近似，多窗口优先规则并非策略收益回测；新形成仅一轮证据，不能当成熟形态；基本面仍待专项复核。长期高位规则保留，不为增加候选数量放松。样本未包含合格的真实宽转窄候选时，仅显示待验证对照；功能通过合成宽转窄测试而非伪造行情证明。


## 2026-09-19 本地RSI与业务交互验收（CR-010/011）
- 需求：UI-013/DATA-016、UI-014/DATA-017。未提交或部署线上。
- 数据层文件：scripts/stock_list.csv、data_pipeline/config.py、indicators.py、yfinance_client.py、summary.py、generate_boxes.py。133个唯一标的全部有business；原成员/代码/日期不变。
- 页面文件：src/RsiCell.tsx、RsiTrend.tsx、PageNavigation.tsx、App.tsx、BoxScreener.tsx、index.css。新增中心对齐RSI及两年曲线、业务列、固定身份列、统一导航和标题。
- 文档同步：AGENTS、REQUIREMENTS、CHANGE_REQUESTS、METRIC_DEFINITIONS、ARCHITECTURE、CHANGELOG、ACTIVE_LIST_UPDATE、BUSINESS_LABELS；后者记录标签维护和易混公司官方资料。
- JSON兼容性新增：dashboard/boxes的rsi（CR-010）；business字段和history.rsi_history（CR-011）。旧字段/公式/排序不改，缺新字段明确缺失；盒子schema_version仍3。
- 自动验证：45个Python测试通过，npm lint/build通过；原50组合排序/粘性表头/横向对齐回归、箱体回归、RSI值与阈值回归、两年预览/版本拒绝/重试/三页固定列回归、原K线与复制回归、名单日期边界回归均通过。
- 浏览器验证：Edge桌面及390px手机宽度，RSI曲线、30/70色带、历史不足提示、三页导航、手机横向固定股票名与代码；截图.cache/browser/rsi-preview-desktop.png、rsi-preview-mobile.png、sticky-*-390.png。
- 真实缓存数据：data_date=20260918，133个唯一标的，两口径各133行（合计266行及266个历史文件）均成功补齐RSI/业务/曲线，缓存重建失败0；箱体100只。这里的成功数是既有真实快照的派生验证，不是本次联网下载成功数。
- 重新运行实际生成入口时输出隔离到.cache/ui014-live-check/data；yfinance下载55秒未完成后终止，未拿到最终成功/失败标的计数，均未知。日志.cache/ui014-live-check.log；不把网络超时当成功，也不覆盖安全占位或当前有效预览。
- 预览曲线使用既有真实OHLC历史重建；正式流水线用同批完整排名价格序列计算再裁切。若旧快照曾过滤无效OHLC日期，可能存在少量历史采样差异，当前266个文件最新RSI均与展示值一致。
- 预览地址：http://127.0.0.1:5175/tao-us-stock-dashboard/#/watchlist；活跃页#/research；箱体页#/boxes。npm build会清掉dist行情，之后从.cache/preview-rsi/*恢复至dist/data；安全public/data/dashboard.json未写真实行情。
- 剩余限制：本地新鲜下载未完成，线上尚未发布；历史文件构建失败时RSI预览不可用，但表格仍可显示RSI。短标签不等同于新的基本面专项复核。


## 2026-09-19 UI-015 与自动更新状态核查
- 变更：src/{DataFreshness,App,BoxScreener}.tsx、index.css及RSI浏览器回归；REQUIREMENTS/CHANGELOG/AGENTS/OPERATIONS同步。UI-015为展示调整，JSON无变化。
- 已通过GitHub API实际查询Deploy Dashboard工作流状态为active。远端deploy.yml与本地均配置America/New_York周一至周五18:30，生成后验证构建并部署；有延迟可能，成功记录不保证未来每次成功。
- 最近定时运行35409418690，event=schedule，2026-09-19T00:27:30Z启动（北京9月19日08:27），success：https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35409418690 。前一次35291721593也成功；最新push运行35420819068成功。
- 读取远端main的scripts/generate_dashboard.py，尚无generate_boxes调用。本地RSI/箱体等本轮功能未发布，不能把本地流水线已经接线说成线上已每天执行。原线上行情/指标/K线随工作流自动刷新。
- 本地生成器已接入RSI/两年历史与generate_boxes；发布后无需另建定时任务，每次同批下载刷新价格、原指标、RSI、历史曲线、箱体边界/位置/周期/状态/候选排序及四年背景。当前本地5175为固定测试快照，不会随云端部署自动同步。
- 北京对应夏令时次日06:30、冬令时次日07:30（原定时间，实际可延迟）；周末不安排，休市日可能仍执行但最新交易日期保持不变。
- 手动：持仓增删、活跃名单从全市场增补/剔除、业务标签、基本面专项复核、筛选阈值改动。名单超过30天只提示，不自动换股；用户发起后按ACTIVE_LIST_UPDATE.md执行，不存在季度自动换股任务。仅完成名单维护才更新list-review日期。


UI-015验证结果：45项Python测试、lint/build通过；箱体页面、RSI两口径/阈值、三页导航/日期/手机固定列/预览回归通过。已检查390px日期卡截图，1440px截图亦保存于.cache/browser/boxes-date-*.png。预览恢复9月18日真实快照；此轮未改数据计算，未重新请求行情，未部署。


## 2026-09-19 CR-012 / DATA-018 / UI-016 最终本地验收
- 变更文件：scripts/data_pipeline/indicators.py、scripts/generate_boxes.py、src/BoxScreener.tsx、tests/test_boxes.py、tests/boxes-ui-regression.cjs；新增docs/BOX_DEFINITIONS.md，同步METRIC_DEFINITIONS、ACTIVE_LIST_UPDATE、BOX_DISCOVERY、ARCHITECTURE、CHANGE_REQUESTS、REQUIREMENTS、CHANGELOG、AGENTS及本记录。
- 当前多尺度按全窗口回顾识别：三个连续交替单程为一轮，价格上下20%区域触边，幅度>=20%、已完成平均自然日<=120；不以未完成或最近单轮超时剔除。默认只有match/watch，待观察严格第三程至少过半。
- 48项Python测试通过；lint/build通过。浏览器真实100只检查通过，包括两个用户例子、窗口比较、默认候选和严格待观察筛选、四年排除、旧v3拒绝、三页日期/导航、RSI预览、名单时间提醒及390/768/1440布局。
- 人工检查桌面全页与手机CRWV详情截图；展开轮次每轮确为四个日期/三个箭头。AVAV：2026-06-25下→07-02上→07-09下→08-07上，43自然日/30交易日。CRWV：2026-05-12上→07-02下→08-12上→09-01下，112自然日/77交易日。没有代码级个股豁免。
- 同批已有真实行情快照data_date=20260918，箱体100成功/0错误；20已验证、7待观察、9完成平均过长、24长期排除，其余为越界/未成箱体。AVAV60日窗口142.088–186.972、31.59%、1轮平均43天；CRWV90日窗口76.798–109.67、42.80%、1轮平均112天。以上为历史快照重算，不是本次新下载。
- 再次运行实际generate_dashboard.main，输出隔离到.cache/boxes-v4-live-check/data，55秒下载未完成后终止；下载成功/失败数未知，日志.cache/boxes-v4-live-check.log。旧预览与安全占位未覆盖。
- 契约：boxes.json升级v4、轮次与均值含义改变、turns四点及完整窗口元数据；页面拒绝旧v3。dashboard/RSI/CSV成员/list-review维护日期不变。
- 本地预览：http://127.0.0.1:5175/tao-us-stock-dashboard/#/boxes 。构建后的真实数据恢复自.cache/preview-rsi（现含v4）；未提交或部署线上。
- 解释边界：全窗口回顾估边不构成事前信号，每天边界可能变化；仅1轮证据也按用户定义标已验证，应结合轮数审阅。待观察可能已有很长未完成耗时，按用户明确选择不因此排除，且平均周期显示为空。基本面专项复核仍未完成。

## 2026-09-20 CR-013 / UI-017 / DATA-019 详情量价与RSI验收
- 文件：src/BoxScreener.tsx、scripts/generate_boxes.py、tests/test_boxes.py、新增tests/box-chart-indicators-ui.cjs；AGENTS、REQUIREMENTS、ARCHITECTURE、CHANGE_REQUESTS、CHANGELOG及本记录同步。
- 业务短语显示日线详情公司名下，候选表未新增列。K线/原始成交量/RSI共享日期横轴、窗口裁切和选中日，支持悬停/点按/键盘左右键；RSI<=30/≥70色带，缺失不补0、不跨RSI缺口连接。零成交量保留真实0，全缺失不伪造轴值。
- JSON：boxes v4兼容性增量bars[].rsi_value:number|null，由同批history.rsi_history日期映射取得；volume原字段沿用；不在React计算指标。原识别/排序/成员/维护日期无变化。
- 验证：49项Python测试通过，lint/build通过；箱体原回归及新详情副图回归通过，覆盖4窗口/一年背景的日期和数值对齐、键盘逐日值、业务显示、缺字段降级、390/1440界限；另验证真实触屏tap联动。已查看桌面与手机截图.cache/browser/box-chart-indicators-*.png。
- 既有真实快照data_date=20260918重算100成功/0错误，20已验证、7待观察，AVAV/CRWV结果不变。真实generate_dashboard入口再次尝试，隔离输出.cache/box-chart-live-check/data；55秒未完成后终止，本次新下载成功/失败数未知，未覆盖快照。日志.cache/box-chart-live-check.log。
- 本地http://127.0.0.1:5175/tao-us-stock-dashboard/#/boxes已恢复真实快照和新副图，尚未发布线上。后续正常流水线会随同批行情生成这些附加数据，无需另建定时任务。

## 2026-09-20 UI-018 发布前验证
- 修复文件src/App.tsx、src/index.css，新增tests/table-fit-ui.cjs，相关需求/日志/摘要同步；无JSON契约变化。
- 根因：新增业务与RSI后最小宽度1199/1311px超过原1152px页面中的表格容器。桌面>=1024使用紧凑弹性列和最大1440px容器，手机继续用可读最小列宽滚动并提示。
- 两页×五视图在1024/1298/1440/1920无内部水平溢出且最右列完全可见，列头/表体对齐；390px最后列可滚动到达，无整页溢出。截图.cache/browser/table-fit-{watchlist,research}.png已检查。
- 49项Python测试、lint/build通过；安全public/data/dashboard.json为空行情占位，历史缓存与真实boxes仍ignored，未纳入提交。
- 用户明确授权push，发布包含此前完成的CR-008至CR-013、本轮UI-018等累积本地改动；发布时将依赖Actions验证真实yfinance数据与Pages部署，结果另记录。

## 2026-09-20 最新生产基线（已发布）
- 用户授权push后，功能提交3e3bdd7fbf435026251fa09866d12681230ccc06已推送main；Actions完整构建和Pages部署success：https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35482982021 。
- 云端49项Python测试通过；真实yfinance生成133成功/0失败、266个历史文件、历史错误0、data_date=20260918；lint/build及部署均通过。生成器包含RSI、boxes v4及成交量/RSI详情链路。
- 线上两个主表已实际运行table-fit-ui回归：两列表×五指标×1024/1298/1440/1920宽度均完整显示右侧列，表头对齐；390px最后列可滚动到达，无整页溢出。该验证针对真实线上页面，不是仅本地模拟。
- 此生产状态覆盖此前所有“本地未发布”备注；那些段落保留为历史验证记录。新增箱体、RSI、业务及维护日期提示已进入已启用的纽约工作日18:30生成/部署流程，无需新增定时任务。名单成员及基本面复核仍手动，超过30天仅提示。
- 线上箱体页也已实际加载验证：100只扫描、20已验证/7待观察共27候选，生成时间2026-09-19T22:03-04:00，数据日2026-09-18。直接API大文件检查曾遇30秒传输超时，浏览器实际页面随后加载成功；未将超时API检查记作通过。

## 2026-09-21 自动更新失败排查（运行 UTC 2026-09-22）
- 关联 OPS-001 / OPS-002 / NFR-001 / DATA-018；运行 https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35674037463 。49 项测试通过，行情 133 成功/0 失败、历史 266 文件/0 错误、data_date=20260921；generate_boxes 抛出“箱体扫描无有效结果”，build 失败、deploy 跳过，未覆盖旧线上产物。
- 原日志没有逐只箱体错误，也没有上传中间产物，不能断言已还原云端每只日期。本地重新真实下载复现相同错误：131 只股票/ETF 截至 2026-09-18，VIX 截至 2026-09-21，DOGEUSD 截至 2026-09-20；全局日期取非 crypto 最大值，被 VIX 推至 21 日，100 只观察股全部因历史日期不等于全局日期被拒绝。输入保存于 ignored 的 .cache/deploy-diagnosis/data；未覆盖 public 安全占位。
- 本地补充逐只箱体错误及日期日志，增加日期错位/保留旧文件回归。50 项 Python 测试、lint/build 通过；真实生成仍失败，不能记为恢复。修改未 push、未部署；JSON 契约、日期算法、名单及维护日期不变。
- 预防建议：引入每只行情日期，用自身日期核对历史；箱体按扫描池的实际数据日期标注，避免持仓指数推动箱体日期；明确混合日期及陈旧数据提示。该方案涉及日期契约，需按 CR 流程确认后实现，不能简单放宽日期校验或把旧数据标成新数据。后续可为失败运行保留中间行情产物，并针对源数据暂时未更新做有限重试。Node/Pandas 弃用警告不是本次致命错误。

### 2026-09-21 后续直接源数据核查与用户纠正（CR-014 / DATA-020）
- 上述“按扫描池拆分日期”仅为此前建议，用户已明确否决此方向：应保留部署失败并解释缺少当天完整股价。
- 纽约 21:28 左右直接查询 Yahoo chart query1/query2，NVDA 的 5d 与明确起止请求均返回 9/21 日期，但 Close/Adj Close 为 null。NVDA/MSFT/QQQ/HOOD 的 Open/High/Low/Volume 有值，报价元数据 regularMarketPrice 也有 9/21 收盘时点值；VIX 的日线完整。请求 end=2026-09-22 正确。证据 .cache/deploy-diagnosis/raw-feed-check.json；不将报价元数据拼成复权日线，不臆测 Yahoo 后端具体故障或修复时间。
- 修复：yfinance_client 在 dropna 前检查最新有内容的日线；不完整日线计失败并携带诊断，主入口写入前失败；GitHub annotation 和逐只日志给出 session/missing/last_usable。保留箱体原日期保护和上轮诊断增强。
- 真实主入口验证输出 .cache/deploy-guard-check.log：成功 2（VIX、DOGE），失败 131（股票/ETF 9/21 Close/Adj Close 缺失），data_date=20260921（VIX），历史 4 文件在内存中、0 图表错误；进程按预期 exit 1，隔离输出目录未创建，未导出任何 JSON。该结果证明门禁正确，不能描述为行情恢复或部署成功。
- 54 项 Python 测试、lint/build 通过；JSON 契约、名单、维护日期和公式不变。修改尚未提交/推送。限制：识别已返回新日线中的缺价，未新增交易所日历来判定完全未返回新日期的情况。

### 2026-09-21 上游原因复查与诊断实现（OPS-003）
- 先前 HTTP 200 的 NVDA/MSFT/QQQ/HOOD chart 日线 Close/Adj Close=null，但 regularMarketPrice 已有收盘时报价；直接 query1/query2 和短/长请求均曾出现，不是本地 dropna 制造空值。21:35–21:40 纽约时间复查，相同接口已补齐。由这一前后变化推断是上游日线发布/补齐延迟；Yahoo 未说明内部原因，不能具体归因服务器、供应商或缓存故障。
- Yahoo 官方提供商说明 https://help.yahoo.com/kb/SLN2310.html 列明历史数据/每日更新供应商；不能据此认定本次是供应商故障。yfinance 讨论 https://github.com/ranaroussi/yfinance/discussions/2854 有相似缺最后日价格的用户报告，属于背景材料，不是本次事故公告。
- 新诊断在实际下载会话只读观察，成功 HTTP 的原始必需字段缺失才能标为 incomplete_daily；429/401/403/5xx/网络/格式/API 错误分别标注；没有 HTTP 证据标 unknown；原始字段完整但本地失败提示检查本地处理，避免误报上游。
- Actions 运行页 Summary 展示中文原因分类、数量及逐只日期/字段表；data-diagnostics-<run_id>-<attempt> artifact 保留14天。包含 report.json/summary.md，白名单保存状态、代码、末日字段、行情时间及 yfinance 版本，不保存请求查询参数、Cookie、Token 或原始响应正文；诊断故障不吞掉数据层原错误。
- 真实生成输出隔离至 .cache/upstream-live/data，当前133成功/0失败、266历史文件/0错误、箱体100成功/0错误、data_date20260921；诊断133个原始响应均complete。60项测试、lint/build通过，覆盖缺价且quote已有价、恢复、HTTP分类、超时、格式错误、脱敏与Actions摘要。
- 文件：scripts/data_pipeline/{diagnostics,yfinance_client}.py、scripts/generate_dashboard.py、requirements.txt、.github/workflows/deploy.yml、tests/test_diagnostics.py及需求/摘要/日志。关联OPS-003、CR-014/DATA-020；公共JSON契约无变化，尚未提交/推送，线上尚未启用增强诊断。

## 2026-09-21 CR-014 / DATA-020 / OPS-003 已发布验证
- 用户明确授权 push 并重新部署。功能提交253cdc14053648d8c1fb2a8ade3b91a02e1884c8已推送main，触发新版运行 https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35677183584 ；build和deploy均success，不是重跑旧提交。
- 云端60项Python测试、lint/build通过；133成功/0失败、266历史文件/0错误，箱体100成功/0错误，data_date=20260921。线上dashboard.json实际HTTP200，updated_at=2026-09-21T21:49-04:00，两口径各133行。
- 诊断artifact实际上传成功：data-diagnostics-35677183584-1，9629字节，https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/35677183584/artifacts/10673976388 ，到期2026-10-06。上传路径仅.cache/pipeline-diagnostics，明确include-hidden-files保证该目录可收集，不上传其它缓存。
- 本节覆盖本次此前“本地未发布”备注：最新缺价拦截及上游诊断已上线；名单/公共JSON契约/公式不变。Yahoo后续仍可能延迟或故障，届时失败保护及可定位日志生效。

## 2026-09-26 调度诊断与修复（CR-015 / OPS-004）
- GitHub API核实：36205954802首次9/25纽约20:44，131只缺Close/Adj Close，9/26纽约04:06重跑成功；36078502518首次9/24纽约20:39缺价，23:19重跑成功；35939418018首次9/23纽约20:39缺价，后续独立运行36011583640成功。最新远端代码4308fca，最新运行36205954802成功（attempt2）。
- 证据：https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36205954802 、https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36078502518 。成功时刻只是观察上界，不等于刚补齐的时刻。
- Yahoo官方 https://in.help.yahoo.com/kb/SLN2310.html 介绍供应商和行情延迟，未查到日线必需价格保证补齐的时刻；盘中报价延迟不能当成日线完成承诺。
- 新调度纽约周一至周五22:30，北京次日夏令时10:30、冬令时11:30。缺价每30分钟重试，最多9次，正常约覆盖到次日02:30；GitHub延迟可能顺延。完整后继续发布，全程未恢复则失败保留旧页面。
- scripts/retry_dashboard.py为工作流入口，exit75专指最新日线缺价。Summary逐轮记录，data-diagnostics的attempt-01等目录保留报告14天。build上限300分钟，无新增权限、密钥或依赖；等待会占用runner。
- 同一run内重试不增加GitHub run_attempt，请看Summary的行情尝试编号。push和手动Run workflow同样支持自动重试。当前待验证与发布。
- 本地验证：65项Python测试通过，npm lint/build通过。隔离输出至.cache/retry-live/data的真实yfinance生成通过：133成功、0失败、0停牌，266历史文件、0历史错误，100只箱体扫描、0错误，data_date=20260925。未覆盖仓库占位文件。失败→等待→恢复及耗尽分支以模拟测试验证，未人为等待4小时或伪造Yahoo故障。

### 发布完成
- 功能提交ca2fb1e已推送main；https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36232841113 的build/deploy均success。65项测试、lint/build通过；真实生成首轮成功，133成功/0失败、266历史文件/0错误、100箱体扫描/0错误，data_date=20260925。诊断artifact上传成功。
- 线上dashboard.json HTTP200，updated_at=2026-09-26T05:28-04:00，data_date=20260925。新工作流调度及重试入口已上线，覆盖本节此前待发布备注。尚未观察未来定时首轮及真实上游缺价恢复周期，不能保证每次首轮成功；重试逻辑已通过模拟恢复/耗尽测试。

## 2026-09-26 UI-015 纽约时间显示已发布
- 用户要求统一纽约时间并push；f192c68已上线，https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36262250107 的build/deploy成功。
- 三页共享src/DataFreshness.tsx，标题“更新时间（纽约时间）”，生成显示YYYY-MM-DD HH:mm，不展示容易误读成范围的UTC偏移。Intl固定America/New_York，自动处理夏令时；最新数据日保持行情日期。JSON与名单、公式无变化。
- 65项Python测试、lint/build通过；组件静态渲染核验截图时间、冬令时转换及午夜00:07通过。云端真实行情133成功/0失败、266历史文件/0错误，data_date=20260925；线上页面与新JS均HTTP200，确认已引用index-DoeyDaVy.js。未新增页面布局或交互。

## 2026-09-26 质量回归验收（CR-016）
- 本地Python 79项通过；Playwright 32项通过（独立Edge/Chromium，Asia/Shanghai浏览器时区验证纽约时间展示）；lint与包含测试代码的TypeScript/build通过。
- 本地真实行情输出隔离至.cache/quality-live/data：133成功、0失败、0停牌；266历史文件、0错误；100只箱体、0错误；data_date=20260925。public占位文件未改写。
- PR与deploy共用checks.yml，顺序为Python→lint/build→离线浏览器回归；通过后deploy继续真实行情与Pages。浏览器失败证据保留14天。
- 首次本地运行：npm ci；npx playwright install chromium；npm test。已安装Edge时PowerShell可用$env:PLAYWRIGHT_CHANNEL='msedge'。浏览器进程须有正常启动/退出权限。
- 截图对照与限制见reviews/2026-09-26-quality.md。

### CR-016 已发布验证
功能提交`0de1d33`，[Actions 36287978859](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36287978859)的checks/build/deploy全部成功；79项Python、32项云端Chromium回归、lint/build通过。真实行情第1次成功：133只、266历史文件，100只箱体扫描/0错误，data_date=20260925。

线上1440/390三页复验：持仓43行、活跃100行、箱体默认24行；列表默认52周内进度，无浏览器脚本错误，两口径各133行，updated_at=2026-09-26T22:17-04:00。截图保存在.cache/quality-review/production-*.png。公共JSON契约、公式、名单及维护日期均未改变。

## 2026-09-27 CR-017 股票池验收
- 本地真实yfinance：350成功/0失败/0停牌，700历史文件/0错误；原箱体100/0错误、新箱体234/0错误，data_date=20260925。新箱体默认候选58（已验证46/待观察12）。所有新查询代码均取得有效历史。
- 本地93项Python、原32项浏览器及新增11项池回归通过，lint/build通过。覆盖原归属保留、跨池去重、两箱体隔离、分级/币种/期间/证据日期、错误恢复、弹窗和响应式。
- 真实数据桌面1440/手机390截图检查新两页、证据弹窗及原持仓/活跃通过，无脚本错误；截图在.cache/pool-visual。public/dashboard为350成员的无行情占位，不提交真实历史/箱体文件。
- 研究数据为独立静态pool-review.json，日常不刷新评级；原list-review.json未改变。234只全部做财报初筛，其中23只原文专项核查，57只保留待核实。报告与限制见reviews/2026-09-27-pool-review.md。
- 功能提交`8ed8610`，[Actions 36311510736](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36311510736) checks/build/deploy全流程成功：93项Python、43项Chromium回归、lint/build；350行情首次生成成功、0失败、700历史文件/0错误、100与234两池扫描均0错误。
- 线上1440/390五页复验成功：持仓43、原活跃100、原箱体默认24、新池234、新箱体默认58。压力筛选12只、RZLV财报弹窗/关闭正常，无脚本错误；线上两口径各350行，data_date=20260925，updated_at=2026-09-27T06:09-04:00。证据截图.cache/pool-visual/production-*.png。
## 2026-09-27 CR-018：高风险公司股票池（本轮发布验证）
- 99项Python、48项浏览器、lint和build通过。新增经营类型/资金等级组合筛选、非法类别/旧schema/无来源失败保护，以及医药获批、融资依赖、受限资金、HUBG披露缺口回归。
- 本地真实Yahoo生成：350成功、0失败、0停牌，data_date=20260925；700历史文件/0错误，原100及新池234只箱体扫描均0错误。产物在.cache/pool-live，仓库dashboard仍安全占位。
- 独立Edge真实数据检查1440/390两页、临床筛选、IMSR/GEMI/HUBG证据弹窗通过，无页面异常或全页横向溢出；截图.cache/risk-visual。线上发布证据待本轮Actions完成后补记。
- 变更UI-021/DATA-022/RES-007，研究契约v2，行情/箱体v4不变；原57待核实中56已补查，HUBG仍待可靠完整财报。类型原文核查82只、资金原文80只，非全池全面尽调。
## 2026-09-27 CR-019 基本面摘要验收
- CR-018功能提交4f5aef0已由[Actions 36339033786](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36339033786)完成checks/build/deploy，均成功。
- CR-019本地105项Python、51项浏览器、lint/build通过；覆盖短语证据、旧字段兼容、损坏来源、缺亮点、临床收入与盈利分离、金融现金流、同币种同日期比较、箱体展示范围。
- 真实234只研究与350只行情的1440/390浏览器截图检查通过，无页面异常或全页溢出；原始行情仍使用本轮已验证的20260925数据，最终云端再生成。截图.cache/risk-visual。
- pool-review v2兼容扩展，不改变dashboard/boxes/history契约，研究日期仍2026-09-27，原名单日期不变。
- 功能提交`311c5f4`，[Actions 36358576352](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36358576352) checks/build/deploy全部成功。真实行情首次生成成功：350成功、0失败、700历史文件；两箱体100/234处理均0错误，data_date=20260925。
- 线上1440/390五页复验通过：新池两列、234条摘要、临床22/亏损融资14筛选、GEMI/IMSR/HUBG证据弹窗、箱体仅详情摘要和原三页均正常，无脚本错误或全页横向溢出。线上updated_at=2026-09-27T19:26-04:00；HUBG仍唯一资金等级待核实，18家公司本轮无可确认亮点。截图.cache/risk-visual/production-*.png。

## 2026-09-28 CR-020 / CR-021 / CR-022 本地验收
- 117项Python、55项独立Edge浏览器回归、lint/build通过。首次默认Chromium运行因本机未安装该浏览器而未执行测试，随后以PLAYWRIGHT_CHANNEL=msedge完整通过；CI继续安装并使用Chromium。
- 真实Yahoo：350成功/0失败/0停牌，700历史文件/0错误，箱体100/234处理均0错误；data_date=20260925，updated_at=2026-09-28T00:23-04:00。两口径349只有三个月波幅，SECZ因完整三个月历史不足保留空值；IREN8.79%、MCD1.99%，各64个样本。
- 1440/1024/390五页真实数据检查：无全页溢出，原两表桌面完整，风险弹窗/筛选及箱体详情正常。截图.cache/volatility-visual。来源重复键已修复；风险筛选不会把过滤掉的停牌股误报行情缺失。
- 新增dashboard/boxes可选volatility_3m、独立governance-review v1及distress摘要，旧指标与箱体v4不变。350成员、名单维护日期、pool原评级不改。研究为2026-09-27快照，88条事件/78代码，11只重大风险、7只观察；不是全量偿债能力尽调或自动实时预警。
- 功能提交`22a6f28`已push，[Actions 36429474987](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36429474987) checks/build/deploy全部成功。云端117项Python、55项Chromium及lint/build通过。
- 本次云端在纽约开盘后生成：data_date=20260928，updated_at=2026-09-28T09:36-04:00，350榜单成功/0失败；**仅500个K线文件，200条图表错误**，主要为图表与榜单末日不一致。原箱体65处理/35错误，新池172处理/62错误，不能描述为全量箱体正常。未放宽日期/价格校验，异常图表保持不可用；应在既有纽约22:30定时更新后复核上游恢复情况，不保证恢复时间。
- 线上1440/1024/390五页验收通过：波幅展示及排序，重大风险11/观察7筛选，HUBG退市/申诉详情、CVNA历史与SMCI未决事项；无页面脚本/控制台错误或全页溢出。截图.cache/volatility-visual/live-*.png。当前行情包含盘中日线，不将9/28数据称为收盘终值；治理研究日期仍9/27。
## 每周机器基本面研究（CR-024，已启用）

独立工作流`.github/workflows/weekly-research-scan.yml`计划纽约时间周日10:00扫描SEC，运行Python/Node检查，生成`public/data/weekly-research.json`并只提交该文件到main。提交后工作流明确调用`workflow_dispatch`启动现有行情工作流重新生成真实行情并部署Pages；不能直接用仓库中的占位行情部署。行情失败时周度JSON已提交但线上仍是旧版，须分别报告研究扫描与页面发布状态；行情日期不覆盖研究扫描日期。执行范围与定性缺口见[WEEKLY_FUNDAMENTALS.md](WEEKLY_FUNDAMENTALS.md)。

仓库Actions Secret `SEC_CONTACT_EMAIL` 已用用户提供的联系邮箱配置；值不在代码或日志中。工作流使用该值构造SEC User-Agent。仓库须允许`GITHUB_TOKEN`写入main及派发Actions；若分支保护阻止机器人提交，工作流应失败并保留旧页面，不可声称周更成功。每次运行核对344个公司/基金主体及6个不适用、234只高风险池财务扫描、错误数、Actions Summary、周度JSON、后续行情工作流和Pages URL。首次真实SEC运行因发现占位行情直接部署风险在扫描前取消，修正后已重跑成功。

2026-09-30 首次真实周更已完成：[SEC 扫描 36729221077](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36729221077)成功并提交`a57ad58`；[真实行情与Pages部署 36729923427](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36729923427)成功。扫描覆盖344个可核实CIK主体、6个不适用；234只高风险池财务请求均完成，研究日后有22个代码25份待判申报，0只出现新于人工研究日的结构化财务事实。线上`weekly-research.json` HTTP 200、234/350行，`scanned_at=2026-09-30T14:30:37.960Z`；真实行情`data_date=20260930`，复权/原价各350行。机器层不改人工经营类型、短语、治理结论或重大/观察风险；详细边界和IONQ权证核查见[首轮报告](reviews/2026-09-30-weekly-sec-first-run.md)。

## 当前月度手动维护（CR-025，覆盖上节）

用户每月主动发起一次，AI/维护者按[MONTHLY_REVIEW.md](MONTHLY_REVIEW.md)将股票列表与基本面、治理和生存风险同轮核查。`.github/workflows/weekly-research-scan.yml`已改为仅`workflow_dispatch`的只读取证任务，报告与研究草稿只上传artifact；不再定时、提交JSON或触发部署。原`weekly-research.json`及页面周度机器提示已移除，旧自动扫描结果仅保留历史报告。名单及研究的实际日期独立维护，未完成月度复核时不得推进；每日行情生成和Pages部署继续照常运行。

## 2026-09-30 CR-026：日期提前导致整批箱体失败

[失败运行 36692761065](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36692761065)为schedule触发，实际启动08:55 UTC（纽约04:55）。checks成功；build的行情350成功/0失败、700历史文件/0图表错误，但全局`data_date=20260930`、活跃池100只历史都停在2026-09-29，箱体0处理/100错误，因无有效箱体退出1且未部署。此次不属于已配置的“缺价exit75”重试。源站为何提前给少数标的下一日期，现有日志无法确定；不能把此现象简单称为全部Yahoo行情完整。

修复方案：先校验原始最新日线缺价，再用全体及各集合80%覆盖选择共同市场日，截齐非加密榜单/历史/箱体。须验证早到少数标的、各池不同进度、未截断缺价及真实行情输出；发布后在本节补记Actions证据和线上日期。

CR-026已由[运行 36842000320](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36842000320)真实验证：共同市场日20260930、349个非加密标的全部覆盖、1个较新日期暂缓；350行情成功/0失败、700历史文件/0错误、活跃及高风险箱体100/234只处理且0错误，build/deploy成功。上段“待验证”为实施时记录。

## 2026-10-01 CR-027：Actions Node警告

[运行 36842000320](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36842000320)的项目测试和部署均成功，但旧版官方Actions在Node 24 runner上产生`DEP0040 punycode`、`DEP0169 url.parse()`及Node.js 20弃用提示。三个工作流升级到官方Node 24 Actions，保留项目Node 22与Python 3.11。另有`yfinance/scrapers/history.py`触发的`Pandas4Warning`，它是Python上游警告，不计作Node修复成功；新运行需逐类核对。

[升级后运行 36882107075](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36882107075) checks/build/deploy均成功：123 Python、55浏览器测试；350行情成功/0失败，数据日20261001，676历史文件/24图表错误，活跃箱体100/0、高风险箱体221/13。checks和build中Node 20、`DEP0040`、`DEP0169`均为0；deploy中的最新版`actions/deploy-pages@v5`仍有1条`DEP0040 punycode`。该上游问题见[actions/deploy-pages#434](https://github.com/actions/deploy-pages/issues/434)，当前无已发布的修复版；不能把剩余一条写成项目依赖或已修复。build另有350条来自`yfinance/scrapers/history.py`的`Pandas4Warning`，与Node警告无关。没有修改数据口径、研究日期或JSON契约。
## 2026-10-01 CR-028 分析师目标价本地验证

- 目标价快照独立生成：`& .venv\Scripts\python.exe scripts/generate_analyst_targets.py`。纽约时间 2026-10-01 12:45 抓取 350 个 CSV 唯一代码，337 个至少有一个分析师目标价，13 个没有可用目标价，0 个请求失败。VIX、部分 ETF/加密返回 Yahoo fundamentals 404 时按无目标价展示；不等于行情下载失败。
- 月度更新必须手动执行并审核；任意请求错误会保留上次快照，不能声称本月已更新。生成时间为抓取时间，Yahoo 接口不提供逐条分析师报告日期；旧值可能过时。目标价对照当日未复权收盘价，也可能有日期差，页面不应解释成确定的高估/低估。
- 本地验证：125 项 Python 测试、lint、TypeScript/build 通过；57 项浏览器断言含新增目标价覆盖已通过。Windows Playwright 使用本机 Chrome/Edge 时断言结束后 runner 清理进程挂起，不能把该本地运行记为完整退出码 0。首轮真实目标价抓取成功，未重复运行日常完整行情生成；日常数据层/依赖/列表未变。本轮尚未 push 或部署，公开站点仍为此前基线。

## 2026-10-01 CR-029：情景估值规则及工程首期

- 用户确认正式记录规则并开始实现，采用折现到逐只估值日的乐观/保守/极端保守三价；三张主表价格研究同列融合，机构三价在详情参照。DATA-030/UI-029/RES-013、ADR-023及月度规范同步，详见 [首期实现记录](reviews/2026-10-01-valuation-implementation.md)。
- 独立快照350行：0已估值、344公司待原文/模型/融资稀释研究、6资产需专门方法；没有填入测试或默认预测。计算内核为企业DCF及压力回收；压力模型显式输入现有普通股权益保留比例，注销时为0，不把新股东权益当老股价值。当前不宣称逐只估值完成。
- 最终133项Python、lint、TypeScript/build、59项Playwright回归通过，均取得退出码0。Windows沙箱限制进程管理导致浏览器断言结束后清理挂起；获自动审批后在沙箱外完成同一离线测试，正常关闭并退出。浏览器下载在忽略提交的 `.cache/playwright`，无新增应用依赖。此记录覆盖CR-028中浏览器运行未完整退出的备注。非公司资产详情保留原报价单位，不强加美元符号。
- 目标价接口保护补强：观察原有quoteSummary响应，不额外请求；yfinance吞掉的HTTP错误/异常结构不能写成无目标价，明确No fundamentals 404及有效响应无目标字段才标不可用。新逻辑真实核验仍为337有目标价/13无价、0请求失败，临时核验输出在 `.cache/cr029-analyst-targets.json`；保留仓库首次快照的真实抓取日，未将本轮生成伪装为整套月度研究完成。
- 同一真实 `generate_dashboard.main()` 仅将输出隔离在 `.cache/cr029-real-data` 验证，退出码0：350/350行情、0失败、data_date=20261001、共同日覆盖348/349非加密标的、682历史文件/18图表错误；活跃箱体100处理/0错误，高风险箱体224处理/10错误。源站末日不一致明确不可用，不能声称700图表全成功。日志 `.cache/cr029-real-data.log` 保留上游Pandas4Warning；没有全局屏蔽，也未覆盖仓库行情占位文件。
- 新增独立valuation-scenarios.json v1，dashboard/history/boxes公共字段及版本不变；研究日期、名单、日常行情时刻不变。本轮仍本地实现，未push或部署，当前线上以CR-027生产基线为准。

## CR-028 / CR-029 发布授权（2026-10-01）

用户明确要求直接push，发布已验证的工程首期和静态研究快照。提交后由现有Actions重新生成真实行情并部署；不提交本地真实dashboard或缓存。真实情景估值仍为0只，344待研究、6需专门方法；337只分析师三价可用。发布运行结果另行记录。
## CR-030 本地测试页面

主表直接三档价格及相对现价空间，弹窗数字优先、依据折叠。134项Python测试、lint/build通过；59项浏览器用例已验证通过（58项全量运行通过，修复唯一失败用例的重复元素选择器后单独复跑通过），含390/1024/1440桌面及手机布局。新增可选scenario_comparison，不改变原榜单指标。

本地真实页面127.0.0.1:4174，演示页面127.0.0.1:4175，均使用项目路径/tao-us-stock-dashboard/。数据来自已验证的350行情/data_date20261001缓存；演示仅在忽略提交的.cache/cr030-preview/demo加入IMSR/NXH/SMR虚构三价，有醒目标识。生产快照仍0真实情景估值，未提交或发布本轮改动。

CR-030横排测试：三主表表头乐观/机构均价/保守/极端保守；价格及空间横向对齐，机构独立参照。相关10项浏览器用例均验证通过（8项首次通过，1024两页溢出修复后2项复跑通过）；135项Python、lint/build通过。真实缓存350行成功接入机构比较，337行有机构均价空间。预览仍在4174真实版和4175明确标注示例版，未发布本轮改动。

## CR-031 本地验证（2026-10-01）
135项Python、lint/build通过；完整61项浏览器回归通过，另新增RSI三色用例单独通过，合计62项已验证。真实generate_dashboard.main隔离.cache/cr029-real-data：350行情成功/0失败，data_date20261001，700历史文件/0错误，两箱体100及234处理/0错误。真实机构抓取337有值/13无值，原快照抓取时间不改；实际报告日期均未核实，主表机构均价隐藏，详情保留日期未知和逐价来源链接。analyst-targets v1新增可选source_url/quoted_at，价格日期失效由前端以纽约日判断；新鲜度不改变研究日期或自动刷新。尚未提交或发布本轮CR-030/031改动。

CR-032本地研究进度：344家公司SEC取证成功、0失败；7只已建立条件模型（PG、MSFT、NKE、MCD、CMG、AVGO、NABL）、337只待逐只研究、6只非公司资产排除。139Python、64Chromium、lint/build通过；真实行情350/0，data_date20261001，700历史文件/0错误，两箱体100/234均0错误。尚未全量填价、未commit或push。记录见docs/reviews/2026-10-01-valuation-intake.md；下载成功和工程测试不表示全部估值完成。


## 2026-10-02 CR-033 / UI-033 本地验证

移除主表与价格弹窗机构报价，前端不加载机构快照；建议价改三档，增加缺失状态。139项Python、lint及build通过；65项浏览器用例均已验证（全量64通过，更新唯一仍断言机构价的旧用例后单项复跑通过）。真实缓存页面7家公司三价及来源、HOOD待估值、六项排除、零价−100%对比通过，1440/390截图检查，无页面异常。

真实行情沿用同轮已核实的350/0、data_date20261001缓存；本次无金融公式、估值数字／日期或公共JSON契约变化，不重新请求行情。测试页面http://127.0.0.1:4174/tao-us-stock-dashboard/#/watchlist已更新。全量情景研究仍7/344，337待估值；未commit／push，不把本次展示修复称为全量填价完成。


## CR-034 / UI-034 本地验证（2026-10-02）

主表三档不变，详情恢复分析师低／均／高参考及逐价来源，外链箭头改“来源”。139项Python、65项Chromium、lint及TypeScript/build全部退出码0。离线回归覆盖点击前不请求机构快照、点击后一次读取，以及待估值／过期／损坏情景不得用目标价补位。真实行情缓存测试页4174验证7家情景模型、HOOD待估值但详情可读已有目标价、6项排除、压力零值−100%和来源文字；1440/390桌面手机截图检查通过，无pageerror。截图.cache/cr034-real-dialog.png及.cache/cr034-real-mobile-dialog.png为忽略的本地证据，手机详情可内部滚动。

变更文件：src/App.tsx、src/AnalystTargets.tsx、src/PriceResearchCell.tsx、src/index.css，dashboard/pool浏览器回归及需求／CR／CHANGELOG／AGENTS／ARCHITECTURE／VALUATION_SCENARIOS／PRICE_SOURCES文档。UI-034只改展示，不改变JSON契约、金融公式、静态研究日期或CSV成员；没有额外行情下载。数据沿用此前真实缓存（data_date=20261001，350成功／0失败），不是本轮重新抓取。当前7/344已建模、337待估值、6跳过；未完成全量研究、未push或部署。分析师汇总报告日期未核实的限制仍明确标注。


## CR-035 / UI-035 本地验证（2026-10-02）

来源链接仅留详情，主表移除来源和预留空间。变更：src/PriceResearchCell.tsx、src/index.css、tests/browser/dashboard.spec.ts及需求／CR／AGENTS／CHANGELOG／ARCHITECTURE／VALUATION_SCENARIOS／PRICE_SOURCES文档。139项Python、65项Chromium、lint/build全部通过，git diff --check通过（仅已有CRLF提示）。浏览器验证三档主表无来源链接、详情原文仍直达和分析师目标价参考保留，桌面1024/1440及手机390回归通过。4174测试页已同步构建资产，保留真实缓存而非仓库占位行情。JSON契约、公式、研究日期不变；未重新请求行情，本轮无数据生成验证要求。研究仍7已完成／337待估值／6跳过，尚未push或部署。


## CR-036 全量研究进行中验证（2026-10-02，本地未发布）

新增股权DCF模型及全量发布--require-complete门禁；原文与附件2279份下载后ETOR唯一失败已重试核实身份恢复。已完成模型16/344，328待研究，6排除；主表与详情规则为UI-035，不将模型未完成误称无机构报价。

变更：indicators.py、generate_valuation_scenarios.py、valuationData.ts、PriceResearchCell.tsx、tsconfig.tests.json、valuation_assumptions.json和valuation-scenarios.json；公式/模型门禁Python测试及浏览器验证、CR/需求/指标/架构/估值/CHANGELOG/AGENTS文档，新增逐只记录docs/reviews/2026-10-02-full-valuation-progress.md。equity_dcf是独立valuation-scenarios v1兼容新增模型枚举与输入，不改变主dashboard金融指标、名单、研究评级或更新频率。

142项Python、66项浏览器回归、lint/TypeScript/build退出码0。真实Yahoo验证350行情成功／0失败，data_date20261002；生成690历史文件，10图表错误（FIG/DOCN/ENOV/WEAV/INSP两口径末日不一致）；活跃箱体98成功／2错误，高风险箱体230成功／4错误。行情成功不代表全部图表或箱体成功。日志在忽略的.cache/cr029-real-data.log；真实验证仅写忽略缓存，仓库占位行情未改变。生成发生在纽约10月2日盘中，不能当作已完成日线。

最新16模型与真实缓存重新用Pythonadd_scenario_comparisons关联并同步4174本地测试页；16家主表三价与逐档详情来源、HOOD股权模型标签和机构中性参考、6排除及390手机浏览器检查通过，pageerror=0；截图.cache/cr036-hood-desktop.png及.cache/cr036-hood-mobile.png为本地证据。--require-complete真实运行按预期拒绝328个待研究公司并未覆盖快照，证据.cache/cr036-release-coverage.log。全量估值尚未完成，未commit/push/deploy，不声称完成用户本轮全量填价发布请求。

## CR-036第二批逐只研究（2026-10-02，未发布）

新增TTAN/MNTN/FIG/SHOP/RDDT/CAVA/GTLB/PATH/DKNG九家，当前25 available／319 pending／6 not_applicable。Python142、浏览器66、lint/build退出0；前八家公司真实4174测试页三价、每档详情SEC来源与390手机检查通过，pageerror0（.cache/cr036-round2-check.json）；DKNG随后加入，单独验证见后续记录。本轮仅把新增模型与已取得的10月2日真实350行情缓存重新关联，没有声称再次取得全量新行情或修复既有图表缺日。研究模型文件与JSON数据增加，schema_version=1未变；全量填数与push尚未完成。

DKNG新增三价和同批现价比较单独验证通过（.cache/cr036-dkng-check.json）：两个0价格正常显示$0、比较为有效值并严格着色，详情各档来源和8月新融资说明存在，pageerror0。当前全量覆盖门禁仍拒绝319个未完成公司且输出保持不变，.cache/cr036-release-coverage.log已更新；不是技术故障或找不到全部报价，是逐只条件研究仍未完成。

## CR-036第三批真实测试记录（2026-10-02，本地未发布）

- 新增CRCL、ETOR、KLAR、PLTR、NET、PYPL、WDAY、DOCU、MTCH、YELP十家条件模型；静态快照35 available / 309 pending / 6 not_applicable。完整逐股原文与假设见reviews/2026-10-02-full-valuation-progress.md。
- Python 142项通过（直接执行退出码0）、npm lint/build退出码0、Playwright 66项通过；git diff --check退出码0。第一次PowerShell重定向stderr的调用报告退出码1，但日志142项OK；随后直接执行确认退出码0，未将该重定向结果当作成功退出。
- 真实测试页新增十家30个价格、30个逐档主来源、零值和未复权现价严格比较色、无主表来源链接、CRCL手机弹窗均通过，无pageerror；证据.cache/cr036-round3-check.json与.cache/cr036-crcl-mobile.png（本地忽略文件）。
- 本轮复用先前2026-10-02真实350只同批行情，仅重新关联35家公司估值；没有额外声称再次取得最新市场报价。行情原验证350成功/0失败，690历史文件/10图表错误，活跃98/2、高风险230/4箱体成功/错误，日期不一致图表保持明确不可用。
- --require-complete实际拒绝剩余309家公司，已有静态快照保留；日志.cache/cr036-release-coverage.log。主行情占位文件未改写，没有提交或push，也没有部署；全量研究仍未完成。

## CR-036 第四至第六批本地校验（2026-10-02，未发布）

本轮补入 SMR、IMSR、RGTI、STUB、CHWY、DUOL、MP、POWL、INOD、NTGR 十家公司，当前情景快照为45已估值、299待估值、6跳过。研究及参数详见 `docs/reviews/2026-10-02-full-valuation-progress.md` 与 `scripts/valuation_assumptions.json`。三档均为明确条件下的研究者计算值，不是公司披露的建议买入价。部分股数、优先权益及营运现金采用已注明的上限/留存代理，不冒充精确公平估值。

- Python unittest：142通过、退出码0。
- lint、TypeScript/build：退出码0。
- Playwright离线回归：66通过、退出码0。
- 真实本地预览逐只校验：10家公司30个价格及30个详情来源入口；严格按同批未复权收盘价着色，0不当缺值；手机SMR详情及页面脚本错误检查通过。证据 `.cache/cr036-round6-check.json`。
- `--require-complete`等效真实调用拒绝299待估值公司；前后输出字节完全相同，未覆盖快照为发布成功。
- `git diff --check`通过。研究数据仍使用独立v1契约，未改日线指标、原名单、名单日期、研究周期或每日行情更新策略。

预览复用既有2026-10-02行情，350成功/0失败/0停牌；本轮没有重新下载行情，不把重新拼接估值称为新行情抓取。该盘中行情既有690历史文件/10图表错误（FIG、DOCN、ENOV、WEAV、INSP两口径），活跃箱体98成功/2错误，高风险箱体230成功/4错误；异常仍明确不可用。仓库行情安全占位文件保持原状。

全量344家公司填价仍未完成。本轮未commit、push或部署，以上本地测试不能当作全量交付或生产发布证据。


## CR-036 全量发布前验证（2026-10-03，覆盖此前分批进度）

- 344家公司三档全部完成，pending=0；6项非公司资产按用户要求留空。`python scripts/generate_valuation_scenarios.py --require-complete`退出0，独立v1快照严格门禁通过。来源、参数和逐公司限制见`reviews/2026-10-02-full-valuation-progress.md`。
- 143项Python、66项Chromium、lint及TypeScript/build均通过。最终真实页面核对350唯一代码/377列表行、344公司/6排除，全部价格、相对未复权现价百分比和严格颜色匹配；6个代表详情来源、390手机弹窗通过，pageerror=0。核查证据`.cache/cr036-full-browser.json`和`.cache/cr036-full-mobile.png`仅本地保存。
- 最新本地真实行情缓存`data_date=20261002`、`updated_at=2026-10-03T03:51-04:00`，两口径各350行情，0失败、0停牌；700历史文件、0图表错误，两个箱体100/234处理、0错误。此记录覆盖此前10月2盘中690文件/10错误，不把历史日志当当前结果。最终估值重新用同批raw收盘关联，没有将重新关联称为再次下载行情。
- 独立`valuation-scenarios.json`仍v1，新增适用金融模型`equity_dcf`；dashboard仅兼容可选`scenario_comparison`/`analyst_comparison`。CSV成员、日线金融公式、箱体算法、名单日期与日常/月度更新频率不变。仓库dashboard安全占位未改成真实行情。
- 独立复核修正RGNX还款封顶、BTBT既有利息重复、WYFI新增提款及付息资本配套、TE息前CF文案、ORCL新增资本与压力退出条件。未来融资和项目回收仍为研究者条件，价格0不是资料缺失或已证明完整经营价值为0。

提交与云端部署状态将在下一条记录给出；以上是本地验证，不等同已部署。

## CR-036 已发布全量基线（2026-10-03）

功能提交`fdf4c31`已push；[Actions 37162137565](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/37162137565)的checks/build/deploy全部success。真实构建日志350成功、0失败、0停牌、700历史文件/0错误，箱体100及234处理均0错误，data_date20261002。线上HTTP200：估值344 available/0 pending/6 not_applicable；未复权及复权各350行，纽约生成2026-10-03 19:35。上线后的三主表350唯一代码/377行，全部1032个公司情景价格及严格现价颜色/价差核对通过；6个来源详情、390手机及pageerror0验证通过。

研究基准2026-10-02，不由上述行情生成时间续期。主表仅乐观/保守/极端保守，来源仅详情，机构低/均/高为中性参考；RSI超卖红/超买绿/中性灰。覆盖此前所有“仍待全量/未push”分批记录。金融股权模型和可选比较字段向后兼容，原名单、行情指标、箱体公式及维护日期未变。

部署后仅补本条文档，以`[skip ci]`提交，沿用上述已验证功能部署，不重新发布占位行情。

## CR-037 / UI-036 本地验证（2026-10-04）

四个价格泡泡顺序为乐观/保守/极端保守/分析师低位，复用现有机构快照；首次挂载单次读取，详情共用，未重新抓取目标价或改估值日期/数值。143项Python、66项Chromium、lint/build通过；三主表1024/1440/390真实缓存截图、数字不溢出、四个圆角泡泡、机构来源详情通过，测试页4174已更新。首次回归发现StrictMode重复请求，已用组件内请求Promise复用修复，重新完整66项通过。JSON、金融公式、CSV和刷新周期不变。部署证据另记。

## CR-037 / UI-036 已发布（2026-10-04）

功能提交bf2c761已push；[Actions 37188611216](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/37188611216)全流程success。线上三张主表1024/1440/390四价泡泡顺序、数字不溢出及点击分析师低位查看来源均验证通过。143项Python、66项Chromium、lint/build通过；原分析师快照与估值数值/日期均未修改。JSON契约及公式不变。部署证据仅以[skip ci]文档提交补记，不重发占位行情。

## CR-038 / UI-037 本地验证（2026-10-04）

四价改为一个统一圆角泡泡，内四列细分隔且保留各数值颜色，不更改价格数据/现价空间/目标价标签。变更src/index.css、既有浏览器断言及规则文档；143Python、66Chromium、lint/build及三主表1024/1440/390真实缓存布局和来源详情验证均通过。JSON、研究日期、金融公式和请求次数不变；4174测试页已更新。线上发布证据另记。

## CR-038 / UI-037 已发布（2026-10-04）

功能74b8489已push，Actions 37189086318 checks/build/deploy全成功。线上三主表1024/1440/390已核实外层10px圆角、内部四项0px独立圆角，共用一个泡泡；四价数字、颜色与来源详情保持。143Python、66Chromium及lint/build通过，价格数据和JSON契约未改。仅补发布记录的文档提交使用[skip ci]。

## CR-039 / UI-039 / DATA-034 / RES-015（2026-10-06，本地未发布）

- 三主表融资／稀释风险单列三维信息块、筛选、可访问证据弹窗与失败重试；两箱体仅单股详情展示。独立静态研究输出，不变更行情、箱体公式或名单日期。
- 初始350行：complete=0，partial=3（GEMI/SPRY/LCID，沿用2026-09-27证据），unreviewed=341，not_applicable=6。未完成全量融资专项研究。原理FINANCING_RISK.md，人工唯一来源financing_assessments.json，月度生成命令generate_financing_review.py。
- 149项Python、69项Chromium完整回归均退出码0；lint和TypeScript/build通过。Windows沙箱内Playwright清理挂起，获自动审批后在沙箱外以缓存Chromium完成同一离线回归，无屏蔽测试。
- 真实yfinance验证350成功/0失败/0停牌，data_date=20261006，updated_at纽约2026-10-06 12:04（盘中快照，非当日完成日线）；682历史文件、18图表错误。活跃箱体100处理/0错误，高风险225处理/9错误；SECZ/EVMN/WRBY/CXM/ENOV/UHS/CATX/CPRI/SITE末日不一致明确不可用。无财经研究日期推进。
- 真实快照保存在忽略提交的.cache/cr039-real/dashboard.json；public/data/dashboard.json恢复仓库安全占位文件。真实数据三主表390/1024/1440验证页面不外溢、头体列数一致；持仓/活跃桌面表格完整，高风险池沿用横向滚动，手机身份列固定。GEMI真实证据弹窗手机检查通过。
- 本地预览http://127.0.0.1:4175/tao-us-stock-dashboard/，仅本机覆盖行情响应使用上述快照；未push或部署，不视为线上验收。

## CR-040 / UI-040 / DATA-034 / RES-016（2026-10-06，本地未发布）

- 仅持仓43资产专项核查：37公司全部有研究记录，29三维核实/8部分，36可比期末股数/ETOR股数待核；6非公司仅“—”且无按钮。融资覆盖统计按当前列表显示，其他列表复用已有记录，不开展新的全池核查。SPRY/LCID保留9月27日旧日期，305公司仍待核。
- SEC真实取证：37主体submissions及companyfacts共74请求全部成功；相关发行及后续主文件100份下载失败0，外企财务/收购附件追加6份成功。读取原文后人工核对类别、IPO/拆并股、发行证券及状态、同期间现金与偿债；全部工具净余额未穷尽。逐只报告reviews/2026-10-06-holdings-financing.md，原始事实/来源financing_assessments.json。
- 生成器实际导出350行（29完整/10部分/305待核/6不适用）；可比股数计算在indicators.py，独立融资v1新增可选comparison/share_growth_pct，原行情/箱体JSON不变。生成时Vite文件观察曾锁住旧快照，停止观察进程后同一原子导出成功，未放宽失败保护。
- 151项Python、69项Chromium、lint及TypeScript/build全部退出0；浏览器使用已有缓存，沙箱外完成同一离线命令以正常清理Windows进程。git diff --check通过。代码/资料及逐只日期/来源校验通过，无重复来源URL，37持仓公司无缺失研究记录。
- 真实数据三主表1024/1440/390复验：头体13列（高风险15列）一致、页面不外溢，持仓/活跃桌面完整，高风险池保留原横向滚动；手机固定身份与融资证据弹窗可用。旧本机验证脚本筛“关注”寻找GEMI超时，修正为本轮“高风险”后复验通过；不是研究资料或页面加载失败。
- 行情验证沿用本次CR-039同批350成功/0失败、data_date20261006、纽约12:04盘中缓存；682历史文件/18错误、两箱体100/0及225/9错误仍如实保留，不声称全图成功。仓库dashboard.json仍安全占位，名单/其它研究快照不变。
- 预览：http://127.0.0.1:4175/tao-us-stock-dashboard/#/watchlist。当前未push或部署，线上尚无本轮融资列。高/严重等级不改变既有资金、治理、生存或估值判断；8只剩余缺口详见报告，不能称全证券精确尽调。

## CR-041 / RES-017 / DATA-034（2026-10-06，本地未发布）

- 扩展活跃100：10持仓复用/90新增公司；58三维核实/42部分、94可比实际股数，17高风险/65关注/16暂未发现突出信号/2整体待核实（NU/MNDY）。持仓仍29完整/8部分/6不适用；旧持仓逐行研究未改。全350融资快照78完整/51部分/215未专项研究/6不适用。逐只来源、特殊口径与缺口见reviews/2026-10-06-active-financing.md。
- SEC真实取证180 API请求首轮7超时，重试后0失败；169条原文来源记录及155条发行/后续文件记录已取得并查证券主体、类型和状态，存在缓存/交叉，不称互不重复新文件。NU另外取得并读二季度完整财务6-K；COIN/RIVN/WULF截至10月6日新文件已读。缺全部净额度/结算或股份对齐的保留部分/未知，不用估值预测填事实；无关行政申报不续融资事实日期。
- 151项Python、lint、TypeScript/build退出0。默认npm test首次69用例未启动浏览器：本机缺匹配版本Chromium headless-shell，非页面断言失败；设置PLAYWRIGHT_CHANNEL=chrome后同一69项全部通过（39.9秒），不跳过测试、不下载新浏览器。Windows进程清理用获批沙箱外执行。
- 最终真实350行情缓存+融资快照在活跃#/research检查1024/1440/390：100行、头体13列一致、页面不外溢；两桌面表格完整，手机表内横向滚动与sticky身份保留；高风险17/待核实2筛选及NU监管资本、INOD新ATM原文弹窗通过，Escape可关闭。A档30及持仓43/不适用6复验通过。.cache/cr041-visual.json保存结果；截图已实际阅读。
- 静态数据-only扩展，未再改行情/箱体下载和公式；沿用CR-039真实350成功/0失败、data_date20261006纽约12:04盘中缓存，682历史文件/18图表错误、两箱体100/0及225/9错误，不声称全量图表成功。CSV、list-review与其它研究快照不变，financing-review仍schema_version=1。
- Vite锁文件时先停止本机预览再由原子导出生成，随后重启；未放宽失败保留旧快照保护。预览http://127.0.0.1:4175/tao-us-stock-dashboard/#/research。未push/部署，线上尚无CR-039—041融资列。静态资料随月度手动更新，不新增自动任务。
## CR-042 / RES-018 全量融资核查本地验收（2026-10-07，发布结果另记）

- 全350资产有独立融资记录：344家公司中78三维核实、266部分核实；6个非公司资产仅显示“—”。225家公司有可比股数计算。全量等级为31高风险、1严重、188关注、25暂未发现突出信号、99待核实、6不适用；资料覆盖不等于条款全部核清。
- 本轮新增217家公司逐只事实及缺口，包含刷新SPRY/LCID旧记录。434次SEC submissions/companyfacts请求0失败；578条发行及后续文件记录0下载失败。LAES半年报PDF已核读财务页，纠正受限现金、F股经济权益与已行权预付权证；其它重大差异与来源见2026-10-07-all-financing报告。
- 151项Python、lint、TypeScript/build退出0。69项Chromium完整离线回归退出0（37.8秒）；沙箱内曾在用例结束后挂起进程清理，获自动批准后在沙箱外执行同一命令正常结束，未跳过测试。
- 最终350真实行情缓存与融资快照检查三主表1024/1440/390：成员43/100/234、头体13/13/15列一致、页面不外溢、持仓/活跃桌面完整、高风险池保持横向滚动。池内10高风险/97待核实筛选、LAES证据弹窗及持仓6个“—”通过；截图已实际阅读。本地浏览器脚本首次等待超时，独立读取确认数据加载后完整重跑退出0。
- 行情沿用本轮CR-039真实验证：350成功/0失败，data_date20261006、纽约12:04盘中生成；682历史文件/18图表错误，两箱体100/0及225/9错误，仍明确不可用。公共dashboard占位、CSV、其它研究及名单日期均未改；新独立financing-review v1不改变原行情/箱体契约。用户已授权push，实际云端结果另记。

## CR-039—042 发布受阻（2026-10-07）

功能已提交 `b2fb7cb0b6797336abf6304f1be68e50bf4ea2d4`，本地验收通过，但未发布。首次push遇本机不可用代理127.0.0.1:10808；仅本次命令禁用代理后能连接GitHub，连续接收提交均返回`remote: Internal Server Error`，更换HTTP/1.1及本次缓冲仍失败。最后一次2026-10-07T15:11:54Z，GitHub Request ID `DBA5:60FE7:DF835:155FEE:6AC66138`。

只读确认现有Git凭据是仓库所有者且具repo/workflow权限。官方Git Data API上传同一文档blob也返回HTTP500；未成功创建提交或更新分支。连接器另返回403 `Resource not accessible by integration`，不与Git凭据权限混淆。原因未被GitHub说明，不能断言为权限配置或代码故障。远端main仍为`30bcee78e8100c10f721a60ce6bb8b11073502af`，未触发本轮Actions，不能称融资列已上线；无强制推送、全局设置修改或凭据落盘。服务恢复后用`git -c http.proxy= -c https.proxy= push origin main`重试，再完成Actions及线上验收；本轮发布失败记录使用独立文档提交保留。


## 2026-10-08 · CR-043 / UI-041：统一表格宽度（本地，未发布）

修复高风险主表1740px最小宽度和股票代码预览控件96px固定宽度；三主表统一比例列宽，箱体表固定表格布局。320–1023px按股票纵向分组并标注字段，全部数据保留；四价同泡泡，窄屏显示档位名称，波幅排序另有可操作按钮。桌面保留列对齐/吸顶，指标按钮换行。没有通过隐藏溢出掩盖缺列。

验证：项目`.venv/Scripts/python.exe -m unittest discover -s tests -v`，151项通过；`npm run lint`、`npm run build`退出0；`PLAYWRIGHT_CHANNEL=msedge npm test`，90项通过。默认系统Python缺yfinance，改用现有项目虚拟环境；Playwright默认Chromium未安装，使用已安装Edge（Chromium内核），没有屏蔽失败。30项布局回归覆盖五页320/390/768/1024/1440/1920px，三主表五指标、两口径、停牌、窄屏波幅排序和高风险额外两列；断言容器和单元格不溢出、设置scrollLeft仍为0。

补充视觉验证使用已有`.cache/cr039-real/dashboard.json`（350行情行，data_date=20261006），没有重新拉行情或修改占位文件。三主表六尺寸、五指标单元格检查无溢出；最终390/1024/1440关键尺寸默认视图再次通过。截图`.cache/table-width-390.png`、`.cache/table-width-1440.png`已查看，长融资/基本面文字、四价和最右指标完整。补充检查的开发控制台有既有融资来源重复React key警告，不属于宽度变更，未将控制台称为零警告。

变更文件：`src/index.css`、`src/App.tsx`、`src/BoxScreener.tsx`、`src/FinancingReview.tsx`、`src/PoolReview.tsx`、`src/PriceResearchCell.tsx`、`src/RsiCell.tsx`、`src/StockHistoryPreview.tsx`、`tests/browser/layout.spec.ts`；治理文档`PROJECT_RULES.md`、`AGENTS.md`、`docs/REQUIREMENTS.md`、`docs/CHANGE_REQUESTS.md`、`docs/DECISIONS.md`、`docs/CHANGELOG.md`及本文件。

JSON契约、指标/箱体公式、研究内容、名单/研究日期及行情调度均不变。代价是窄屏股票行更高，桌面长文换行。未commit/push/部署；线上版本不因本地验证变化。


## 2026-10-09 · CR-044 / UI-042：泡泡居中（本地，未发布）

本轮增量文件：`src/App.tsx`、`src/index.css`、`tests/browser/layout.spec.ts`和`AGENTS.md`、`docs/REQUIREMENTS.md`、`docs/CHANGE_REQUESTS.md`、`docs/CHANGELOG.md`及本文件。指标泡泡新增稳定class，内容水平/垂直居中，数字单行不拆开，进度条单独展示；表内融资三维摘要、价格、RSI、风险标签和箱体形态标签统一居中。详情正文不套表格居中规则；沿用CR-043的容器宽度约束。

151项Python、lint/build通过；90项浏览器通过，六尺寸三主表五指标/两口径断言泡泡居中、指标文本仅一行及无溢出。为了保留用户4173预览，使用临时`.cache/center-playwright.config.ts`以4174端口执行原完整测试集，`PLAYWRIGHT_CHANNEL=msedge npm test -- --config .cache/center-playwright.config.ts`；默认4173配置首次因已占用而未启动，不算通过。234只高风险池既有真实快照在390/1024/1440复验无失败，手机/桌面截图`.cache/center-bubble-{390|1440}.png`已查看。

本地预览`http://127.0.0.1:4173/tao-us-stock-dashboard/#/pool`已更新最新dist；行情仍为20261006本地快照。未提交/push/部署。JSON、公式、名单及研究日期不变；长融资文字居中后仍会换行，窄屏行高增加。


## CR-039–044 最新发布基线（2026-10-09）

用户本轮授权push。功能提交`4030f3e`及此前融资提交`b2fb7cb`已成功推送，覆盖此前GitHub 500阻挡与“本地未发布”备注。[Actions 37902341164](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/37902341164) checks/build/deploy全部success；151 Python、90 Chromium及lint/build通过。行情首轮生成成功，350成功/0失败/0停牌，700历史文件/0图表错误，两箱体100/234扫描均0错误，data_date20261008。

线上HTTP200，复权/未复权各350行，updated_at纽约2026-10-09 04:03。五页390/1024/1440共15种组合实测无页面/表格横向溢出，三主表泡泡居中、指标数字单行；成员43/100/234，两箱体默认候选28/45。高风险池1440截图`.cache/release-4030f3e-pool.png`已查看，原始结果`.cache/release-4030f3e-ui.json`、快照`.cache/release-4030f3e-data.json`和日志摘要在本地缓存。融资350行覆盖344公司及6不适用，78三维核实/266部分仍保留缺口；不把发布成功当成全量条款尽调完成。

CR-043/UI-041统一容器总宽度及CR-044/UI-042泡泡居中现已上线；金融公式、原行情/箱体JSON契约、成员与名单/研究日期不变。窄屏改为纵向分组，行高增加。仅补发布证据的文档提交使用[skip ci]，不重新部署占位数据。
