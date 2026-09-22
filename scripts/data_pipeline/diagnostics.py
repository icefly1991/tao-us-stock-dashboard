"""Observe the existing Yahoo requests; never fetch extra data or repair prices."""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
import html
import json
import os
from pathlib import Path
from urllib.parse import unquote, urlsplit
from zoneinfo import ZoneInfo

from curl_cffi import requests
import yfinance as yf


LABELS = {
    "incomplete_daily": "Yahoo 日线价格字段缺失（原始响应已确认）",
    "rate_limited": "Yahoo 限流（HTTP 429）",
    "access_denied": "Yahoo 拒绝访问（HTTP 401/403）",
    "server_error": "Yahoo 服务端错误（HTTP 5xx）",
    "http_error": "Yahoo HTTP 请求失败",
    "timeout": "请求超时（无法确定源站或网络原因）",
    "network_error": "网络请求异常（未取得有效响应）",
    "invalid_response": "Yahoo 响应格式异常",
    "api_error": "Yahoo 接口明确返回错误",
    "empty_response": "Yahoo 未返回日线",
    "complete": "原始日线必需价格完整",
    "unknown": "上游原因未确认",
}


def inspect_chart(status: int, payload: dict) -> dict:
    if status != 200:
        category = ("rate_limited" if status == 429 else "access_denied" if status in (401, 403)
                    else "server_error" if status >= 500 else "http_error")
        return {"category": category, "http_status": status}
    chart = payload["chart"]
    if chart.get("error"):
        # Keep the error code only, never an arbitrary server body/URL/cookie.
        return {"category": "api_error", "http_status": status,
                "api_error_code": str(chart["error"].get("code", "unknown"))[:80]}
    if not chart.get("result") or not chart["result"][0].get("timestamp"):
        return {"category": "empty_response", "http_status": status}
    result = chart["result"][0]
    stamps = result["timestamp"]
    quotes = result["indicators"]["quote"][0]
    adj = result["indicators"].get("adjclose", [{}])[0].get("adjclose", [])
    tz = ZoneInfo(result["meta"]["exchangeTimezoneName"])

    def values(index):
        def at(array):
            return array[index] if len(array) > index else None
        return {**{key: at(quotes.get(key, [])) for key in ("open", "high", "low", "close", "volume")},
                "adjclose": at(adj)}

    def day(stamp):
        return datetime.fromtimestamp(stamp, tz).strftime("%Y-%m-%d")

    latest = values(len(stamps) - 1)
    required = ("close", "high", "low", "adjclose")
    missing = [key for key in required if latest[key] is None]
    complete = [i for i in range(len(stamps)) if all(values(i)[key] is not None for key in required)]
    market_time = result["meta"].get("regularMarketTime")
    return {"category": "incomplete_daily" if missing else "complete", "http_status": status,
            "session": day(stamps[-1]), "missing": missing, "latest_bar": latest,
            "last_usable": day(stamps[complete[-1]]) if complete else None,
            "market_quote_time": datetime.fromtimestamp(market_time, tz).isoformat() if market_time else None,
            "market_quote_price": result["meta"].get("regularMarketPrice"),
            "internal_cause": "未提供；仅凭缺值无法区分发布延迟或源站内部故障" if missing else None}


class DiagnosticSession(requests.Session):
    def __init__(self):
        super().__init__(impersonate="chrome")
        self.evidence: dict[str, dict] = {}

    def get(self, url, **kwargs):
        parsed = urlsplit(url)
        is_chart = parsed.hostname in ("query1.finance.yahoo.com", "query2.finance.yahoo.com") and parsed.path.startswith("/v8/finance/chart/")
        symbol = unquote(parsed.path.rsplit("/", 1)[-1])
        try:
            response = super().get(url, **kwargs)
        except Exception as error:
            if is_chart:
                self.evidence[symbol] = {"category": "timeout" if isinstance(error, requests.exceptions.Timeout) else "network_error",
                                         "exception_type": type(error).__name__}
            raise
        if is_chart and kwargs.get("params", {}).get("interval") == "1d":
            try:
                record = inspect_chart(response.status_code, response.json() if response.status_code == 200 else {})
            except Exception:
                # Observability must never change a successful download into failure.
                record = {"category": "invalid_response", "http_status": response.status_code}
            record.update(endpoint=f"{parsed.hostname}{parsed.path}",
                          observed_at=datetime.now(timezone.utc).isoformat(timespec="seconds"))
            self.evidence[symbol] = record
        return response


def write_diagnostics(config, result, evidence: dict) -> None:
    failures = {error["code"] for error in result.errors}
    rows = [{"code": item.code, "symbol": item.symbol,
             "pipeline_failed": item.code in failures,
             **evidence.get(item.symbol, {"category": "unknown"})}
            for item in config.watchlist if item.trading_status == "active"]
    counts = Counter(row["category"] for row in rows if row["pipeline_failed"])
    report = {"generated_at": config.updated_at, "yfinance_version": yf.__version__,
              "request_start": config.start_date, "request_end_exclusive": config.end_date,
              "successful": result.successful_stocks, "failed": result.failed_stocks,
              "failure_categories": dict(counts), "symbols": rows,
              "note": "原始响应诊断不代表 Yahoo 内部故障公告；报价元数据不得替代日线或复权价。"}
    destination = config.root_dir / ".cache" / "pipeline-diagnostics"
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["## 行情生成诊断", "", f"有效标的 {result.successful_stocks}；失败 {result.failed_stocks}。", ""]
    if result.incomplete_latest_errors:
        lines += ["**部署已阻止：最新日线必需价格缺失，保留旧线上数据。**", ""]
    for category, count in sorted(counts.items()):
        explanation = LABELS[category]
        if category == "complete":
            explanation += "；失败需检查本地处理，不能归咎于上游缺价"
        lines.append(f"- {explanation}：{count} 只")
    lines += ["", "源站未说明内部原因时标为未知，不推断停牌、休市或具体供应商故障。",
              "缺价/5xx：稍后重跑；429：等待限流解除；401/403：检查 Yahoo 访问及 yfinance 兼容性；网络错误：检查连接。",
              "行情完整不代表后续 lint、构建或 Pages 部署成功；后续失败请看对应步骤。", "",
              "|代码|原因|HTTP|日线日期|缺失字段|最后完整日期|", "|---|---|---|---|---|---|"]
    def cell(value):
        return html.escape(str(value if value is not None else "—")).replace("|", "&#124;").replace("\n", " ").replace("\r", " ")
    for row in rows:
        if row["pipeline_failed"]:
            lines.append("|" + "|".join(cell(value) for value in [row["code"], LABELS[row["category"]], row.get("http_status"), row.get("session"), ", ".join(row.get("missing", [])), row.get("last_usable")]) + "|")
    summary = "\n".join(lines) + "\n"
    (destination / "summary.md").write_text(summary, encoding="utf-8")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a", encoding="utf-8") as file:
            file.write(summary)
    for category, count in sorted(counts.items()):
        print(f"Upstream diagnosis: {category}: {LABELS[category]} ({count})")
