# 全公司融资／稀释核查 · 2026-10-07

CR-042 / RES-018 / DATA-034；用户授权扩展其余所有股票并push。本文与FINANCING_RISK.md构成本轮公开证据和完整性说明。

## 本轮结果

- CSV350个资产：344公司有本轮或沿用的融资记录，6非公司仅显示“—”。127家公司保留10月6日研究及原日期；217家公司本轮新增/更新（包括SPRY/LCID9月旧记录）。没有占位unreviewed行。
- **78三维核实、266部分核实、0尚未开展、6不适用**。全覆盖是逐只形成有依据记录，不是声称344家公司全部完成净融资工具审计。217本轮记录均保留部分核实，缺净工具、可比经济股数或偿债/可用资金对齐时不提升complete。
- 等级：{'high': 31, 'not_applicable': 6, 'watch': 188, 'clear': 25, 'severe': 1, 'unknown': 99}。整体待核实与尚未开展不同：已有事实，但不足判断整体等级；缺数据不标低风险，不单凭常规股酬或CFO正负判关注。
- 有证据维度：实际284/344、潜在319/344、资金344/344；225具有3/6/9/12月可比实际股数，其余显示已核当前点/完成发行或明确待核，不用EPS替代。
- 217公司逐只SEC submissions及companyfacts共434请求均取得，失败0；451原文来源记录（含复用与非财报参考）及578融资/后续申报索引均取得，失败0。来源交叉不算互不重复文件数；表格标题/关键词只定位，结论以原文和事实范围为准。金融/境外标准字段缺失时继续读中报及附件，不因API空字段停止核查。

## 重点修正与限制

- **SEALSQ / LAES**：半年报为PDF，原始PDF144页。阅读并渲染核对财务表、股本和工具条款（PDF109–113、132、137页）。现金479.797M与受限6.311M分开，CEO说486M包含受限；F股每股经济权益为普通股5倍，两期统一普通股等价后再算6月增长。ATM剩28.9M美元，旧7.5M预付权证已全行权；Class E60.827M行权5.50美元、7年期与奖励净余额分开。没有同日匹配市值，不计算ATM/市值。
- **DFH**：9月14日第一批优先股225M已经完成，扣2.5%原始折价并用于旧A赎回；另450M第二批有条件，不能全部当到账。**WLFC**普通股7月17日1拆3，非融资稀释；优先股另有拆股及不可转条款。
- **SOC / FAC**：原文明确融资后旧持续经营疑虑已缓解，不沿用历史疑虑标当前严重。**GETY**当前材料仍披露持续经营重大疑虑，重点提示，但不推断必然破产。**WOLF**重组前后股份不可直接同比。
- **AMC / CLSK / VOYG / RCKT**：10月5日AMC3.97B再融资、9月CLSK新普通担保债、9月VOYG新可转债以及RCKT150M分批贷款分别处理。RCKT仅35M首批已提，其余条件款不计现金。普通债不当可转股，借新还旧不重复增加现金。
- **INV / OKLO / TE / SGMT / SMMT / BBNX**：新ATM、发行计划、老股转售及私募交割状态逐项区别。INV10月6日新60M ATM有依据，OKLO旧ATM用完不与新授权累加；TE10月6日为转售，9月追加可转仍按核实状态；未核闭合的募资不写已到账。
- **RUM / RGEN / CABA / FWDI**：最新完成并购权证、并购换股、旧权证大量行权、9月完成发行及9月30日股数在详情注明；旧6月同比不宣称含全部后续交易。
- **FOXF / GLOB / ODD / LAES**：公司持有别家可转票据/投资不是自身稀释；ODD已回购50M旧票据，不保留原600M全部为当前余额。
- **PYPL / HAYW / GEHC / GENI / ULCC / MNRO / JACK**：API部分标签停旧季度或历史现金名，直接用最新原文修正。GEHC issued减库存，HAYW outstanding排除库存；JACK83.27M表内数含库存，封面19.18M实际数不能混用。
- **DXYZ / 金融及保险**：DXYZ是封闭式投资主体，发行相对NAV与投资资金另核；客户款、保险资本、押品、项目子公司及未提款额度均不直接当自由公司现金，不能批量套CFO现金跑道。
- **SRAD / LZM**：10月宣布出售170M美元及减少对价上限8M美元，不等于现金已到账；行政/高管申报不续新旧资金事实日。

## 未完成事项的边界

部分核实逐行保留具体缺口：全量当前净ATM、可转债现金/股份选择、封顶看涨与转换价调整、权证已行权/到期、奖励归属、IPO/LLC/类别经济股数、12/24月到期本金及可动用短投/受限资金。已知资金流入不证明无需融资，低现金也不单独证明迫近危机。未确认的轴继续待核；不批量虚构潜在百分比、现金跑道或0–100总分。

新217行123家公司形成逐只工具/事件文字核对，其他公司保留报告已披露的股酬费用/奖励与现金事实或明确工具待核。**资料取回、事实初核、整体风险判定和净工具穷尽不是同一完成程度**。原文数字的时点是事实日期，研究日期是本轮阅读日，generated_at仅导出时间；不修改其它研究及名单日期。

## 各列表覆盖

| 列表 | 成员 | 三维核实 | 部分 | 不适用 |
| --- | ---: | ---: | ---: | ---: |
| 持仓 | 43 | 29 | 8 | 6 |
| 活跃 | 100 | 58 | 42 | 0 |
| 高风险池 | 234 | 13 | 221 | 0 |

## 本轮217家公司逐只记录

这里仅列新增/更新；保留127家公司结果见10月6日持仓/活跃报告。所有行保留部分核实；“待核实”不等同未阅读。详情完整两日期、范围、条款和缺口在融资快照，主表同列三行并可点击。

