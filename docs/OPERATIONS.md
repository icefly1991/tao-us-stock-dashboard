# Operations Guide

## 首次部署

1. 将代码推送到名为 `tao-us-stock-dashboard` 的 GitHub 仓库。
2. 进入 `Settings -> Pages`，把 Source 设为 `GitHub Actions`。
3. 进入 `Actions -> Deploy Dashboard`，手动运行一次。
4. 确认 Generate、Python tests、Build frontend、Deploy 四个阶段均成功。

项目不使用行情密钥，不需要配置 GitHub Secrets。

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
