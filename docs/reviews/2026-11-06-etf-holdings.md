# 持仓与活跃公司ETF重新核查

CR-049 / DATA-038 / UI-045，2026-11-06。用户要求显示的行业ETF必须确实持有该股，覆盖上一版只按行业映射11个基金的做法。已重新处理全部129家公司，6个非公司资产仍不适用。

120家公司找到发行商官方实际直接股权持仓，选用45只行业/主题ETF；本轮共核对61只基金的新鲜官方完整持仓。持仓截至2026-11-04至11-06，核查日11-06。129个旧映射中23个有实际证据后保留、97个改为已验证基金、9个清空。CSV其它字段及成员与本轮之前逐行相同，人工研究文件和名单日期未修改。

| 公司 | 本轮所选ETF | 主题 | 官方证据 |
|---|---|---|---|
| SMR | URA | 铀与核能 | [Global X完整持仓](https://www.globalxetfs.com/funds/ura) |
| META | XLC | 通信服务 | [State Street持仓文件](https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-xlc.xlsx) |
| RGTI、IONQ | QTUM | 量子计算与人工智能 | [Defiance完整持仓](https://www.defianceetfs.com/qtum-full-holdings/) |
| CRWV、FIG | SKYY | 云计算 | [First Trust完整持仓](https://www.ftportfolios.com/Retail/Etf/EtfHoldings.aspx?Ticker=SKYY) |
| EIKN、ACLS | TINY | 纳米技术 | [ProShares实际持仓](https://www.proshares.com/our-etfs/strategic/tiny) |

9家公司暂未找到可用的行业/主题基金实际持仓证据：**RZLV、ATCH、MNTN、STUB、WBTN、RXST、RH、RELY、AEHR**。这些公司不再显示原行业代理代码；这不是断言全市场不存在ETF持有它们。检索出现的宽基、杠杆敞口、旧披露或非官方数据均没有被用来凑数。XWEB官方文件日期2024-01-08、EDOC持仓日期不明、VPN地址404、WCLD官方页面403等均排除；未把这些请求称为成功。

业务匹配与实际持仓都要满足。KOMP是多行业创新主题，不能称为单一行业ETF；实际纳入不代表唯一归属。PSTG以CSV的查询代码P匹配Everpure，UAA以A类股份记录匹配，不用其它股类替代。官方原始行、股数、权重、CUSIP/SEDOL或明确的代码/交易所标识与原文哈希见[逐只证据存档](2026-11-06-etf-holdings-evidence.json)。完整维护规则见[ETF_HOLDINGS](../ETF_HOLDINGS.md)。

实现文件：`scripts/stock_list.csv`、`public/data/sector-etf-review.json`、`scripts/data_pipeline/sector_etf.py`及config/yfinance_client/summary、`scripts/generate_boxes.py`、`scripts/validate_sector_etfs.py`；`src/sectorEtfData.ts`、`SectorEtf.tsx`、`App.tsx`、`BoxScreener.tsx`、`dashboardData.ts`、`dataValidation.ts`、`index.css`；Python与浏览器回归及需求/CR/ADR/架构/月度维护文档。

JSON兼容影响：dashboard行、停牌摘要和boxes v4行新增可选`sector_etf_holding`，包括官方来源、公司身份、正持仓数量/权重及独立截至/核查日期；boxes新增可选`symbol`供别名验证。`sector_etf`允许目录内已验证行业/主题基金。旧快照可读，但只有旧代理代码不能显示为已核实。后端拒绝名单与证据错配；前端同样拒绝错股/错基金、非官方主机、衍生品、零持仓及不合格日期。超过30天提示待复核，日常行情不续核查日。

本地180项Python、4项Node、107项浏览器、lint/build通过。真实下载、线上布局及发布状态见OPERATIONS后续记录。ETF持仓会变化，本轮仅证明官方该日快照，不保证实时或未来持续持有；未核实9家公司保持明确缺口，不降低证据标准。
