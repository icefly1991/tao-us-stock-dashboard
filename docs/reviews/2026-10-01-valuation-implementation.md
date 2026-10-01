# CR-028 / CR-029 价格研究首期实现记录

2026-10-01，DATA-029/UI-028、DATA-030/UI-029/RES-013、ADR-023。本轮用户确认写入规则并开始项目，三档主值采用折现到逐只估值日的乐观/保守/极端保守合理价；机构低/均/高作为独立参照。工程首期完成，逐只真实研究仍待实施；本轮没有push或部署。

## 实际交付与文件

| 文件 | 改动 |
| --- | --- |
| `docs/VALUATION_SCENARIOS.md` | 正式规则、三档定义、来源和融资稀释要求、阶段覆盖及研究流程 |
| `docs/templates/valuation-assumptions.template.json` | 无示例数字的假设模板，缺值会被拒绝 |
| `scripts/data_pipeline/indicators.py` | 企业DCF及压力回收公式，允许0股权价值并拒绝异常参数 |
| `scripts/generate_valuation_scenarios.py`、`scripts/valuation_assumptions.json` | CSV成员覆盖、三档输入/来源/日期/symbol校验、单文件原子导出 |
| `public/data/valuation-scenarios.json` | 独立v1快照，350行，0available/344pending/6not_applicable，未填入真实三价 |
| `scripts/generate_analyst_targets.py`、`public/data/analyst-targets.json` | CR-028已有本地月度机构快照，337完整三价/13无价 |
| `src/valuationData.ts`、`src/PriceResearchCell.tsx`、`src/AnalystTargets.tsx` | 独立资料校验、三档主列、机构参照与来源/参数详情、异常降级 |
| `src/App.tsx`、`src/index.css` | 三主表共享入口，未复权收盘价比较、零压力值和未核实区分 |
| `tests/test_valuation_scenarios.py`、`tests/test_analyst_targets.py` | 已知公式、稀释、债权优先/归零、校验与旧快照保护 |
| `tests/browser/fixtures.ts`、`tests/browser/dashboard.spec.ts`、`tests/browser/pool.spec.ts` | 条件价与机构价不混用、两口径/缺失/坏资料、详情来源和焦点 |
| `AGENTS.md`、`docs/REQUIREMENTS.md`、`docs/CHANGE_REQUESTS.md`、`docs/DECISIONS.md`、`docs/METRIC_DEFINITIONS.md`、`docs/ARCHITECTURE.md`、`docs/MONTHLY_REVIEW.md`、`docs/CHANGELOG.md`、`docs/OPERATIONS.md` | 需求接受、公式权威、独立契约、月度手动流程及验证状态同步 |

## 验证

- 133项Python测试、lint、TypeScript/build通过；59项完整Playwright回归通过，最终退出码0。Windows沙箱内断言全部通过后关闭进程挂起，改在获自动审批的沙箱外完成回归；未更改应用逻辑或屏蔽测试。非公司资产保留原报价单位，不强加美元符号。
- Playwright浏览器下载到忽略提交的 `.cache/playwright`，仅测试依赖，不新增npm依赖。浏览器固定夹具中的价格和参数均为虚构测试，不进入生产研究。
- 真实Yahoo生成350成功/0失败、data_date=20261001；682历史文件/18图表错误，活跃箱体100/0、高风险箱体224/10，主生成器退出码0。用同一 `generate_dashboard.main()` 和运行配置，仅将输出隔离在 `.cache/cr029-real-data`，不替换仓库行情占位文件。详细异常见 OPERATIONS 最新CR-029条目。
- yfinance分析师接口可吞掉HTTP错误并返回空对象，已通过原请求响应观察拦截；限流/服务端失败/异常结构不能标为无价。新逻辑真实目标价核验337可用/13不可用、0请求失败。
- `git diff --check`通过；CRLF提示不作为金融数据错误。

## 契约与剩余工作

新增独立 `valuation-scenarios.json` v1；CR-028的`analyst-targets.json` v1沿用。原dashboard、history、boxes字段和版本、成员及日常行情调度不变。两个研究快照均为月度手动更新，不将生成日期当作逐只完成研究日。价差首期仅比较高低，未新增百分比指标或用户持仓成本。

现有财务初筛不足以生成可信的全池估值，必须逐只补齐经营预测、净债务/优先权益、可分配资金及融资稀释。企业DCF/回收模型只是首期可用内核，临床、金融、地产、数字资产等不自动套用；其他专门模型仍待有证据的研究。资料不足和不适用明确展示，不能将0已估值说成350已研究。价格对照只说明假设成立时的关系，极端保守不保证市场底价。