| 代码 | 等级 | 实际 | 潜在 | 资金 | 原文 |
| --- | --- | --- | --- | --- | --- |
| SECZ | 关注 | 原文流通股 163.27M | 组合转换及条件奖励 | 组合后现金约 $350M | [原文](https://www.sec.gov/Archives/edgar/data/2094496/000162828026056788/secz-20260630.htm) |
| BKKT | 高风险 | 报告流通股 45.07M | ATM及预付权证 | 经营流出 $26.9M | [原文](https://www.sec.gov/Archives/edgar/data/1820302/000162828026055275/bakkt-20260630.htm) |
| CRML | 高风险 | 报告流通股 146.99M | 权证20.09M；项目融资 | 现金 $102.5M；矿建需资本 | [原文](https://www.sec.gov/Archives/edgar/data/1951089/000121390026103607/ea0302128-20f_critical.htm) |
| CLSK | 关注 | 12月股数 -8.6% | 可转债；新担保债非股 | 经营流出 $409.3M | [原文](https://www.sec.gov/Archives/edgar/data/827876/000119312526338382/clsk-20260630.htm) |
| BTBT | 关注 | 报告流通股 360.63M | ATM及母子可转债 | 经营流入 $46.8M | [原文](https://www.sec.gov/Archives/edgar/data/1710350/000121390026088709/ea0300693-10q_bitdigital.htm) |
| SOC | 关注 | 12月股数 +92.8% | 7月再融资含可转债 | 经营流出 $72.8M | [原文](https://www.sec.gov/Archives/edgar/data/1831481/000183148126000104/socc-20260630.htm) |
| AURA | 高风险 | 12月股数 +66.9% | 预付权证；已完成融资 | 经营流出 $62.4M | [原文](https://www.sec.gov/Archives/edgar/data/1501796/000119312526343429/aura-20260630.htm) |
| EVMN | 关注 | 6月股数 +0.8% | 2月已发新股4.49M | 现金+投资约 $288M | [原文](https://www.sec.gov/Archives/edgar/data/2044725/000119312526337984/evmn-20260630.htm) |
| WYFI | 关注 | 12月股数 +2.7% | 8月可转债交换 | 经营流入 $89.1M | [原文](https://www.sec.gov/Archives/edgar/data/2042022/000121390026088026/ea0300877-10q_whitefiber.htm) |
| XXI | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流出 $11.6M | [原文](https://www.sec.gov/Archives/edgar/data/2070457/000121390026087471/ea0299640-10q_twentyone.htm) |
| DNA | 关注 | 待核实 | 货架与ATM须分开 | 经营流出 $91.0M | [原文](https://www.sec.gov/Archives/edgar/data/1830214/000162828026054298/dna-20260630.htm) |
| GETY | 高风险 | 报告流通股 421.02M | 融资安排受持续经营约束 | 经营流出 $68.7M | [原文](https://www.sec.gov/Archives/edgar/data/1898496/000162828026055246/gety-20260630.htm) |
| QDEL | 待核实 | 报告流通股 68.58M | 员工奖励；净条款待核 | 经营流出 $143.6M | [原文](https://www.sec.gov/Archives/edgar/data/1906324/000190632426000033/qdel-20260628.htm) |
| TRON | 关注 | 原文流通股 474.38M | 数字资产换股与优先转换 | 经营流出 $1.0M | [原文](https://www.sec.gov/Archives/edgar/data/1956744/000149315226037161/form10-q.htm) |
| VITL | 待核实 | 12月股数 -3.9% | 员工奖励；净条款待核 | 经营流出 $45.9M | [原文](https://www.sec.gov/Archives/edgar/data/1579733/000119312526336753/vitl-20260628.htm) |
| FWDI | 关注 | 原文流通股 73.85M | 9月新发股；ATM | 现金 $11.0M；数字资产另看 | [原文](https://www.sec.gov/Archives/edgar/data/38264/000168316826006270/forward_i10q-063026.htm) |
| UPB | 待核实 | 12月股数 +1.6% | 员工奖励；净条款待核 | 经营流出 $83.5M | [原文](https://www.sec.gov/Archives/edgar/data/2022626/000119312526343417/upb-20260630.htm) |
| SRAD | 待核实 | 待核实 | 双类别经济权益待核 | 现金 €251.1M；出售未完成 | [原文](https://www.sec.gov/Archives/edgar/data/1836470/000110465926035485/srad-20251231x20f.htm) |
| WRBY | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $54.1M | [原文](https://www.sec.gov/Archives/edgar/data/1504776/000150477626000019/wrby-20260630.htm) |
| HTFL | 关注 | 报告流通股 86.95M | 旧可转融资与奖励 | 经营流出 $38.7M | [原文](https://www.sec.gov/Archives/edgar/data/1464521/000146452126000131/htfl-20260630x10q.htm) |
| AMC | 待核实 | 报告流通股 892.60M | 员工奖励；净条款待核 | 经营流入 $106.9M | [原文](https://www.sec.gov/Archives/edgar/data/1411579/000141157926000059/amc-20260630x10q.htm) |
| SANA | 待核实 | 报告流通股 299.36M | 员工奖励；净条款待核 | 经营流出 $70.2M | [原文](https://www.sec.gov/Archives/edgar/data/1770121/000119312526342395/sana-20260630.htm) |
| CHYM | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $295.0M | [原文](https://www.sec.gov/Archives/edgar/data/1795586/000179558626000048/chym-20260630.htm) |
| SPRY | 关注 | 12月股数 +0.6% | ATM授权 $200M | 现金+短投 $143.8M；消耗 | [原文](https://www.sec.gov/Archives/edgar/data/1671858/000119312526349140/spry-20260630.htm) |
| PACB | 关注 | 12月股数 +3.5% | 2029/2030可转债 | 经营流出 $80.3M | [原文](https://www.sec.gov/Archives/edgar/data/1299130/000129913026000122/pacb-20260630.htm) |
| ALKT | 关注 | 12月股数 +2.7% | 2030可转债 | 经营流入 $17.2M | [原文](https://www.sec.gov/Archives/edgar/data/1529274/000152927426000052/alk-20260630.htm) |
| KLC | 待核实 | 12月股数 +0.3% | 员工奖励；净条款待核 | 经营流入 $104.5M | [原文](https://www.sec.gov/Archives/edgar/data/1873529/000119312526349480/klc-20260704.htm) |
| NTSK | 关注 | 待核实 | 可转票据及PIK/回售 | 经营流出 $70.5M | [原文](https://www.sec.gov/Archives/edgar/data/2063196/000119312526380428/ntsk-20260731.htm) |
| MAX | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $41.0M | [原文](https://www.sec.gov/Archives/edgar/data/1818383/000181838326000200/max-20260630.htm) |
| SHEN | 关注 | 待核实 | 优先资金及建设授信 | 经营流入 $24.4M | [原文](https://www.sec.gov/Archives/edgar/data/354963/000035496326000209/shen-20260630.htm) |
| EYPT | 关注 | 12月股数 +25.1% | ATM及预付权证 | 经营流出 $142.9M | [原文](https://www.sec.gov/Archives/edgar/data/1314102/000119312526335037/eypt-20260630.htm) |
| PSFE | 关注 | 待核实 | 员工奖励；客户资金另列 | 经营流入 $89.2M | [原文](https://www.sec.gov/Archives/edgar/data/1833835/000119312526349177/psfe-20260630.htm) |
| USAR | 高风险 | 待核实 | 政府权证及强制筹资条件 | 经营流出 $75.3M | [原文](https://www.sec.gov/Archives/edgar/data/1970622/000197062226000057/usar-20260630.htm) |
| BRCB | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $19.2M | [原文](https://www.sec.gov/Archives/edgar/data/2068577/000162828026055868/brcb-20260630.htm) |
| MPT | 关注 | 待核实 | ATM $500M；6月未售 | 经营流出 $14.3M | [原文](https://www.sec.gov/Archives/edgar/data/1287865/000119312526342583/mpt-20260630.htm) |
| BEAM | 关注 | 12月股数 +2.1% | 预付权证与研发资金 | 经营流出 $194.6M | [原文](https://www.sec.gov/Archives/edgar/data/1745999/000119312526331541/beam-20260630.htm) |
| HRL | 待核实 | 原文流通股 550.35M | 报告有股酬；净工具待核 | 经营流入 $768.8M | [原文](https://www.sec.gov/Archives/edgar/data/48465/000004846526000055/hrl-20260726.htm) |
| NMRA | 关注 | 12月股数 +16.0% | 销售协议及条件奖励 | 经营流出 $85.9M | [原文](https://www.sec.gov/Archives/edgar/data/1885522/000119312526350370/nmra-20260630.htm) |
| RGEN | 关注 | 12月股数 +0.3% | 10月并购已完成换股 | 经营流入 $61.1M | [原文](https://www.sec.gov/Archives/edgar/data/730272/000119312526323773/rgen-20260630.htm) |
| INFQ | 关注 | 报告流通股 225.36M | 上市组合转换；不可直同比 | 经营流出 $6.0M | [原文](https://www.sec.gov/Archives/edgar/data/2007825/000162828026057508/infq-20260630.htm) |
| LYTS | 待核实 | 12月股数 +22.1% | 员工奖励；净条款待核 | 经营流入 $44.1M | [原文](https://www.sec.gov/Archives/edgar/data/763532/000143774926029621/lyts20260630d_10k.htm) |
| FAC | 关注 | 待核实 | 组合股本；融资渠道 | 经营流出 $11.4M | [原文](https://www.sec.gov/Archives/edgar/data/2049662/000162828026055707/fac-20260630.htm) |
| INV | 高风险 | 12月股数 +51.0% | 10月新ATM $60M | 经营流出 $59.5M | [原文](https://www.sec.gov/Archives/edgar/data/2001557/000200155726000154/innv-20260630.htm) |
| RBRK | 关注 | 待核实 | 可转债；奖励 | 经营流入 $158.5M | [原文](https://www.sec.gov/Archives/edgar/data/1943896/000194389626000060/rbrk-20260731.htm) |
| WMG | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $708.0M | [原文](https://www.sec.gov/Archives/edgar/data/1319161/000131916126000032/wmg-20260630.htm) |
| OLN | 待核实 | 12月股数 -0.6% | 待核实 | 经营流出 $40.7M | [原文](https://www.sec.gov/Archives/edgar/data/74303/000007430326000077/oln-20260630.htm) |
| CMG | 待核实 | 待核实 | 报告有股酬；净工具待核 | 经营流入 $1332.0M | [原文](https://www.sec.gov/Archives/edgar/data/1058090/000105809026000069/cmg-20260804.htm) |
| CXM | 待核实 | 6月股数 -4.7% | 待核实 | 经营流入 $88.5M | [原文](https://www.sec.gov/Archives/edgar/data/1569345/000156934526000038/cxm-20260731.htm) |
| NKLR | 关注 | 报告流通股 110.50M | 条件优先转换约40M股 | 经营流出 $8.8M | [原文](https://www.sec.gov/Archives/edgar/data/2067627/000121390026090062/ea0300681-10q_terra.htm) |
| SAIL | 关注 | 报告流通股 570.91M | 历史单位转换与奖励 | 经营流入 $83.2M | [原文](https://www.sec.gov/Archives/edgar/data/2030781/000203078126000021/sail-20260731.htm) |
| ALMS | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流出 $168.6M | [原文](https://www.sec.gov/Archives/edgar/data/1847367/000184736726000018/alms-20260630x10q.htm) |
| ARDT | 待核实 | 报告流通股 141.05M | 员工奖励；净条款待核 | 经营流入 $136.5M | [原文](https://www.sec.gov/Archives/edgar/data/1756655/000162828026055215/ardt-20260630.htm) |
| SGMT | 关注 | 待核实 | 10月普通股/预付权证发行 | 经营流出 $19.7M | [原文](https://www.sec.gov/Archives/edgar/data/1400118/000119312526343441/sgmt-20260630.htm) |
| FWRG | 待核实 | 12月股数 +1.1% | 员工奖励；净条款待核 | 经营流入 $61.9M | [原文](https://www.sec.gov/Archives/edgar/data/1789940/000178994026000090/fwrg-20260628.htm) |
| SLDE | 待核实 | 报告流通股 116.81M | 员工奖励；净条款待核 | 经营流入 $590.0M | [原文](https://www.sec.gov/Archives/edgar/data/1886428/000119312526326333/slde-20260630.htm) |
| INDI | 关注 | 待核实 | 2031新可转债 $170.5M | 经营流出 $51.0M | [原文](https://www.sec.gov/Archives/edgar/data/1841925/000119312526340396/indi-20260630.htm) |
| MYGN | 待核实 | 12月股数 +2.8% | 员工奖励；净条款待核 | 经营流出 $24.0M | [原文](https://www.sec.gov/Archives/edgar/data/899923/000089992326000072/mygn-20260630.htm) |
| DOCU | 待核实 | 12月股数 -7.1% | 员工奖励；净条款待核 | 经营流入 $656.2M | [原文](https://www.sec.gov/Archives/edgar/data/1261333/000126133326000099/docu-20260731.htm) |
| CLFD | 待核实 | 12月股数 -1.6% | 员工奖励；净条款待核 | 现金观察点；需求待净核 | [原文](https://www.sec.gov/Archives/edgar/data/796505/000117184326005329/clfd20260630_10q.htm) |
| RUM | 关注 | 待核实 | 9月底已发预付权证16.74M | 经营流出 $66.1M | [原文](https://www.sec.gov/Archives/edgar/data/1830081/000121390026087311/ea0301267-10q_rumgroup.htm) |
| EGHT | 关注 | 12月股数 +5.9% | 可转债及定期贷款 | 经营流入 $17.0M | [原文](https://www.sec.gov/Archives/edgar/data/1023731/000102373126000114/eght-20260630.htm) |
| GERN | 关注 | 12月股数 +0.7% | 2026销售协议 | 经营流出 $78.7M | [原文](https://www.sec.gov/Archives/edgar/data/886744/000088674426000037/gern-20260630.htm) |
| EVEX | 关注 | 报告流通股 348.49M | 商业化融资路径有条件 | 经营流出 $115.3M | [原文](https://www.sec.gov/Archives/edgar/data/1823652/000155485526001685/evex-20260630.htm) |
| OKLO | 关注 | 12月股数 +26.0% | 9月新ATM $1B | 经营流出 $65.5M | [原文](https://www.sec.gov/Archives/edgar/data/1849056/000162828026054571/oklo-20260630.htm) |
| OXM | 待核实 | 12月股数 +0.7% | 待核实 | 经营流入 $97.3M | [原文](https://www.sec.gov/Archives/edgar/data/75288/000007528826000084/oxm-20260801.htm) |
| MTH | 关注 | 报告流通股 65.17M | 可转债结算条件 | 经营流入 $290.8M | [原文](https://www.sec.gov/Archives/edgar/data/833079/000083307926000128/mth-20260630.htm) |
| SNAP | 关注 | 待核实 | 可转债与员工奖励 | 经营流入 $176.2M | [原文](https://www.sec.gov/Archives/edgar/data/1564408/000156440826000052/snap-20260630.htm) |
| WHR | 待核实 | 12月股数 +16.6% | 待核实 | 经营流出 $947.0M | [原文](https://www.sec.gov/Archives/edgar/data/106640/000010664026000061/whr-20260630.htm) |
| ARRY | 关注 | 12月股数 +0.8% | 新2031可转债置换旧债 | 经营流入 $91.9M | [原文](https://www.sec.gov/Archives/edgar/data/1820721/000162828026053517/arry-20260630.htm) |
| TE | 关注 | 12月股数 +88.9% | 9月追加可转债计划 | 经营流出 $103.0M | [原文](https://www.sec.gov/Archives/edgar/data/1992243/000199224326000022/t1-20260630.htm) |
| ARQQ | 关注 | 原文流通股 15.29M | ATM；旧公开权证到期 | 公告现金 $35.9M | [原文](https://www.sec.gov/Archives/edgar/data/1859690/000110465925119500/arqq-20250930x20f.htm) |
| PYPL | 待核实 | 6月股数 -6.3% | 待核实 | H1流入 $3.117B；客户款另列 | [原文](https://www.sec.gov/Archives/edgar/data/1633917/000163391726000082/pypl-20260630.htm) |
| MNRO | 待核实 | 原文流通股 31.26M | 待核实 | 现金 $9.53M；授信不等于现金 | [原文](https://www.sec.gov/Archives/edgar/data/876427/000087642726000010/mnro-20260627x10q.htm) |
| XE | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流出 $164.6M | [原文](https://www.sec.gov/Archives/edgar/data/2088896/000119312526347752/xe-20260630.htm) |
| ADTN | 关注 | 12月股数 +1.8% | 2030可转债 $201.3M | 经营流入 $38.6M | [原文](https://www.sec.gov/Archives/edgar/data/926282/000119312526331632/adtn-20260630.htm) |
| ENOV | 关注 | 12月股数 +0.9% | 2028可转债 $460M | 经营流入 $99.0M | [原文](https://www.sec.gov/Archives/edgar/data/1420800/000142080026000035/cfx-20260703.htm) |
| PLAY | 待核实 | 12月股数 +0.5% | 员工奖励；净条款待核 | 经营流入 $160.6M | [原文](https://www.sec.gov/Archives/edgar/data/1525769/000152576926000038/play-20260804.htm) |
| FPS | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $109.1M | [原文](https://www.sec.gov/Archives/edgar/data/2080126/000208012626000035/fps-20260630.htm) |
| ODD | 关注 | 待核实 | 可转剩余 $550M；回购分开 | 现金+投资约 $561M | [原文](https://www.sec.gov/Archives/edgar/data/1907085/000110465926029490/odd-20251231x20f.htm) |
| NTGR | 待核实 | 12月股数 -6.3% | 员工奖励；净条款待核 | 经营流出 $8.5M | [原文](https://www.sec.gov/Archives/edgar/data/1122904/000119312526338402/ntgr-20260628.htm) |
| ENVX | 关注 | 12月股数 +11.6% | 2028/2030可转债 | 经营流出 $54.9M | [原文](https://www.sec.gov/Archives/edgar/data/1828318/000182831826000056/envx-20260705.htm) |
| LYFT | 关注 | 报告流通股 378.54M | 2029/2030可转债 | 经营流入 $657.6M | [原文](https://www.sec.gov/Archives/edgar/data/1759509/000162828026054499/lyft-20260630.htm) |
| SOUN | 关注 | 待核实 | ATM及LivePerson条件并购 | 经营流出 $60.0M | [原文](https://www.sec.gov/Archives/edgar/data/1840856/000184085626000022/soun-20260630.htm) |
| AVNT | 待核实 | 报告流通股 91.72M | 待核实 | 经营流入 $59.3M | [原文](https://www.sec.gov/Archives/edgar/data/1122976/000112297626000126/avnt-20260630.htm) |
| SLDP | 关注 | 12月股数 +25.9% | ATM及双重权证 | 经营流出 $27.2M | [原文](https://www.sec.gov/Archives/edgar/data/1844862/000110465926090634/sldp-20260630x10q.htm) |
| VIA | 关注 | 待核实 | IPO转换及员工奖励 | 经营流出 $31.8M | [原文](https://www.sec.gov/Archives/edgar/data/1603015/000160301526000026/via-20260630.htm) |
| CYH | 待核实 | 12月股数 +0.6% | 员工奖励；净条款待核 | 经营流出 $209.0M | [原文](https://www.sec.gov/Archives/edgar/data/1108109/000119312526314196/cyh-20260630.htm) |
| OMDA | 待核实 | 报告流通股 61.22M | 员工奖励；净条款待核 | 经营流出 $7.8M | [原文](https://www.sec.gov/Archives/edgar/data/1611115/000162828026054840/omda-20260630.htm) |
| LCID | 高风险 | 报告流通股 394.07M | 可转优先与持续股权融资 | 经营流出 $2407.9M | [原文](https://www.sec.gov/Archives/edgar/data/1811210/000162828026052606/lcid-20260630.htm) |
| MWH | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $46.0M | [原文](https://www.sec.gov/Archives/edgar/data/2065636/000119312526352447/d152940d10q.htm) |
| HLLY | 待核实 | 12月股数 +0.6% | 员工奖励；净条款待核 | 经营流入 $44.3M | [原文](https://www.sec.gov/Archives/edgar/data/1822928/000182292826000068/hlly-20260628.htm) |
| NNE | 关注 | 12月股数 +29.1% | ATM $400M；10月拟收购 | 经营流出 $18.7M | [原文](https://www.sec.gov/Archives/edgar/data/1923891/000149315226037345/form10-q.htm) |
| PLNT | 待核实 | 原文流通股 75.20M | 待核实 | 经营流入 $193.4M | [原文](https://www.sec.gov/Archives/edgar/data/1637207/000163720726000044/plnt-20260630.htm) |
| CRNC | 关注 | 12月股数 +4.4% | 2028可转债部分回购 | 经营流入 $72.0M | [原文](https://www.sec.gov/Archives/edgar/data/1768267/000162828026054339/crnc-20260630.htm) |
| ALHC | 关注 | 报告流通股 207.44M | 可转债；保险资金约束 | 经营流入 $111.4M | [原文](https://www.sec.gov/Archives/edgar/data/1832466/000162828026051060/alhc-20260630.htm) |
| QS | 关注 | 待核实 | 未来ATM渠道；奖励 | 经营流出 $116.3M | [原文](https://www.sec.gov/Archives/edgar/data/1811414/000119312526316073/qs-20260630.htm) |
| YSS | 待核实 | 报告流通股 137.36M | 员工奖励；净条款待核 | 经营流出 $186.6M | [原文](https://www.sec.gov/Archives/edgar/data/2086587/000162828026056874/yss-20260630.htm) |
| NRDS | 待核实 | 6月股数 -10.4% | 报告有股酬；净工具待核 | 经营流入 $76.9M | [原文](https://www.sec.gov/Archives/edgar/data/1625278/000162527826000060/nrds-20260630.htm) |
| FRMI | 关注 | 报告流通股 640.47M | 7月可转债；项目建设 | 经营流出 $56.0M | [原文](https://www.sec.gov/Archives/edgar/data/2071778/000207177826000051/frmi-20260630.htm) |
| HUBG | 待核实 | 待核实 | 重述中；净工具余额待核 | 初步现金约 $132M；待重述 | [原文](https://www.sec.gov/Archives/edgar/data/940942/000119312525266623/hubg-20250930.htm) |
| UHS | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $844.9M | [原文](https://www.sec.gov/Archives/edgar/data/352915/000119312526340278/uhs-20260630.htm) |
| WLTH | 待核实 | 报告流通股 156.18M | 员工奖励；净条款待核 | 经营流入 $70.0M | [原文](https://www.sec.gov/Archives/edgar/data/1524566/000162828026061848/wlth-20260731.htm) |
| ALMU | 关注 | 12月股数 +21.2% | ATM $50M；已售0.83M股 | 经营流出 $3.3M | [原文](https://www.sec.gov/Archives/edgar/data/1828805/000121390026100584/ea0305364-10k_aeluma.htm) |
| ONT | 关注 | 12月股数 -0.5% | 旧优先股与当前奖励分开 | 经营流出 $5.5M | [原文](https://www.sec.gov/Archives/edgar/data/1643615/000119312526337925/ont-20260630.htm) |
| NCLH | 关注 | 12月股数 +1.6% | 可转工具与船舶融资 | 经营流入 $1414.0M | [原文](https://www.sec.gov/Archives/edgar/data/1513761/000110465926089657/nclh-20260630x10q.htm) |
| RR | 关注 | 待核实 | ATM已售15.16M股 | 经营流出 $3.6M | [原文](https://www.sec.gov/Archives/edgar/data/1963685/000121390026091798/ea0302286-10q_richtech.htm) |
| KVYO | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $128.2M | [原文](https://www.sec.gov/Archives/edgar/data/1835830/000183583026000040/kvyo-20260630.htm) |
| BKSY | 关注 | 报告流通股 40.92M | 可转债及ATM已售安排 | 经营流出 $5.9M | [原文](https://www.sec.gov/Archives/edgar/data/1753539/000175353926000124/bksy-20260630.htm) |
| JACK | 待核实 | 报告流通股 19.18M | 待核实 | 现金 $46.3M；受限款另列 | [原文](https://www.sec.gov/Archives/edgar/data/807882/000080788226000091/jack-20260705.htm) |
| ASPI | 关注 | 报告流通股 153.31M | 子公司可转债及预付权证 | 经营流出 $41.1M | [原文](https://www.sec.gov/Archives/edgar/data/1921865/000119312526352603/aspi-20260630.htm) |
| CLB | 待核实 | 12月股数 -2.2% | 待核实 | 经营流入 $11.8M | [原文](https://www.sec.gov/Archives/edgar/data/1958086/000119312526326345/clb-20260630.htm) |
| FUBO | 关注 | 待核实 | 并购后股本；2029可转债 | 经营流出 $417.1M | [原文](https://www.sec.gov/Archives/edgar/data/1484769/000162828026053535/fubo-20260630.htm) |
| CE | 待核实 | 12月股数 +0.2% | 待核实 | 经营流入 $285.0M | [原文](https://www.sec.gov/Archives/edgar/data/1306830/000130683026000117/ce-20260630.htm) |
| VOYG | 关注 | 待核实 | 9月新可转债 $402.5M | 经营流出 $84.0M | [原文](https://www.sec.gov/Archives/edgar/data/1788060/000162828026052292/voyg-20260630.htm) |
| ARHS | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $59.8M | [原文](https://www.sec.gov/Archives/edgar/data/1875444/000187544426000030/arhs-20260630.htm) |
| ULCC | 待核实 | 原文流通股 230.22M | 待核实 | 现金 $955M；租赁/债务用途 | [原文](https://www.sec.gov/Archives/edgar/data/1670076/000167007626000087/fron-20260630.htm) |
| WOLF | 关注 | 报告流通股 53.00M | 重组后可转债与预付权证 | 经营流出 $180.8M | [原文](https://www.sec.gov/Archives/edgar/data/895419/000089541926000054/wolf-20260628.htm) |
| ACDC | 关注 | 报告流通股 182.12M | 可转优先；关联债务 | 经营流入 $32.2M | [原文](https://www.sec.gov/Archives/edgar/data/1881487/000119312526337969/acdc-20260630.htm) |
| RGNX | 关注 | 12月股数 +30.7% | 7月新股/预付融资 $107.8M | 经营流出 $138.4M | [原文](https://www.sec.gov/Archives/edgar/data/1590877/000119312526336725/rgnx-20260630.htm) |
| EQPT | 关注 | 待核实 | 可转优先与收购资金 | 经营流出 $142.0M | [原文](https://www.sec.gov/Archives/edgar/data/1693736/000169373626000020/eqpt-20260630.htm) |
| VELO | 关注 | 报告流通股 32.15M | ATM及可转票据偿付 | 经营流出 $39.5M | [原文](https://www.sec.gov/Archives/edgar/data/1825079/000119312526344560/velo-20260630.htm) |
| FLY | 待核实 | 报告流通股 167.40M | 员工奖励；净条款待核 | 经营流出 $144.1M | [原文](https://www.sec.gov/Archives/edgar/data/1860160/000186016026000023/fly-20260630.htm) |
| BETA | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流出 $170.2M | [原文](https://www.sec.gov/Archives/edgar/data/1784570/000162828026055982/bta-20260630.htm) |
| GENI | 关注 | 原文流通股 267.63M | NFL权证及Legend对价 | 现金 $155.1M；H1流出 $147.2M | [原文](https://www.sec.gov/Archives/edgar/data/1834489/000119312526110749/geni-20251231.htm) |
| MRLN | 关注 | 报告流通股 101.07M | 组合转换及12%优先 | 经营流出 $50.9M | [原文](https://www.sec.gov/Archives/edgar/data/2028707/000162828026056882/mrln-20260630.htm) |
| EOSE | 关注 | 12月股数 +40.1% | 多批可转优先及权证 | 经营流出 $191.8M | [原文](https://www.sec.gov/Archives/edgar/data/1805077/000162828026052906/eose-20260630.htm) |
| RCKT | 关注 | 报告流通股 109.77M | 预付权证；新贷款分批 | 新贷已提 $35M；余款有条件 | [原文](https://www.sec.gov/Archives/edgar/data/1281895/000119312526342348/rckt-20260630.htm) |
| CABA | 关注 | 12月股数 +85.4% | 9月旧权证已行权；余额须净 | 经营流出 $84.1M | [原文](https://www.sec.gov/Archives/edgar/data/1759138/000175913826000039/caba-20260630.htm) |
| BETR | 关注 | 待核实 | 旧可转已交换新担保债 | 经营流出 $101.7M | [原文](https://www.sec.gov/Archives/edgar/data/1835856/000162828026055745/aurcu-20260630.htm) |
| RUN | 关注 | 报告流通股 240.85M | 可转债与项目融资 | 经营流出 $175.6M | [原文](https://www.sec.gov/Archives/edgar/data/1469367/000162828026053366/run-20260630.htm) |
| IE | 关注 | 12月股数 +20.2% | 子公司可转债12月到期 | 经营流出 $62.3M | [原文](https://www.sec.gov/Archives/edgar/data/1879016/000187901626000017/ie-20260630.htm) |
| FATE | 关注 | 12月股数 +3.9% | 可转优先与奖励 | 经营流出 $23.4M | [原文](https://www.sec.gov/Archives/edgar/data/1434316/000119312526347988/fate-20260630.htm) |
| WD | 待核实 | 12月股数 +0.8% | 员工奖励；净条款待核 | 经营流入 $25.6M | [原文](https://www.sec.gov/Archives/edgar/data/1497770/000110465926091536/wd-20260630x10q.htm) |
| PCT | 关注 | 12月股数 +11.6% | B系列可转优先及2032债 | 经营流出 $92.7M | [原文](https://www.sec.gov/Archives/edgar/data/1830033/000183003326000026/pct-20260630.htm) |
| APTV | 待核实 | 12月股数 -4.7% | 员工奖励；净条款待核 | 经营流出 $51.0M | [原文](https://www.sec.gov/Archives/edgar/data/1521332/000152133226000061/aptv-20260630.htm) |
| CATX | 关注 | 12月股数 +53.7% | 预付权证与研发融资 | 经营流出 $52.1M | [原文](https://www.sec.gov/Archives/edgar/data/728387/000119312526342512/catx-20260630.htm) |
| GLOB | 待核实 | 原文流通股 43.18M | 别家可转投资非自身稀释 | 现金+短投 $168.8M | [原文](https://www.sec.gov/Archives/edgar/data/1557860/000162828026012910/glob-20251231.htm) |
| LZM | 关注 | 待核实 | 可转债及桥贷条件 | 现金 $37.3M；矿山融资 | [原文](https://www.sec.gov/Archives/edgar/data/1958217/000162828026049925/a20260724waiverrequestfaci.htm) |
| FIP | 关注 | 12月股数 +2.7% | 可转优先及认股权证 | 经营流出 $30.3M | [原文](https://www.sec.gov/Archives/edgar/data/1899883/000189988326000036/fip-20260630.htm) |
| NTLA | 关注 | 12月股数 +30.5% | ATM及持续临床投入 | 经营流出 $200.5M | [原文](https://www.sec.gov/Archives/edgar/data/1652130/000119312526337952/ntla-20260630.htm) |
| KYTX | 待核实 | 12月股数 +43.0% | 员工奖励；净条款待核 | 经营流出 $81.9M | [原文](https://www.sec.gov/Archives/edgar/data/1994702/000119312526344607/kytx-20260630.htm) |
| FLUT | 待核实 | 12月股数 -1.5% | 员工奖励；净条款待核 | 经营流入 $693.0M | [原文](https://www.sec.gov/Archives/edgar/data/1635327/000163532726000056/flut-20260630.htm) |
| GOGO | 待核实 | 12月股数 +1.4% | 待核实 | 经营流入 $25.1M | [原文](https://www.sec.gov/Archives/edgar/data/1537054/000119312526337921/gogo-20260630.htm) |
| RKT | 关注 | 待核实 | 并购换股及可转工具 | 经营流入 $645.0M | [原文](https://www.sec.gov/Archives/edgar/data/1805284/000162828026054577/rkt-20260630.htm) |
| SVV | 待核实 | 12月股数 -1.1% | 待核实 | 经营流入 $92.7M | [原文](https://www.sec.gov/Archives/edgar/data/1883313/000188331326000060/svv-20260704.htm) |
| AGIO | 待核实 | 12月股数 +2.8% | 员工奖励；净条款待核 | 经营流出 $176.2M | [原文](https://www.sec.gov/Archives/edgar/data/1439222/000143922226000118/agio-20260630.htm) |
| NPWR | 关注 | 待核实 | LLC经济单位与项目融资 | 经营流出 $60.7M | [原文](https://www.sec.gov/Archives/edgar/data/1845437/000184543726000033/npwr-20260630.htm) |
| EDIT | 关注 | 12月股数 +70.8% | 5月权证；7月后股数变化 | 经营流出 $52.6M | [原文](https://www.sec.gov/Archives/edgar/data/1650664/000165066426000083/edit-20260630.htm) |
| MAGN | 待核实 | 原文流通股 35.80M | 报告有股酬；净工具待核 | 经营流入 $76.0M | [原文](https://www.sec.gov/Archives/edgar/data/41719/000004171926000049/form10q.htm) |
| ABAT | 关注 | 12月股数 +20.8% | ATM及旧可转工具 | 经营流出 $24.2M | [原文](https://www.sec.gov/Archives/edgar/data/1576873/000149315226042497/form10-k.htm) |
| LAES | 关注 | 6月股数 +16.0% | ATM余 $28.9M；E权证60.83M | 现金 $479.8M；受限 $6.3M另列 | [原文](https://www.sec.gov/Archives/edgar/data/1951222/000110465926037706/laes-20251231x20f.htm) |
| PGY | 关注 | 待核实 | 可转优先；金融资金分开 | 经营流入 $117.9M | [原文](https://www.sec.gov/Archives/edgar/data/1883085/000188308526000058/pgy-20260630.htm) |
| DFH | 关注 | 待核实 | 9月已发优先 $225M；另450M待交割 | 经营流出 $151.1M | [原文](https://www.sec.gov/Archives/edgar/data/1825088/000162828026050969/dfh-20260630.htm) |
| EFX | 待核实 | 12月股数 -5.1% | 待核实 | 经营流入 $581.7M | [原文](https://www.sec.gov/Archives/edgar/data/33185/000003318526000028/efx-20260630.htm) |
| ORGO | 关注 | 报告流通股 128.67M | 8月ATM及可转优先 | 经营流出 $10.5M | [原文](https://www.sec.gov/Archives/edgar/data/1661181/000119312526338049/orgo-20260630.htm) |
| GLXY | 关注 | 待核实 | 多类/合伙单位与项目资金 | 经营流入 $288.6M | [原文](https://www.sec.gov/Archives/edgar/data/1859392/000185939226000091/glxy-20260630.htm) |
| IKT | 关注 | 12月股数 +87.3% | 2月已售ATM1.90M股 | 经营流出 $24.5M | [原文](https://www.sec.gov/Archives/edgar/data/1750149/000119312526344707/ikt-20260630.htm) |
| NRGV | 关注 | 12月股数 +12.3% | 6月改订可转融资 | 经营流出 $84.4M | [原文](https://www.sec.gov/Archives/edgar/data/1828536/000182853626000101/nrgv-20260630.htm) |
| ZG | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $211.0M | [原文](https://www.sec.gov/Archives/edgar/data/1617640/000161764026000052/z-20260630.htm) |
| BBNX | 关注 | 12月股数 +3.5% | 9月普通股及预付权证发行 | 经营流出 $38.5M | [原文](https://www.sec.gov/Archives/edgar/data/1674632/000119312526323777/bbnx-20260630.htm) |
| DNLI | 关注 | 12月股数 +9.3% | 既有预付权证与奖励 | 经营流出 $228.2M | [原文](https://www.sec.gov/Archives/edgar/data/1714899/000171489926000097/dnli-20260630.htm) |
| HGV | 待核实 | 12月股数 -12.8% | 员工奖励；净条款待核 | 经营流入 $262.0M | [原文](https://www.sec.gov/Archives/edgar/data/1674168/000167416826000100/hgv-20260630.htm) |
| HUBS | 待核实 | 12月股数 -5.4% | 待核实 | 经营流入 $421.6M | [原文](https://www.sec.gov/Archives/edgar/data/1404655/000119312526335232/hubs-20260630.htm) |
| ORBS | 关注 | 报告流通股 429.78M | ATM与数字资产资金 | 经营流出 $9.7M | [原文](https://www.sec.gov/Archives/edgar/data/1892492/000149315226036637/form10-q.htm) |
| NB | 关注 | 报告流通股 145.85M | 预付权证及矿山资本 | 经营流出 $15.9M | [原文](https://www.sec.gov/Archives/edgar/data/1512228/000119312526402806/nb-20260630.htm) |
| LZ | 待核实 | 12月股数 -5.0% | 待核实 | 经营流入 $86.8M | [原文](https://www.sec.gov/Archives/edgar/data/1286139/000128613926000031/lz-20260630.htm) |
| CPRI | 待核实 | 12月股数 -4.5% | 待核实 | 经营流入 $73.0M | [原文](https://www.sec.gov/Archives/edgar/data/1530721/000153072126000081/cpri-20260627.htm) |
| SITE | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流出 $122.1M | [原文](https://www.sec.gov/Archives/edgar/data/1650729/000165072926000016/site-20260628.htm) |
| AI | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $2.1M | [原文](https://www.sec.gov/Archives/edgar/data/1577526/000157752626000126/ai-20260731.htm) |
| DXYZ | 关注 | 待核实 | 封闭式基金ATM；按NAV另核 | 基金投资资金；按NAV另核 | [原文](https://www.sec.gov/Archives/edgar/data/1843974/000157587226000624/dxyx104_424b3.htm) |
| VERX | 关注 | 待核实 | 2029可转债 $345M | 经营流入 $68.9M | [原文](https://www.sec.gov/Archives/edgar/data/1806837/000110465926090420/verx-20260630x10q.htm) |
| SMMT | 关注 | 报告流通股 797.75M | 9月AstraZeneca可转优先 $2B | 经营流出 $263.4M | [原文](https://www.sec.gov/Archives/edgar/data/1599298/000159929826000068/smmt-20260630.htm) |
| TASK | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $89.4M | [原文](https://www.sec.gov/Archives/edgar/data/1829864/000182986426000149/task-20260630.htm) |
| PACK | 待核实 | 12月股数 +1.7% | 员工奖励；净条款待核 | 经营流入 $7.1M | [原文](https://www.sec.gov/Archives/edgar/data/1712463/000162828026050839/pack-20260630.htm) |
| FOXF | 待核实 | 12月股数 +0.6% | 出售收取可转票据非自身稀释 | 经营流入 $13.2M | [原文](https://www.sec.gov/Archives/edgar/data/1424929/000142492926000049/foxf-20260703.htm) |
| SIBN | 待核实 | 12月股数 +3.9% | 员工奖励；净条款待核 | 经营流出 $1.6M | [原文](https://www.sec.gov/Archives/edgar/data/1459839/000145983926000069/sibn-20260630.htm) |
| VRRM | 待核实 | 12月股数 -4.7% | 待核实 | 经营流入 $97.2M | [原文](https://www.sec.gov/Archives/edgar/data/1682745/000119312526335490/vrrm-20260630.htm) |
| GTM | 待核实 | 12月股数 -8.6% | 待核实 | 经营流入 $202.0M | [原文](https://www.sec.gov/Archives/edgar/data/1794515/000179451526000056/zi-20260630.htm) |
| SENS | 关注 | 报告流通股 52.87M | 可转优先；拆并股先统一 | 经营流出 $62.2M | [原文](https://www.sec.gov/Archives/edgar/data/1616543/000110465926092056/sens-20260630x10q.htm) |
| BRZE | 待核实 | 报告流通股 113.58M | 员工奖励；净条款待核 | 经营流入 $52.3M | [原文](https://www.sec.gov/Archives/edgar/data/1676238/000167623826000040/brze-20260731.htm) |
| WDAY | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $1215.0M | [原文](https://www.sec.gov/Archives/edgar/data/1327811/000132781126000044/wday-20260731.htm) |
| NUAI | 关注 | 12月股数 +310.2% | 新ATM及历史可转票据 | 经营流出 $10.9M | [原文](https://www.sec.gov/Archives/edgar/data/2028336/000121390026090138/ea0301610-10q_newera.htm) |
| WLFC | 关注 | 报告流通股 21.14M | 2031可转债；1拆3 | 经营流入 $134.2M | [原文](https://www.sec.gov/Archives/edgar/data/1018164/000101816426000068/wlfc-20260630.htm) |
| OEC | 待核实 | 12月股数 +0.7% | 待核实 | 经营流入 $14.9M | [原文](https://www.sec.gov/Archives/edgar/data/1609804/000162828026053422/oec-20260630.htm) |
| HAYW | 待核实 | 6月股数 -1.5% | 待核实 | 现金+短投 $483.4M | [原文](https://www.sec.gov/Archives/edgar/data/1834622/000183462226000047/hayw-20260627.htm) |
| SWIM | 待核实 | 12月股数 +0.9% | 员工奖励；净条款待核 | 经营流入 $5.8M | [原文](https://www.sec.gov/Archives/edgar/data/1833197/000162828026052925/swim-20260627.htm) |
| GEHC | 待核实 | 6月股数 -0.9% | 待核实 | 现金 $2.079B；并购用途 | [原文](https://www.sec.gov/Archives/edgar/data/1932393/000193239326000046/gehc-20260630.htm) |
| STAA | 待核实 | 12月股数 +1.2% | 员工奖励；净条款待核 | 经营流出 $2.0M | [原文](https://www.sec.gov/Archives/edgar/data/718937/000071893726000037/staa-20260703.htm) |
| EVER | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $53.9M | [原文](https://www.sec.gov/Archives/edgar/data/1640428/000119312526332775/ever-20260630.htm) |
| WEAV | 待核实 | 12月股数 +3.8% | 员工奖励；净条款待核 | 经营流入 $4.5M | [原文](https://www.sec.gov/Archives/edgar/data/1609151/000160915126000074/weav-20260630.htm) |
| SRPT | 关注 | 12月股数 +8.1% | 2027/2030可转债 | 经营流出 $5.6M | [原文](https://www.sec.gov/Archives/edgar/data/873303/000119312526335003/srpt-20260630.htm) |
| EYE | 待核实 | 12月股数 -0.2% | 待核实 | 经营流入 $69.8M | [原文](https://www.sec.gov/Archives/edgar/data/1710155/000162828026056493/eye-20260704.htm) |
| WWW | 待核实 | 12月股数 +1.0% | 待核实 | 经营流入 $3.4M | [原文](https://www.sec.gov/Archives/edgar/data/110471/000162828026056524/www-20260704.htm) |
| RXRX | 待核实 | 报告流通股 535.34M | 员工奖励；净条款待核 | 经营流出 $187.0M | [原文](https://www.sec.gov/Archives/edgar/data/1601830/000160183026000098/rxrx-20260630.htm) |
| WAY | 待核实 | 12月股数 +10.0% | 员工奖励；净条款待核 | 经营流入 $144.3M | [原文](https://www.sec.gov/Archives/edgar/data/1990354/000199035426000035/way-20260630.htm) |
| LIF | 关注 | 12月股数 +5.1% | 2025可转债与封顶交易 | 经营流入 $41.0M | [原文](https://www.sec.gov/Archives/edgar/data/1581760/000158176026000141/lifx-20260630.htm) |
| COLL | 关注 | 12月股数 +3.3% | 2029可转债及授信约束 | 经营流入 $128.4M | [原文](https://www.sec.gov/Archives/edgar/data/1267565/000162828026053851/coll-20260630.htm) |
| UMAC | 关注 | 12月股数 +64.1% | 旧优先已撤回；奖励另核 | 经营流出 $38.9M | [原文](https://www.sec.gov/Archives/edgar/data/1956955/000168316826006016/umac_i10q-063026.htm) |
| SONO | 待核实 | 12月股数 -2.1% | 员工奖励；净条款待核 | 经营流入 $144.2M | [原文](https://www.sec.gov/Archives/edgar/data/1314727/000131472726000086/sono-20260627.htm) |
| GSHD | 待核实 | 原文流通股 23.80M | 报告有股酬；净工具待核 | 经营流入 $38.8M | [原文](https://www.sec.gov/Archives/edgar/data/1726978/000172697826000060/gshd-20260630.htm) |
| CERT | 待核实 | 12月股数 -5.0% | 员工奖励；净条款待核 | 经营流入 $21.7M | [原文](https://www.sec.gov/Archives/edgar/data/1827090/000182709026000028/cert-20260630.htm) |
| TDOC | 关注 | 12月股数 +2.8% | 存续可转债与授信 | 经营流入 $74.2M | [原文](https://www.sec.gov/Archives/edgar/data/1477449/000147744926000038/tdoc-20260630.htm) |
| COUR | 关注 | 待核实 | 并购换股；投资别家可转 | 经营流出 $5.2M | [原文](https://www.sec.gov/Archives/edgar/data/1651562/000165156226000063/cour-20260630.htm) |
| INSP | 待核实 | 12月股数 -2.2% | 员工奖励；净条款待核 | 经营流入 $36.1M | [原文](https://www.sec.gov/Archives/edgar/data/1609550/000160955026000047/insp-20260630.htm) |
| SERV | 关注 | 12月股数 +44.8% | 实际新股与机器人投入 | 经营流出 $84.7M | [原文](https://www.sec.gov/Archives/edgar/data/1832483/000183248326000035/serv-20260630.htm) |
| TRIP | 待核实 | 报告流通股 117.20M | 2026旧可转债已偿还 | 经营流入 $261.5M | [原文](https://www.sec.gov/Archives/edgar/data/1526520/000119312526336693/trip-20260630.htm) |
| CRCT | 待核实 | 待核实 | 员工奖励；净条款待核 | 经营流入 $77.2M | [原文](https://www.sec.gov/Archives/edgar/data/1828962/000182896226000049/crct-20260630.htm) |
| MTCH | 关注 | 12月股数 -4.6% | 交换票据与权证封顶 | 经营流入 $564.2M | [原文](https://www.sec.gov/Archives/edgar/data/891103/000089110326000130/mtch-20260630.htm) |
| YELP | 待核实 | 12月股数 -14.0% | 员工奖励；净条款待核 | 经营流入 $133.6M | [原文](https://www.sec.gov/Archives/edgar/data/1345016/000134501626000066/yelp-20260630.htm) |
| ALVO | 关注 | 待核实 | 可转债；股份借贷不等于全发 | 现金 $142.75M；贷款有条件 | [原文](https://www.sec.gov/Archives/edgar/data/1898416/000189841626000004/alvo-20251231.htm) |
| REI | 关注 | 12月股数 +26.1% | 已发股；债务与资金用途 | 经营流入 $66.7M | [原文](https://www.sec.gov/Archives/edgar/data/1384195/000138419526000080/rei-20260630.htm) |
| KOS | 关注 | 12月股数 +24.5% | 可转债 $400M；封顶条款 | 经营流入 $281.6M | [原文](https://www.sec.gov/Archives/edgar/data/1509991/000150999126000049/kos-20260630.htm) |
| NEO | 关注 | 12月股数 -0.5% | 2028/2032可转债 | 经营流入 $11.8M | [原文](https://www.sec.gov/Archives/edgar/data/1077183/000107718326000059/neo-20260630.htm) |
| QMCO | 关注 | 报告流通股 39.41M | 6月可转债已转换 | 经营流入 $0.9M | [原文](https://www.sec.gov/Archives/edgar/data/709283/000162828026055417/qtm-20260630.htm) |
| AESI | 关注 | 报告流通股 125.00M | 2031可转债与项目开支 | 经营流入 $18.4M | [原文](https://www.sec.gov/Archives/edgar/data/1984060/000119312526333424/aesi-20260630.htm) |
| PRME | 待核实 | 12月股数 +34.8% | 员工奖励；净条款待核 | 经营流出 $83.8M | [原文](https://www.sec.gov/Archives/edgar/data/1894562/000162828026053883/prme-20260630.htm) |
| PPLI | 待核实 | 待核实 | 员工奖励；净条款待核 | 现金观察点；需求待净核 | [原文](https://www.sec.gov/Archives/edgar/data/1800227/000162828026051881/ppli-20260630.htm) |

## 验证及发布

原始成员、业务、其它静态研究、名单维护日期、dashboard和boxes契约不变；融资独立schema_version=1，comparison为可选兼容字段，公式只在indicators.py。单只资料不足保留事实与缺口，异常输入不覆盖已有有效快照。Python151项、lint/build已通过；离线浏览器与真实页面检查、推送及Actions部署结果以OPERATIONS最新记录为准，不以本报告预称部署成功。
