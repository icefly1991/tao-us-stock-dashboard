# 名单与基本面月度手动更新

CR-025 / RES-012 / OPS-006。用户每月主动发起一次更新；AI/维护者负责查证、修改、验证和发布，用户不需要逐家公司阅读财报。不会在固定日期自动换股、自动改判基本面或自动发布研究。每日行情和箱体任务继续照常运行。

## 一次更新覆盖什么

| 维度 | 来源与输出 | 范围 |
| --- | --- | --- |
| 股票名单、分档、公司名和业务短标签 | `scripts/stock_list.csv`，输出每日榜单和箱体成员 | 持仓、活跃列表、高风险池；持仓归属不因例行复核擅改 |
| 名单维护日期和报告 | `public/data/list-review.json` | 完成活跃列表核查后更新；仅有行情刷新或基本面修改不更新 |
| 资金等级、财务事实、现金覆盖与理由 | `scripts/pool_review_overrides.json` + SEC/公司原文 → `public/data/pool-review.json` | 高风险池全部成员；金融、基金等用适用口径 |
| 经营类型、业务阶段与证据缺口 | `scripts/pool_categories.json` → `pool-review.json` | 高风险池全部成员；不以缺字段推定业务类型 |
| 基本面亮点与风险短语 | `scripts/pool_briefs.json` + 财报规则 → `pool-review.json` | 高风险池全部成员；每项保留来源和报告期 |
| 治理事件、法律状态、生存/退市风险及复核日 | `scripts/governance_events.json` + 治理覆盖清单 → `public/data/governance-review.json` | 全部公司/基金主体；非公司资产标不适用 |
| 分析师低／均／高目标价 | `python scripts/generate_analyst_targets.py` → `public/data/analyst-targets.json` | CSV 全部唯一代码；逐只标可用或不可用，不把抓取日冒充报告日 |
| 乐观／保守／极端保守情景价值 | `scripts/valuation_assumptions.json` → `python scripts/generate_valuation_scenarios.py` → `public/data/valuation-scenarios.json` | 逐只原文与经营/融资/稀释假设；未完成研究的公司待核实；ETF、指数、VIX和加密资产按用户要求跳过留空 |

上一轮研究与本轮新申报的区别必须写清：无新 SEC 文件不代表无风险；公告标题或关键词不能直接判定破产、造假、退市或风险解除。`grade`、`category`、`distress`相互独立，冲突组合列入报告。完整分类规则见[RISK_CLASSIFICATION_METHOD.md](RISK_CLASSIFICATION_METHOD.md)，名单筛选规则见[ACTIVE_LIST_UPDATE.md](ACTIVE_LIST_UPDATE.md)。

## 执行顺序

1. 读取 CSV、当前研究 JSON、上次名单与研究报告；列出当前成员、交集、各研究日期和待复核事件。按需手动运行 GitHub Actions 的 **Manual SEC Research Evidence**，取得 SEC 申报清单与结构化财务草稿；此任务只上传 artifact，不提交或部署。
2. 按[名单维护规范](ACTIVE_LIST_UPDATE.md)核查活跃列表及高风险池成员。核实代码、主体、非中概边界、业务短标签、波动与箱体；持仓归属只有用户明确要求时才改。成员变化要同步研究覆盖，不能留下无主体对应的旧评级。
3. 对全体适用主体查本轮新 SEC 财报、8-K/6-K、公司 IR、交易所公告及必要的监管原文；逐只记录报告期、申报/事件日期、证券种类和链接。优先处理新申报、当前事件、逾期复核、旧事实缺口和跨轴冲突。重大/观察风险的升级或解除要有直接原文依据。
4. 更新上述唯一来源并生成 `pool-review.json`、`governance-review.json`。运行 `python scripts/generate_analyst_targets.py` 更新目标价快照，报告可用/不可用数及 Yahoo 失败；任一目标价请求报错时保留旧快照并如实标记该维度未更新。按[情景估值规则](VALUATION_SCENARIOS.md)逐只核查模型、原文及三档经营/估值/融资/稀释假设，维护 `valuation_assumptions.json` 并运行 `python scripts/generate_valuation_scenarios.py`；报告已估值/待核实/需专门方法及假设变更，不因生成快照就推进未研究行的估值日。报告列出每只变化、维持、资料缺失及无法判断的公司，说明旧结论是否仍成立；空亮点/风险不得解读为安全。新增成员完成研究后才能写入“已核查”日期。
5. `list-review.json.last_updated`仅在名单完整复核后更新；基本面/治理的`reviewed_at`仅在相应覆盖完整且通过校验后更新。两项尽量同次发布；若其中一项失败，保留其旧日期并在报告和页面明确缺口，不用另一项日期冒充已完成。
6. 运行`python -m unittest discover -s tests -v`、`npm run lint`、`npm run build`、`npm test`和真实行情生成验证；记录成功/失败标的、`data_date`、研究行数、事件分布、来源及异常。最后更新CR/CHANGELOG/OPERATIONS并发布；不改变既有金融公式或名单日期的含义。

