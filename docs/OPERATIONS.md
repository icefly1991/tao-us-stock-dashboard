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
