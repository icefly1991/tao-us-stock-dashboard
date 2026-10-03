# 2026-10-01取证／10-02复核：全池估值与首批条件模型

CR-032 / DATA-030 / RES-013。**当前是进行中记录，不是全量填价完成或发布验收。**用户范围为344只公司；BITX、IBIT、QQQ、TQQQ、VIX、DOGEUSD六项建议价整组留空。加密业务公司仍是公司股票，不因业务涉及数字资产就改成排除项。CSV、持仓、名单日期及既有研究评级不改。

## 当前覆盖

7只模型于纽约10月2日完成当前申报复核；valued_at记录10月2日。全池资料清单仍是10月1日取证，不给其余337行续期或填估值日。

- 本轮SEC submissions及companyfacts：344家公司资料取得，0下载失败；逐只CIK与缓存取证清单、CSV symbol核对。原始文件留在忽略的缓存，仓库只维护来源／字段清单。
- 情景快照：7只已建立模型（NABL、MCD、NKE、MSFT、AVGO、PG、CMG），337只待逐只预测及融资、稀释、行业方法研究，6只排除。未完成行没有valued_at或数字，不用抓取日填估值日。
- 自动标签取证有236行字段缺口或数量级疑点；这是字段提取问题，不能解读成236家公司财务恶化。PG现金新报表标签与旧标签不同，已用原文核对；NKE最新8-K附表用于替换旧现金、债务和股数；MCD股份标准字段711.1与原文“百万股”须人工对照，未自动乘百万后生成价格。
- 尚未全量填价，未commit或push本轮改动。用户已授权全量研究、验证后push，后续无需重复请求同一授权。

## 已建立的模型

以下是研究者条件假设的DCF结果，**不是公司／机构发表的目标价**。原文事实、公司指引与未来预测分开记录；数字不证明市场价格客观高估或低估。每档完整参数、融资和稀释说明维护于valuation_assumptions.json，数学计算仅在indicators.py。

