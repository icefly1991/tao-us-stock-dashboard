# 页面定位与行业ETF（CR-048 / UI-044 / DATA-037）

右下角增加半透明窄胶囊回顶／回底按钮，采用细线箭头、轻边框及柔和阴影。三张可见页面共用，短页面不显示；到达相应边界禁用按钮，支持键盘、手机安全区及减少动态效果偏好，弹窗层级高于按钮。

持仓与活跃列表的业务格增加第二行行业ETF代码，箱体只在单股业务详情展示。129家公司已逐只获取Yahoo公开sector/industry并映射到11个Select Sector SPDR行业参考基金，META为XLC；6个非公司资产不适用，未核实的旧快照显示待核实。具体来源与核实日期见[逐只记录](2026-11-06-sector-etfs.json)，行业基金范围参考[State Street官方目录](https://www.ssga.com/us/en/individual/capabilities/equities/sector-investing/select-sector-etfs)。

该标记是公开行业分类的参考ETF，不证明该股票属于ETF实际成分，也不是独立GICS认证。转型公司的公开分类可能滞后，例如NBIS按Yahoo通信服务、IREN按金融分类；不同供应商可能采用不同口径。本轮不扩展隐藏池研究，不修改名单、研究日期或金融公式。

CSV是逐公司映射唯一来源。dashboard两口径行、停牌摘要及boxes v4行兼容增加可选`sector_etf`，旧快照仍可读取；前后端校验11个合法代码或空值，非公司资产不赋值。

变更文件：`src/ScrollEdges.tsx`、`src/SectorEtf.tsx`、`src/main.tsx`、`src/App.tsx`、`src/BoxScreener.tsx`、`src/index.css`、`src/dashboardData.ts`、`src/dataValidation.ts`；`scripts/stock_list.csv`、数据层config/summary/yfinance_client及generate_boxes；新增Python与浏览器回归，更新需求、CR、ADR、架构、变更记录及AGENTS。

本地验证：176项Python、4项Node、105项浏览器回归及lint/build通过。使用上一轮已验证真实行情补充本轮元数据预览，在320/390/768/1024/1440/1920宽度三页共18组验证定位、人数及无横向溢出，页面错误0；检查桌面和手机截图。该预览不视为本轮重新下载行情，真实生成及发布证据以OPERATIONS后续记录为准。

已发布：功能提交8e35124，[Actions 42271565580](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/42271565580)全部成功，云端同样176 Python/4 Node/105浏览器及lint/build通过。线上revision精确匹配，最新数据日20261105、纽约生成时间2026-11-06 13:35；129家公司两口径ETF与CSV一致、META=XLC，人工研究文件与名单日期精确保持。本轮行情350成功/1失败（隐藏池WEAV缺目标日行情，最后可用10/23），700历史文件/0图表错误，活跃箱体101/0、隐藏池233/1；不能称全CSV零失败。

线上三页在320/390/768/1024/1440/1920宽度18组定位与布局核验全部通过，页面错误0；桌面及手机截图已检查。
