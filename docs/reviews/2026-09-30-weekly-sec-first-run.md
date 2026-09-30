# 每周 SEC 研究首轮运行（2026-09-30）

## 已验证结果

- [周度扫描 Actions 36729221077](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36729221077)成功，自动提交`a57ad58`；[后续真实行情及 Pages Actions 36729923427](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/36729923427)成功。线上[周度 JSON](https://icefly1991.github.io/tao-us-stock-dashboard/data/weekly-research.json)和[行情 JSON](https://icefly1991.github.io/tao-us-stock-dashboard/data/dashboard.json)均返回HTTP 200。
- SEC submissions覆盖344个有核实CIK的公司/基金主体；6个非公司资产不适用；本轮无扫描错误。234只高风险池的companyfacts请求完成。`scanned_at=2026-09-30T14:30:37.960Z`，人工研究日期保持2026-09-27。
- 人工研究日后有22个代码、25份SEC申报等待原文判读；322个代码没有相关新申报。234只高风险池均无晚于人工研究日的新结构化财报事实，所以本轮**没有**新的机器资金等级或数字短语。不能把扫描成功理解为234只公司都已完成新一轮原文尽调。
- 线上行情`data_date=20260930`，复权和原价各350行；周度JSON的`pool_count=234`、`company_count=350`。名单、人工基本面、治理事件及重大/观察风险等级未被机器覆盖。

## 首轮发现与修正

1. 首次生成时4只公司（ALVO、HUBG、PPLI、SRAD）的旧XBRL事实因原人工快照缺对应数字而误标为“新”。现以人工研究日和已有事实申报日的较晚者作为基准，复扫后`new_structured_facts=0`，并加回归测试。
2. SEC的嵌套附件路径不能把`/`编码成`%2F`。现逐段编码，IONQ的[Form 25原文链接](https://www.sec.gov/Archives/edgar/data/1824920/000087666126000804/xslF25X02/primary_doc.xml)可以访问。
3. 已见但未人工判读的申报必须在下一次扫描继续显示。现持续保留研究日后的申报，并另存`new_since_last_scan`；不能因机器上周看过而清除“待判”。

IONQ的Form 25原文列出的证券是**可赎回权证**，不是普通股。本轮机器提示只要求核实证券种类与生效状态，不能据此把IONQ普通股判成退市或重大生存风险。该原文核查不改变已有人工治理快照。

## 尚存边界

SEC之外的交易所、法院、公司IR及新闻不在自动覆盖内。经营类型、业务短标签、人工亮点/风险、治理法律状态、重大/观察风险不能仅凭免费结构化字段可靠改判；它们维持人工研究日期，新的申报持续列为待判。周度任务与行情部署分别报告成功/失败；若行情生成失败，仓库中的周度JSON虽已更新，线上页面仍保留旧版本。