报告放在`docs/reviews/YYYY-MM-DD-monthly-review.md`，包含名单增删与分档、基本面等级/类型/短语变化、治理及风险观察变化、来源、失败与待核项。一次完整复核即使决定维持名单或评级，也要留下依据。用户下次只需说：**“按月度规范更新股票列表和全部基本面研究。”**

## 日期和旧扫描资料

页面继续显示实际名单、基本面与治理研究日期，并在超过30天时提醒手动复核。每日 Yahoo 行情更新不推进这些日期。2026-09-30 的首次 SEC 机器扫描是[历史运行记录](reviews/2026-09-30-weekly-sec-first-run.md)，其`weekly-research.json`和周度页面提示已停止发布；不能把该旧扫描当作当前风险结论。历史周度方案见[WEEKLY_FUNDAMENTALS.md](WEEKLY_FUNDAMENTALS.md)。

## CR-031 / DATA-032 / UI-031：价格来源时效与RSI颜色
2026-10-01用户确认：每个价格清晰来源链接，优先最近资料、有效期60天；实际报价/估值日期，不以抓取或生成日续期。日期未知或>60天退出主表价格/价差/比较色，详情保存历史及来源。机构汇总不得用最新单篇报告日期替整个均值背书，Yahoo当前337只汇总报价日期均未核实。analyst-targets v1兼容新增source_url及quoted_at（null代表未知），不猜测日期。情景值仍来源于模型，链接为各档假设证据。规则见[PRICE_SOURCES.md](PRICE_SOURCES.md)。RSI用户确认超卖红/超买绿/中性灰，表格、历史及箱体副图统一；公式/阈值/名单/每日与月度更新频率不变。价格60天覆盖此前价格30天提醒描述，其它研究提醒不变；本地待发布。


CR-032范围补充（用户回复）：本轮覆盖CSV全部344只公司；ETF、指数、VIX与加密资产跳过，四档建议价整组留空。当前六个排除代码为BITX、IBIT、QQQ、TQQQ、VIX、DOGEUSD。此条覆盖此前非公司资产需专门估值的首期计划，原行情仍保留。机构均价按近期抓取快照展示，报告日期未知不再强制隐藏；三档情景价仍按实际复核估值日≤60天。最新完整规则见PRICE_SOURCES.md。

本轮估值先建立完整SEC资料清单，再逐只录入真实预测；下载或资料筛选日期不得推进未完成行的valued_at。清单脚本research_valuation_evidence.py不计算建议价；执行时引用本轮缓存并明确--as-of日期，见2026-10-01估值取证记录。

## 全量建议价发布门禁（CR-036）

本轮覆盖344家公司，6个非公司资产排除；月度更新逐只查最近定期及后续重大披露，同时更新三档经营、融资、股数和来源，不能仅改valued_at。发布前执行`python scripts/generate_valuation_scenarios.py --require-complete`，再完成Python、lint、build、浏览器及真实行情验证。正常行情任务不推进研究日期。机构目标价保留详情参考，不补模型；资本回收法范围须明确。

## 融资／稀释风险（CR-039 / RES-015）

同轮逐只核查可比股数、发行/ATM/可转条款及资金需求，维护scripts/financing_assessments.json，运行python scripts/generate_financing_review.py。更新实际事实日期与逐只核查日期，不改其它研究日期；专项未完成保留partial/unreviewed。研究报告列完整、部分核实、待核、不适用及来源。详见FINANCING_RISK.md；已有融资/稀释估值条件假设不等于已发生事件。不要创建自动研究任务。

融资覆盖补充（CR-041）：当前持仓37公司及活跃100共127公司已核查，10公司重合复用；另外SPRY/LCID保留旧部分记录。月度逐只更新financing_assessments并生成financing-review，不推进其它研究日期。活跃58完整/42部分及NU/MNDY、净ATM/转换缺口以[本轮报告](reviews/2026-10-06-active-financing.md)为复核入口；其余215公司尚未专项研究，不因页面有占位而声称已完成。

CR-042覆盖当前全部344公司（127复用2026-10-06、217研究2026-10-07），6非公司仅“—”。融资研究不再留未开展行；78完整/266部分及225可比股数是当前快照。月度更新应逐只处理[全量报告](reviews/2026-10-07-all-financing.md)净ATM、转换/权证状态、类别/拆并股、可用现金及12/24月到期义务缺口，不能只刷新日期或将取回材料自动称完整。先运行generate_financing_review并审查覆盖；日常行情不得改该快照或研究日期。