| 标的 | 估值日 | 财务基准 | 乐观 | 保守 | 极端保守 | 最新建模资料 |
| --- | --- | --- | ---: | ---: | ---: | --- |
| NABL | 2026-10-02 | 2026-06-30 | $2.8680 | $0.0000 | $0.0000 | [N-able：最新季度10-Q（2026-08-10提交，含修订数字及内控缺陷）](https://www.sec.gov/Archives/edgar/data/1834488/000183448826000047/nabl-20260630.htm) |
| MCD | 2026-10-02 | 2026-06-30 | $185.2497 | $67.6590 | $0.0000 | [McDonald’s：2026-09-23 NEXT最新增长、投资及现金转化目标](https://www.sec.gov/Archives/edgar/data/63908/000006390826000076/exhibit991-investorupdate2.htm) |
| NKE | 2026-10-02 | 2026-08-31 | $30.5727 | $11.8247 | $1.6572 | [NIKE：2026-10-01发布FY2027第一季度业绩、Pace计划与最新指引](https://www.sec.gov/Archives/edgar/data/320187/000032018726000184/q1fy27exhibit991er.htm) |
| MSFT | 2026-10-02 | 2026-06-30 | $311.8676 | $136.7743 | $29.7039 | [Microsoft：2026财年10-K，2026-07-29提交](https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm) |
| AVGO | 2026-10-02 | 2026-08-02 | $192.9739 | $69.5030 | $3.9290 | [Broadcom：最新季度10-Q（2026-09-10提交，财务期8月2日）](https://www.sec.gov/Archives/edgar/data/1730168/000173016826000080/avgo-20260802.htm) |
| PG | 2026-10-02 | 2026-06-30 | $92.8659 | $50.0480 | $15.2523 | [P&G：2026财年10-K，2026-08-04提交（财务期2026-06-30）](https://www.sec.gov/Archives/edgar/data/80424/000008042426000103/pg-20260630.htm) |
| CMG | 2026-10-02 | 2026-06-30 | $22.0803 | $9.4155 | $2.4960 | [Chipotle：最新季度10-Q（2026-07-31提交，财务期6月30日）](https://www.sec.gov/Archives/edgar/data/1058090/000105809026000066/cmg-20260630.htm) |

### PG

以最新年报和FY2027现金转化指引建立恢复／低增长／品牌与成本压力三路径。不机械外推FY2026高现金转化；剔除一次性过渡税的影响并检查企业到普通股权益桥梁。DebtCurrent已含部分到期债，不重复加LongTermDebtCurrent；少数权益只在权益桥梁扣除，不重复扣合并现金流；养老及其他退休欠资用保守账面代理，不把无法跨计划转出的盈余当可分配现金。优先股采用已包含转换的稀释股数，不重复扣优先股。未来现金流及资本成本均为研究者假设。

### MSFT

最新年报、7月电话会及9月新分部/调整后指引共同作为依据。9月文件改变分部和指标口径，但总公司指引不变。不能把CFO减现金资本开支直接称FCFF：存量融资租赁优先权益、未来新增融资租赁资产的经济资本投入和股权薪酬均需处理；租赁分类或折旧年限变化不创造现金。六年模型分别假设资本回报顺利兑现、缓慢恢复和长期低回报，不能把当前账面利润直接乘倍数作为三档价。

### NKE

采用10月1日刚公布的FY2027第一季度附表与新Pace指引，不能沿用5月末现金、债务或旧年份单一股份标签。累计节约不等于每年节约，须计重组和再投资；现金流预测由品牌修复速度、渠道及库存、经营再投资共同约束。三档均为持续经营条件路径，压力价不是清算保证底价；更严重破产或股权取消仍可能归零。

### MCD

先核对9月23日新的NEXT策略，2027至2030基础资本投入及资本支持、租金减免分别计入；不能重复扣总支持或把主要归加盟商的效率收益当公司现金流。最新季度未拆分融资租赁分类，输入明确采用最新公开年报2,352百万的代理，不冒充6月新余额，并保留这一估计限制。季度原文百万股单位人工核对，压力DCF剩余普通股价值为0，不是缺失或当前破产判定。

### CMG

最新季报与9月开店指引共同约束经营路径；半年CFO不直接年化，包含未来设备、租金和薪酬支出。受限和三级投资不按可用现金计入；已有法律准备只在权益桥梁扣，未来支出不重复扣。8月供应链食品安全调查仅作为条件压力依据，不当已认定违法。现有奖励稀释与未来现金替代成本分开。

### AVGO

最新Q3及Q4指引。债务用偿付本金，税款、应付利息和客户担保与采购成本分开，采购承诺不重复全额当债务。客户开出的可转票据不是Broadcom已发行债券；担保未实际赔付，三档0／2900／29000百万担保损失是研究敏感性，不能冒充确定负债。FCFF须扣现金税、周转、投入和未来激励，股数采用公司调整后稀释口径。若客户改用票据结算，须检查担保重叠及融资后重算。

### NABL

最新季报修订、全年指引、8月回购和9月安全补丁一起复核。延期收购对价按名义剩余付款计入优先现金义务，避免与账面数或未来费用重复。设备及软件资本化均扣投入，回购授权不当已完成；将订阅增长恢复、缓慢恢复和续费／安全压力分别建模，内控缺陷不等同已确认造假。

### NVDA仍待研究的具体原因

已复核8月最新季报、9月2日收购相关8-K及公司IR。客户融资、数据中心土地／电力／建筑担保、新收购对价及后续支付须分别查证。不能用旧年度标签或只用季度利润跳过这些索偿；当前没有填三档数字，也未给待研究行续期。

## 取证方式与门禁

本轮来源截至纽约2026-10-01；仅使用截至该日已申报的事实，不把未来文件倒填。scripts/research_valuation_evidence.py只建内部取证清单，不预测现金流、不计算建议价、不推进研究日期。跨所有别名选择最新期间，最新年报事实须与该年报期间匹配；季报／年初累计不直接年化；标签缺失、股数单位或类别冲突保留待核。USD及shares单位分别查证，ADR和金融、临床等主体仍需要适用模型。

复现（SEC缓存来自本轮真实下载，不把旧缓存日期冒充新取证）：

```powershell
python scripts/research_valuation_evidence.py --cache .cache/cr032-evidence --as-of 2026-10-01
python scripts/generate_valuation_scenarios.py
```

## 已完成工程验证

139项Python、64项Chromium回归、lint及TypeScript/Vite build通过。真实行情生成：350成功、0失败、0停牌，data_date=20261001；700历史文件、0图表错误，两箱体100/234均0错误。真实输出只写缓存，public/data/dashboard.json继续为安全占位。新增可选raw行scenario_comparison及analyst_comparison属于CR-030/031的兼容扩展；valuation-scenarios仍v1，内部valuation_evidence不新增网页请求。工程测试不能证明待研究公司的估值已经完成。

## 全池定期文件清单

下表列最近10-K/10-Q/20-F/40-F；8-K、6-K及公司IR还需逐只阅读，不能把此列视为所有最新经营信息。完整原始字段、后续文件和取数疑点保存在scripts/valuation_evidence.json。

| 标的 | 模型进度 | 最近定期文件 | 自动取数字段疑点数 |
| --- | --- | --- | ---: |
| SMR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1822966/000182296626000085/smr-20260630.htm) | 2 |
| VIX | 按要求跳过 | — | — |
| IMSR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/2019804/000110465926094085/tmb-20260630x10q.htm) | 2 |
| NABL | 已建立条件模型 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1834488/000183448826000047/nabl-20260630.htm) | 1 |
| HOOD | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1783879/000178387926000114/hood-20260630.htm) | 3 |
| MP | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1801368/000180136826000048/mp-20260630.htm) | 0 |
| ORCL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-11](https://www.sec.gov/Archives/edgar/data/1341439/000119312526389274/orcl-20260831.htm) | 0 |
| HIMS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1773751/000177375126000163/hims-20260630.htm) | 2 |
| BITX | 按要求跳过 | — | — |
| CRWV | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/1769628/000176962826000366/crwv-20260630.htm) | 2 |
| IBIT | 按要求跳过 | — | — |
| RZLV | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-30](https://www.sec.gov/Archives/edgar/data/1920294/000119312526132456/rzlv-20251231.htm) | 0 |
| MCD | 已建立条件模型 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/63908/000006390826000073/mcd-20260630.htm) | 1 |
| IREN | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-08-27](https://www.sec.gov/Archives/edgar/data/1878848/000187884826000052/iren-20260630.htm) | 1 |
| ATCH | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-09-24](https://www.sec.gov/Archives/edgar/data/1963088/000149315226044008/form10-k.htm) | 1 |
| CRCL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1876042/000187604226000248/crcl-20260630.htm) | 1 |
| NVDA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-26](https://www.sec.gov/Archives/edgar/data/1045810/000104581026000075/nvda-20260726.htm) | 0 |
| NKE | 已建立条件模型 | [10-K · 2026-07-15](https://www.sec.gov/Archives/edgar/data/320187/000032018726000088/nke-20260531.htm) | 2 |
| KLAR | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-02-26](https://www.sec.gov/Archives/edgar/data/2003292/000200329226000007/klar-20251231.htm) | 7 |
| MNTN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1891027/000189102726000073/mntn-20260630.htm) | 4 |
| MSFT | 已建立条件模型 | [10-K · 2026-07-29](https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/msft-20260630.htm) | 0 |
| META | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1326801/000162828026050705/meta-20260630.htm) | 1 |
| RGTI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1838359/000110465926091993/rgti-20260630x10q.htm) | 0 |
| NXH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1130713/000162828026052744/byon-20260630.htm) | 1 |
| AVGO | 已建立条件模型 | [10-Q · 2026-09-10](https://www.sec.gov/Archives/edgar/data/1730168/000173016826000080/avgo-20260802.htm) | 0 |
| QQQ | 按要求跳过 | — | — |
| ETOR | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-02](https://www.sec.gov/Archives/edgar/data/1493318/000121390026022034/ea0278371-20f_etoro.htm) | 8 |
| ARKO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1823794/000119312526339096/arko-20260630.htm) | 0 |
| UAA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1336917/000133691726000111/ua-20260630.htm) | 2 |
| PG | 已建立条件模型 | [10-K · 2026-08-04](https://www.sec.gov/Archives/edgar/data/80424/000008042426000103/pg-20260630.htm) | 1 |
| DOGEUSD | 按要求跳过 | — | — |
| STUB | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1337634/000162828026056402/stub-20260630.htm) | 1 |
| VOR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/1817229/000119312526343607/vor-20260630.htm) | 2 |
| MSTR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-03](https://www.sec.gov/Archives/edgar/data/1050446/000105044626000044/mstr-20260630.htm) | 2 |
| GEMI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/2055592/000205559226000065/gemi-20260630.htm) | 2 |
| OSCR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1568651/000156865126000069/oscr-20260630.htm) | 1 |
| DKNG | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1883685/000188368526000029/dkng-20260630.htm) | 2 |
| AMD | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/2488/000000248826000123/amd-20260627.htm) | 0 |
| TQQQ | 按要求跳过 | — | — |
| APP | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1751008/000175100826000059/app-20260630.htm) | 1 |
| WBTN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1997859/000199785926000089/wbtn-20260630.htm) | 0 |
| FIG | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1579878/000162828026053348/fig-20260630.htm) | 2 |
| CRDO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-02](https://www.sec.gov/Archives/edgar/data/1807794/000162828026060111/crdo-20260801.htm) | 1 |
| ALAB | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1736297/000173629726000035/alab-20260630.htm) | 1 |
| NBIS | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-04-30](https://www.sec.gov/Archives/edgar/data/1513845/000110465926052948/nbis-20251231x20f.htm) | 0 |
| COIN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1679788/000167978826000088/coin-20260630.htm) | 1 |
| RDDT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-31](https://www.sec.gov/Archives/edgar/data/1713445/000171344526000100/rddt-20260630.htm) | 2 |
| RKLB | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1819994/000181999426000062/rklb-20260630.htm) | 0 |
| CELH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1341766/000134176626000050/celh-20260630.htm) | 0 |
| AFRM | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-08-27](https://www.sec.gov/Archives/edgar/data/1820953/000162828026059279/afrm-20260630.htm) | 3 |
| UPST | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1647639/000164763926000063/upst-20260630.htm) | 1 |
| CVNA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1690820/000169082026000055/cvna-20260630.htm) | 1 |
| APLD | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1144879/000114487926000048/apld-20260531.htm) | 0 |
| RBLX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1315098/000162828026051082/rblx-20260630.htm) | 0 |
| CAVA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/1639438/000162828026055864/cava-20260712.htm) | 1 |
| ONON | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-03](https://www.sec.gov/Archives/edgar/data/1858985/000185898526000008/onholdingag-20251231.htm) | 8 |
| DUOL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1562088/000162828026053603/duol-20260630.htm) | 3 |
| ELF | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1600033/000160003326000040/elf-20260630.htm) | 1 |
| SOFI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1818874/000181887426000054/sofi-20260630.htm) | 1 |
| SHOP | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1594805/000159480526000047/shop-20260630.htm) | 2 |
| SE | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-04-17](https://www.sec.gov/Archives/edgar/data/1703399/000114036126015366/ef20067274_20f.htm) | 1 |
| NET | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1477333/000147733326000054/cloud-20260630.htm) | 1 |
| PLTR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1321655/000132165526000041/pltr-20260630.htm) | 1 |
| ARM | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-05-26](https://www.sec.gov/Archives/edgar/data/1973239/000197323926000097/arm-20260331.htm) | 1 |
| LITE | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-08-17](https://www.sec.gov/Archives/edgar/data/1633978/000162828026057358/lite-20260627.htm) | 0 |
| COHR | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-08-14](https://www.sec.gov/Archives/edgar/data/820318/000082031826000020/iivi-20260630.htm) | 1 |
| MRVL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-28](https://www.sec.gov/Archives/edgar/data/1835632/000183563226000025/mrvl-20260801.htm) | 0 |
| CLS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-27](https://www.sec.gov/Archives/edgar/data/1030894/000103089426000044/cls-20260630.htm) | 0 |
| VRT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1674101/000162828026050609/vrt-20260630.htm) | 0 |
| MU | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-06-25](https://www.sec.gov/Archives/edgar/data/723125/000072312526000015/mu-20260528.htm) | 0 |
| SNDK | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-08-17](https://www.sec.gov/Archives/edgar/data/2023554/000162828026057406/sndk-20260703.htm) | 0 |
| WDC | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-08-14](https://www.sec.gov/Archives/edgar/data/106040/000162828026057139/wdc-20260703.htm) | 0 |
| CIEN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-03](https://www.sec.gov/Archives/edgar/data/936395/000162828026060361/cien-20260801.htm) | 0 |
| SMCI | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-08-31](https://www.sec.gov/Archives/edgar/data/1375365/000137536526000022/smci-20260630.htm) | 0 |
| BE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-28](https://www.sec.gov/Archives/edgar/data/1664703/000162828026050247/be-20260630.htm) | 4 |
| PSTG | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-04](https://www.sec.gov/Archives/edgar/data/1474432/000147443226000088/pstg-20260802.htm) | 0 |
| MTSI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1493594/000149359426000038/mtsi-20260703.htm) | 0 |
| TOST | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1650164/000165016426000164/tost-20260630.htm) | 2 |
| NU | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-04-08](https://www.sec.gov/Archives/edgar/data/1691493/000129281426002166/nuform20f_2025.htm) | 9 |
| DAVE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1841408/000119312526335154/dave-20260630.htm) | 1 |
| ROOT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1788882/000178888226000061/root-20260630.htm) | 2 |
| LMND | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1691421/000169142126000055/lmnd-20260630.htm) | 1 |
| TTAN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-08](https://www.sec.gov/Archives/edgar/data/1638826/000163882626000094/ttan-20260731.htm) | 2 |
| IOT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-08](https://www.sec.gov/Archives/edgar/data/1642896/000162828026060909/iot-20260801.htm) | 2 |
| MNDY | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-13](https://www.sec.gov/Archives/edgar/data/1845338/000117891326000870/zk2634436.htm) | 1 |
| MDB | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-01](https://www.sec.gov/Archives/edgar/data/1441816/000162828026059830/mdb-20260731.htm) | 0 |
| GTLB | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-02](https://www.sec.gov/Archives/edgar/data/1653482/000162828026059943/gtlb-20260731.htm) | 2 |
| FROG | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1800667/000119312526340294/frog-20260630.htm) | 1 |
| ESTC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-28](https://www.sec.gov/Archives/edgar/data/1707753/000170775326000054/estc-20260731.htm) | 0 |
| S | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-28](https://www.sec.gov/Archives/edgar/data/1583708/000158370826000055/s-20260731.htm) | 2 |
| TTD | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1671933/000167193326000086/ttd-20260630.htm) | 1 |
| ZETA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1851003/000119312526333902/zeta-20260630.htm) | 1 |
| TMDX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1756262/000119312526332843/tmdx-20260630.htm) | 1 |
| NTRA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1604821/000162828026054525/ntra-20260630.htm) | 1 |
| TEM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1717115/000119312526326090/tem-20260630.htm) | 2 |
| RXST | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1111485/000119312526335153/rxst-20260630.htm) | 0 |
| KTOS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1069258/000106925826000077/ktos-20260628.htm) | 1 |
| AVAV | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-10](https://www.sec.gov/Archives/edgar/data/1368622/000110465926106423/avav-20260801x10q.htm) | 1 |
| RDW | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1819810/000181981026000124/rdw-20260630.htm) | 1 |
| LUNR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1844452/000162828026056821/lunr-20260630.htm) | 1 |
| LEU | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1065059/000162828026053863/leu-20260630.htm) | 1 |
| UUUU | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1385849/000138584926000029/efr-20260630.htm) | 1 |
| UEC | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-09-29](https://www.sec.gov/Archives/edgar/data/1334933/000143774926031414/uec20260731_10k.htm) | 0 |
| ALB | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/915913/000091591326000102/alb-20260630.htm) | 0 |
| ENPH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-28](https://www.sec.gov/Archives/edgar/data/1463101/000146310126000081/enph-20260630.htm) | 3 |
| NXT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-03](https://www.sec.gov/Archives/edgar/data/1852131/000185213126000048/nxt-20260703.htm) | 2 |
| FLNC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1868941/000186894126000029/flnc-20260630.htm) | 3 |
| RIVN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1874178/000187417826000054/rivn-20260630.htm) | 0 |
| CHWY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-09](https://www.sec.gov/Archives/edgar/data/1766502/000162828026061018/chwy-20260802.htm) | 2 |
| BROS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1866581/000186658126000133/bros-20260630.htm) | 2 |
| RH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-10](https://www.sec.gov/Archives/edgar/data/1528849/000110465926106764/rh-20260801x10q.htm) | 0 |
| SG | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1477815/000162828026054522/sg-20260628.htm) | 1 |
| FOUR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1794669/000179466926000045/four-20260630.htm) | 2 |
| BILL | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-08-20](https://www.sec.gov/Archives/edgar/data/1786352/000162828026058238/bill-20260630.htm) | 1 |
| RELY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1782170/000162828026053424/rely-20260630.htm) | 0 |
| SYM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1837240/000183724026000043/sym-20260627.htm) | 3 |
| AAOI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1158114/000143774926026278/aaoi20260630_10q.htm) | 0 |
| ACLS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1113232/000110465926091999/acls-20260630x10q.htm) | 0 |
| SITM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1451809/000145180926000060/sitm-20260630.htm) | 2 |
| AMBA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-04](https://www.sec.gov/Archives/edgar/data/1280263/000119312526383365/amba-20260731.htm) | 1 |
| AEHR | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-07-27](https://www.sec.gov/Archives/edgar/data/1040470/000165495426006919/aehr_10k.htm) | 1 |
| INOD | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/903651/000110465926092021/inod-20260630x10q.htm) | 1 |
| PATH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-08](https://www.sec.gov/Archives/edgar/data/1734722/000173472226000050/path-20260731.htm) | 2 |
| DOCN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1582961/000162828026052556/docn-20260630.htm) | 0 |
| ROKU | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1428439/000162828026054335/roku-20260630.htm) | 1 |
| EIKN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1861123/000119312526349185/eikn-20260630.htm) | 6 |
| FSLY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1517413/000151741326000213/fsly-20260630.htm) | 0 |
| HUT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1964789/000110465926090025/hut-20260630x10q.htm) | 1 |
| WULF | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1083301/000108330126000166/wulf-20260630.htm) | 0 |
| ASTS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1780312/000119312526342550/asts-20260630.htm) | 2 |
| IONQ | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1824920/000119312526341001/ionq-20260630.htm) | 1 |
| CRSP | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-03](https://www.sec.gov/Archives/edgar/data/1674416/000119312526330672/crsp-20260630.htm) | 1 |
| POWL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/80420/000008042026000107/powl-20260630.htm) | 1 |
| SECZ | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/2094496/000162828026056788/secz-20260630.htm) | 1 |
| BKKT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1820302/000162828026055275/bakkt-20260630.htm) | 2 |
| CRML | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-09-25](https://www.sec.gov/Archives/edgar/data/1951089/000121390026103607/ea0302128-20f_critical.htm) | 8 |
| CLSK | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/827876/000119312526338382/clsk-20260630.htm) | 1 |
| BTBT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1710350/000121390026088709/ea0300693-10q_bitdigital.htm) | 0 |
| SOC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1831481/000183148126000104/socc-20260630.htm) | 0 |
| AURA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/1501796/000119312526343429/aura-20260630.htm) | 2 |
| EVMN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/2044725/000119312526337984/evmn-20260630.htm) | 1 |
| WYFI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/2042022/000121390026088026/ea0300877-10q_whitefiber.htm) | 1 |
| XXI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/2070457/000121390026087471/ea0299640-10q_twentyone.htm) | 9 |
| DNA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1830214/000162828026054298/dna-20260630.htm) | 1 |
| GETY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1898496/000162828026055246/gety-20260630.htm) | 0 |
| QDEL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1906324/000190632426000033/qdel-20260628.htm) | 0 |
| TRON | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/1956744/000149315226037161/form10-q.htm) | 2 |
| VITL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1579733/000119312526336753/vitl-20260628.htm) | 0 |
| FWDI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/38264/000168316826006270/forward_i10q-063026.htm) | 1 |
| UPB | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/2022626/000119312526343417/upb-20260630.htm) | 1 |
| SRAD | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-27](https://www.sec.gov/Archives/edgar/data/1836470/000110465926035485/srad-20251231x20f.htm) | 9 |
| WRBY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1504776/000150477626000019/wrby-20260630.htm) | 2 |
| HTFL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1464521/000146452126000131/htfl-20260630x10q.htm) | 0 |
| AMC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-23](https://www.sec.gov/Archives/edgar/data/1411579/000141157926000059/amc-20260630x10q.htm) | 0 |
| SANA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1770121/000119312526342395/sana-20260630.htm) | 2 |
| CHYM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1795586/000179558626000048/chym-20260630.htm) | 2 |
| SPRY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1671858/000119312526349140/spry-20260630.htm) | 1 |
| PACB | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1299130/000129913026000122/pacb-20260630.htm) | 0 |
| ALKT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1529274/000152927426000052/alk-20260630.htm) | 0 |
| KLC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1873529/000119312526349480/klc-20260704.htm) | 0 |
| NTSK | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-02](https://www.sec.gov/Archives/edgar/data/2063196/000119312526380428/ntsk-20260731.htm) | 2 |
| MAX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1818383/000181838326000200/max-20260630.htm) | 1 |
| SHEN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/354963/000035496326000209/shen-20260630.htm) | 3 |
| EYPT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1314102/000119312526335037/eypt-20260630.htm) | 1 |
| PSFE | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-03](https://www.sec.gov/Archives/edgar/data/1833835/000119312526088095/psfe-20251231.htm) | 0 |
| USAR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1970622/000197062226000057/usar-20260630.htm) | 1 |
| BRCB | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/2068577/000162828026055868/brcb-20260630.htm) | 2 |
| MPT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1287865/000119312526342583/mpt-20260630.htm) | 4 |
| BEAM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1745999/000119312526331541/beam-20260630.htm) | 1 |
| HRL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-27](https://www.sec.gov/Archives/edgar/data/48465/000004846526000055/hrl-20260726.htm) | 1 |
| NMRA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-14](https://www.sec.gov/Archives/edgar/data/1885522/000119312526350370/nmra-20260630.htm) | 2 |
| RGEN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/730272/000119312526323773/rgen-20260630.htm) | 0 |
| INFQ | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-18](https://www.sec.gov/Archives/edgar/data/2007825/000162828026057508/infq-20260630.htm) | 3 |
| LYTS | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-09-03](https://www.sec.gov/Archives/edgar/data/763532/000143774926029621/lyts20260630d_10k.htm) | 0 |
| FAC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/2049662/000162828026055707/fac-20260630.htm) | 7 |
| INV | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/2001557/000200155726000154/innv-20260630.htm) | 0 |
| RBRK | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-01](https://www.sec.gov/Archives/edgar/data/1943896/000194389626000060/rbrk-20260731.htm) | 2 |
| WMG | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1319161/000131916126000032/wmg-20260630.htm) | 5 |
| OLN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-31](https://www.sec.gov/Archives/edgar/data/74303/000007430326000077/oln-20260630.htm) | 1 |
| CMG | 已建立条件模型 | [10-Q · 2026-07-31](https://www.sec.gov/Archives/edgar/data/1058090/000105809026000066/cmg-20260630.htm) | 1 |
| CXM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-03](https://www.sec.gov/Archives/edgar/data/1569345/000156934526000038/cxm-20260731.htm) | 2 |
| NKLR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-14](https://www.sec.gov/Archives/edgar/data/2067627/000121390026090062/ea0300681-10q_terra.htm) | 2 |
| SAIL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-10](https://www.sec.gov/Archives/edgar/data/2030781/000203078126000021/sail-20260731.htm) | 0 |
| ALMS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1847367/000184736726000018/alms-20260630x10q.htm) | 2 |
| ARDT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1756655/000162828026055215/ardt-20260630.htm) | 3 |
| SGMT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/1400118/000119312526343441/sgmt-20260630.htm) | 4 |
| FWRG | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1789940/000178994026000090/fwrg-20260628.htm) | 0 |
| SLDE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1886428/000119312526326333/slde-20260630.htm) | 0 |
| INDI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1841925/000119312526340396/indi-20260630.htm) | 1 |
| MYGN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-31](https://www.sec.gov/Archives/edgar/data/899923/000089992326000072/mygn-20260630.htm) | 1 |
| DOCU | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-04](https://www.sec.gov/Archives/edgar/data/1261333/000126133326000099/docu-20260731.htm) | 0 |
| CLFD | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/796505/000117184326005329/clfd20260630_10q.htm) | 2 |
| RUM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1830081/000121390026087311/ea0301267-10q_rumgroup.htm) | 2 |
| EGHT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1023731/000102373126000114/eght-20260630.htm) | 0 |
| GERN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/886744/000088674426000037/gern-20260630.htm) | 3 |
| EVEX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1823652/000155485526001685/evex-20260630.htm) | 1 |
| OKLO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1849056/000162828026054571/oklo-20260630.htm) | 2 |
| OXM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-04](https://www.sec.gov/Archives/edgar/data/75288/000007528826000084/oxm-20260801.htm) | 1 |
| MTH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-31](https://www.sec.gov/Archives/edgar/data/833079/000083307926000128/mth-20260630.htm) | 1 |
| SNAP | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1564408/000156440826000052/snap-20260630.htm) | 0 |
| WHR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/106640/000010664026000061/whr-20260630.htm) | 0 |
| ARRY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1820721/000162828026053517/arry-20260630.htm) | 0 |
| TE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/1992243/000199224326000022/t1-20260630.htm) | 1 |
| ARQQ | 预测／融资／稀释／行业方法待研究 | [20-F · 2025-12-09](https://www.sec.gov/Archives/edgar/data/1859690/000110465925119500/arqq-20250930x20f.htm) | 9 |
| PYPL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-28](https://www.sec.gov/Archives/edgar/data/1633917/000163391726000082/pypl-20260630.htm) | 3 |
| MNRO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/876427/000087642726000010/mnro-20260627x10q.htm) | 4 |
| XE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/2088896/000119312526347752/xe-20260630.htm) | 2 |
| ADTN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/926282/000119312526331632/adtn-20260630.htm) | 0 |
| ENOV | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1420800/000142080026000035/cfx-20260703.htm) | 0 |
| PLAY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-14](https://www.sec.gov/Archives/edgar/data/1525769/000152576926000038/play-20260804.htm) | 0 |
| FPS | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-09-15](https://www.sec.gov/Archives/edgar/data/2080126/000208012626000035/fps-20260630.htm) | 2 |
| ODD | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-17](https://www.sec.gov/Archives/edgar/data/1907085/000110465926029490/odd-20251231x20f.htm) | 4 |
| NTGR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1122904/000119312526338402/ntgr-20260628.htm) | 1 |
| ENVX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/1828318/000182831826000056/envx-20260705.htm) | 0 |
| LYFT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1759509/000162828026054499/lyft-20260630.htm) | 1 |
| SOUN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1840856/000184085626000022/soun-20260630.htm) | 1 |
| AVNT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1122976/000112297626000126/avnt-20260630.htm) | 2 |
| SLDP | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1844862/000110465926090634/sldp-20260630x10q.htm) | 1 |
| VIA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1603015/000160301526000026/via-20260630.htm) | 1 |
| CYH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-23](https://www.sec.gov/Archives/edgar/data/1108109/000119312526314196/cyh-20260630.htm) | 1 |
| OMDA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1611115/000162828026054840/omda-20260630.htm) | 0 |
| LCID | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1811210/000162828026052606/lcid-20260630.htm) | 0 |
| MWH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-14](https://www.sec.gov/Archives/edgar/data/2065636/000119312526352447/d152940d10q.htm) | 7 |
| HLLY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1822928/000182292826000068/hlly-20260628.htm) | 1 |
| NNE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/1923891/000149315226037345/form10-q.htm) | 2 |
| PLNT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1637207/000163720726000044/plnt-20260630.htm) | 3 |
| CRNC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1768267/000162828026054339/crnc-20260630.htm) | 1 |
| ALHC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1832466/000162828026051060/alhc-20260630.htm) | 0 |
| QS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-24](https://www.sec.gov/Archives/edgar/data/1811414/000119312526316073/qs-20260630.htm) | 3 |
| YSS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-14](https://www.sec.gov/Archives/edgar/data/2086587/000162828026056874/yss-20260630.htm) | 6 |
| NRDS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1625278/000162527826000060/nrds-20260630.htm) | 0 |
| FRMI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-14](https://www.sec.gov/Archives/edgar/data/2071778/000207177826000051/frmi-20260630.htm) | 2 |
| HUBG | 预测／融资／稀释／行业方法待研究 | [10-Q · 2025-11-05](https://www.sec.gov/Archives/edgar/data/940942/000119312525266623/hubg-20250930.htm) | 2 |
| UHS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/352915/000119312526340278/uhs-20260630.htm) | 1 |
| WLTH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-14](https://www.sec.gov/Archives/edgar/data/1524566/000162828026061848/wlth-20260731.htm) | 1 |
| ALMU | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-09-16](https://www.sec.gov/Archives/edgar/data/1828805/000121390026100584/ea0305364-10k_aeluma.htm) | 1 |
| ONT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1643615/000119312526337925/ont-20260630.htm) | 1 |
| NCLH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-03](https://www.sec.gov/Archives/edgar/data/1513761/000110465926089657/nclh-20260630x10q.htm) | 1 |
| RR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-19](https://www.sec.gov/Archives/edgar/data/1963685/000121390026091798/ea0302286-10q_richtech.htm) | 3 |
| KVYO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1835830/000183583026000040/kvyo-20260630.htm) | 2 |
| BKSY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1753539/000175353926000124/bksy-20260630.htm) | 1 |
| JACK | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/807882/000080788226000091/jack-20260705.htm) | 2 |
| ASPI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-14](https://www.sec.gov/Archives/edgar/data/1921865/000119312526352603/aspi-20260630.htm) | 0 |
| CLB | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1958086/000119312526326345/clb-20260630.htm) | 0 |
| FUBO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1484769/000162828026053535/fubo-20260630.htm) | 2 |
| CE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1306830/000130683026000117/ce-20260630.htm) | 1 |
| VOYG | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1788060/000162828026052292/voyg-20260630.htm) | 1 |
| ARHS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1875444/000187544426000030/arhs-20260630.htm) | 2 |
| ULCC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1670076/000167007626000087/fron-20260630.htm) | 3 |
| WOLF | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-08-20](https://www.sec.gov/Archives/edgar/data/895419/000089541926000054/wolf-20260628.htm) | 6 |
| ACDC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1881487/000119312526337969/acdc-20260630.htm) | 0 |
| RGNX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1590877/000119312526336725/rgnx-20260630.htm) | 0 |
| EQPT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1693736/000169373626000020/eqpt-20260630.htm) | 4 |
| VELO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/1825079/000119312526344560/velo-20260630.htm) | 0 |
| FLY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/1860160/000186016026000023/fly-20260630.htm) | 1 |
| BETA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/1784570/000162828026055982/bta-20260630.htm) | 2 |
| GENI | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-17](https://www.sec.gov/Archives/edgar/data/1834489/000119312526110749/geni-20251231.htm) | 2 |
| MRLN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-14](https://www.sec.gov/Archives/edgar/data/2028707/000162828026056882/mrln-20260630.htm) | 4 |
| EOSE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1805077/000162828026052906/eose-20260630.htm) | 0 |
| RCKT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1281895/000119312526342348/rckt-20260630.htm) | 0 |
| CABA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1759138/000175913826000039/caba-20260630.htm) | 2 |
| BETR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/1835856/000162828026055745/aurcu-20260630.htm) | 1 |
| RUN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1469367/000162828026053366/run-20260630.htm) | 3 |
| IE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1879016/000187901626000017/ie-20260630.htm) | 0 |
| FATE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1434316/000119312526347988/fate-20260630.htm) | 1 |
| WD | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1497770/000110465926091536/wd-20260630x10q.htm) | 1 |
| PCT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1830033/000183003326000026/pct-20260630.htm) | 0 |
| APTV | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1521332/000152133226000061/aptv-20260630.htm) | 0 |
| CATX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/728387/000119312526342512/catx-20260630.htm) | 2 |
| GLOB | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-02-27](https://www.sec.gov/Archives/edgar/data/1557860/000162828026012910/glob-20251231.htm) | 8 |
| LZM | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-19](https://www.sec.gov/Archives/edgar/data/1958217/000195821726000009/lzm-20251231.htm) | 7 |
| FIP | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1899883/000189988326000036/fip-20260630.htm) | 0 |
| NTLA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1652130/000119312526337952/ntla-20260630.htm) | 1 |
| KYTX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/1994702/000119312526344607/kytx-20260630.htm) | 1 |
| FLUT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1635327/000163532726000056/flut-20260630.htm) | 1 |
| GOGO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1537054/000119312526337921/gogo-20260630.htm) | 0 |
| RKT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1805284/000162828026054577/rkt-20260630.htm) | 3 |
| SVV | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1883313/000188331326000060/svv-20260704.htm) | 1 |
| AGIO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1439222/000143922226000118/agio-20260630.htm) | 1 |
| NPWR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1845437/000184543726000033/npwr-20260630.htm) | 3 |
| EDIT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1650664/000165066426000083/edit-20260630.htm) | 0 |
| MAGN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/41719/000004171926000049/form10q.htm) | 0 |
| ABAT | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-09-14](https://www.sec.gov/Archives/edgar/data/1576873/000149315226042497/form10-k.htm) | 1 |
| LAES | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-31](https://www.sec.gov/Archives/edgar/data/1951222/000110465926037706/laes-20251231x20f.htm) | 2 |
| PGY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1883085/000188308526000058/pgy-20260630.htm) | 2 |
| DFH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1825088/000162828026050969/dfh-20260630.htm) | 2 |
| EFX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-21](https://www.sec.gov/Archives/edgar/data/33185/000003318526000028/efx-20260630.htm) | 0 |
| ORGO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1661181/000119312526338049/orgo-20260630.htm) | 0 |
| GLXY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1859392/000185939226000091/glxy-20260630.htm) | 3 |
| IKT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/1750149/000119312526344707/ikt-20260630.htm) | 3 |
| NRGV | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/1828536/000182853626000101/nrgv-20260630.htm) | 0 |
| ZG | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1617640/000161764026000052/z-20260630.htm) | 2 |
| BBNX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1674632/000119312526323777/bbnx-20260630.htm) | 1 |
| DNLI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1714899/000171489926000097/dnli-20260630.htm) | 1 |
| HGV | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1674168/000167416826000100/hgv-20260630.htm) | 0 |
| HUBS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1404655/000119312526335232/hubs-20260630.htm) | 0 |
| ORBS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1892492/000149315226036637/form10-q.htm) | 0 |
| NB | 预测／融资／稀释／行业方法待研究 | [10-K · 2026-09-25](https://www.sec.gov/Archives/edgar/data/1512228/000119312526402806/nb-20260630.htm) | 2 |
| LZ | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1286139/000128613926000031/lz-20260630.htm) | 0 |
| CPRI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1530721/000153072126000081/cpri-20260627.htm) | 1 |
| SITE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1650729/000165072926000016/site-20260628.htm) | 3 |
| AI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-09](https://www.sec.gov/Archives/edgar/data/1577526/000157752626000126/ai-20260731.htm) | 3 |
| DXYZ | 预测／融资／稀释／行业方法待研究 | 待查非标准定期原文 | 3 |
| VERX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1806837/000110465926090420/verx-20260630x10q.htm) | 5 |
| SMMT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-23](https://www.sec.gov/Archives/edgar/data/1599298/000159929826000068/smmt-20260630.htm) | 1 |
| TASK | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1829864/000182986426000149/task-20260630.htm) | 1 |
| PACK | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1712463/000162828026050839/pack-20260630.htm) | 1 |
| FOXF | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1424929/000142492926000049/foxf-20260703.htm) | 1 |
| SIBN | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1459839/000145983926000069/sibn-20260630.htm) | 0 |
| VRRM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1682745/000119312526335490/vrrm-20260630.htm) | 0 |
| GTM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1794515/000179451526000056/zi-20260630.htm) | 0 |
| SENS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1616543/000110465926092056/sens-20260630x10q.htm) | 0 |
| BRZE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-09-09](https://www.sec.gov/Archives/edgar/data/1676238/000167623826000040/brze-20260731.htm) | 1 |
| WDAY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-27](https://www.sec.gov/Archives/edgar/data/1327811/000132781126000044/wday-20260731.htm) | 1 |
| NUAI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-14](https://www.sec.gov/Archives/edgar/data/2028336/000121390026090138/ea0301610-10q_newera.htm) | 0 |
| WLFC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1018164/000101816426000068/wlfc-20260630.htm) | 6 |
| OEC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1609804/000162828026053422/oec-20260630.htm) | 1 |
| HAYW | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1834622/000183462226000047/hayw-20260627.htm) | 4 |
| SWIM | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1833197/000162828026052925/swim-20260627.htm) | 1 |
| GEHC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1932393/000193239326000046/gehc-20260630.htm) | 4 |
| STAA | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-12](https://www.sec.gov/Archives/edgar/data/718937/000071893726000037/staa-20260703.htm) | 1 |
| EVER | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1640428/000119312526332775/ever-20260630.htm) | 2 |
| WEAV | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1609151/000160915126000074/weav-20260630.htm) | 0 |
| SRPT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/873303/000119312526335003/srpt-20260630.htm) | 0 |
| EYE | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/1710155/000162828026056493/eye-20260704.htm) | 1 |
| WWW | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-13](https://www.sec.gov/Archives/edgar/data/110471/000162828026056524/www-20260704.htm) | 3 |
| RXRX | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1601830/000160183026000098/rxrx-20260630.htm) | 0 |
| WAY | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1990354/000199035426000035/way-20260630.htm) | 1 |
| LIF | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-10](https://www.sec.gov/Archives/edgar/data/1581760/000158176026000141/lifx-20260630.htm) | 1 |
| COLL | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1267565/000162828026053851/coll-20260630.htm) | 0 |
| UMAC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1956955/000168316826006016/umac_i10q-063026.htm) | 1 |
| SONO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-29](https://www.sec.gov/Archives/edgar/data/1314727/000131472726000086/sono-20260627.htm) | 0 |
| GSHD | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-23](https://www.sec.gov/Archives/edgar/data/1726978/000172697826000060/gshd-20260630.htm) | 1 |
| CERT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-04](https://www.sec.gov/Archives/edgar/data/1827090/000182709026000028/cert-20260630.htm) | 0 |
| TDOC | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-30](https://www.sec.gov/Archives/edgar/data/1477449/000147744926000038/tdoc-20260630.htm) | 0 |
| COUR | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1651562/000165156226000063/cour-20260630.htm) | 1 |
| INSP | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-03](https://www.sec.gov/Archives/edgar/data/1609550/000160955026000047/insp-20260630.htm) | 0 |
| SERV | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1832483/000183248326000035/serv-20260630.htm) | 0 |
| TRIP | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1526520/000119312526336693/trip-20260630.htm) | 0 |
| CRCT | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1828962/000182896226000049/crct-20260630.htm) | 1 |
| MTCH | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/891103/000089110326000130/mtch-20260630.htm) | 0 |
| YELP | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-07](https://www.sec.gov/Archives/edgar/data/1345016/000134501626000066/yelp-20260630.htm) | 1 |
| ALVO | 预测／融资／稀释／行业方法待研究 | [20-F · 2026-03-31](https://www.sec.gov/Archives/edgar/data/1898416/000189841626000004/alvo-20251231.htm) | 8 |
| REI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1384195/000138419526000080/rei-20260630.htm) | 1 |
| KOS | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-03](https://www.sec.gov/Archives/edgar/data/1509991/000150999126000049/kos-20260630.htm) | 2 |
| NEO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-07-28](https://www.sec.gov/Archives/edgar/data/1077183/000107718326000059/neo-20260630.htm) | 0 |
| QMCO | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-11](https://www.sec.gov/Archives/edgar/data/709283/000162828026055417/qtm-20260630.htm) | 0 |
| AESI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-05](https://www.sec.gov/Archives/edgar/data/1984060/000119312526333424/aesi-20260630.htm) | 2 |
| PRME | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-06](https://www.sec.gov/Archives/edgar/data/1894562/000162828026053883/prme-20260630.htm) | 1 |
| PPLI | 预测／融资／稀释／行业方法待研究 | [10-Q · 2026-08-03](https://www.sec.gov/Archives/edgar/data/1800227/000162828026051881/ppli-20260630.htm) | 2 |
