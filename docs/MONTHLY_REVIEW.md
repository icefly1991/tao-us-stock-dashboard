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

上一轮研究与本轮新申报的区别必须写清：无新 SEC 文件不代表无风险；公告标题或关键词不能直接判定破产、造假、退市或风险解除。`grade`、`category`、`distress`相互独立，冲突组合列入报告。完整分类规则见[RISK_CLASSIFICATION_METHOD.md](RISK_CLASSIFICATION_METHOD.md)，名单筛选规则见[ACTIVE_LIST_UPDATE.md](ACTIVE_LIST_UPDATE.md)。

## 执行顺序

1. 读取 CSV、当前研究 JSON、上次名单与研究报告；列出当前成员、交集、各研究日期和待复核事件。按需手动运行 GitHub Actions 的 **Manual SEC Research Evidence**，取得 SEC 申报清单与结构化财务草稿；此任务只上传 artifact，不提交或部署。
2. 按[名单维护规范](ACTIVE_LIST_UPDATE.md)核查活跃列表及高风险池成员。核实代码、主体、非中概边界、业务短标签、波动与箱体；持仓归属只有用户明确要求时才改。成员变化要同步研究覆盖，不能留下无主体对应的旧评级。
3. 对全体适用主体查本轮新 SEC 财报、8-K/6-K、公司 IR、交易所公告及必要的监管原文；逐只记录报告期、申报/事件日期、证券种类和链接。优先处理新申报、当前事件、逾期复核、旧事实缺口和跨轴冲突。重大/观察风险的升级或解除要有直接原文依据。
4. 更新上述唯一来源并生成 `pool-review.json`、`governance-review.json`。报告列出每只变化、维持、资料缺失及无法判断的公司，说明旧结论是否仍成立；空亮点/风险不得解读为安全。新增成员完成研究后才能写入“已核查”日期。
5. `list-review.json.last_updated`仅在名单完整复核后更新；基本面/治理的`reviewed_at`仅在相应覆盖完整且通过校验后更新。两项尽量同次发布；若其中一项失败，保留其旧日期并在报告和页面明确缺口，不用另一项日期冒充已完成。
6. 运行`python -m unittest discover -s tests -v`、`npm run lint`、`npm run build`、`npm test`和真实行情生成验证；记录成功/失败标的、`data_date`、研究行数、事件分布、来源及异常。最后更新CR/CHANGELOG/OPERATIONS并发布；不改变既有金融公式或名单日期的含义。

报告放在`docs/reviews/YYYY-MM-DD-monthly-review.md`，包含名单增删与分档、基本面等级/类型/短语变化、治理及风险观察变化、来源、失败与待核项。一次完整复核即使决定维持名单或评级，也要留下依据。用户下次只需说：**“按月度规范更新股票列表和全部基本面研究。”**

## 日期和旧扫描资料

页面继续显示实际名单、基本面与治理研究日期，并在超过30天时提醒手动复核。每日 Yahoo 行情更新不推进这些日期。2026-09-30 的首次 SEC 机器扫描是[历史运行记录](reviews/2026-09-30-weekly-sec-first-run.md)，其`weekly-research.json`和周度页面提示已停止发布；不能把该旧扫描当作当前风险结论。历史周度方案见[WEEKLY_FUNDAMENTALS.md](WEEKLY_FUNDAMENTALS.md)。
