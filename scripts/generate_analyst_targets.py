"""Refresh the manually maintained analyst target snapshot from Yahoo via yfinance."""
from __future__ import annotations

import argparse
import csv
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from math import isfinite
from pathlib import Path
from zoneinfo import ZoneInfo
from urllib.parse import unquote, urlsplit

import yfinance as yf
from curl_cffi import requests

from data_pipeline.exporter import export_dashboard


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scripts" / "stock_list.csv"
DESTINATION = ROOT / "public" / "data" / "analyst-targets.json"


def inspect_target_response(status: int, payload: object) -> str:
    summary = payload.get("quoteSummary") if isinstance(payload, dict) else None
    if not isinstance(summary, dict):
        return "error: malformed quoteSummary response"
    error = summary.get("error")
    if status == 404 and isinstance(error, dict) and error.get("code") == "Not Found" and str(error.get("description", "")).startswith("No fundamentals data found for symbol:"):
        return "unavailable"
    if status != 200:
        return f"error: HTTP {status}"
    result = summary.get("result")
    if error or not isinstance(result, list) or not result or not isinstance(result[0], dict) or not isinstance(result[0].get("financialData"), dict):
        return "error: missing financialData or API error"
    return "complete"


class TargetSession(requests.Session):
    """Observe existing calls because yfinance can swallow quoteSummary HTTP errors."""
    def __init__(self):
        super().__init__(impersonate="chrome")
        self.evidence: dict[str, str] = {}

    def get(self, url, **kwargs):
        parsed = urlsplit(url)
        tracked = parsed.hostname in {"query1.finance.yahoo.com", "query2.finance.yahoo.com"} and parsed.path.startswith("/v10/finance/quoteSummary/")
        symbol = unquote(parsed.path.rsplit("/", 1)[-1]).upper()
        try:
            response = super().get(url, **kwargs)
        except Exception:
            if tracked:
                self.evidence[symbol] = "error: network request failed"
            raise
        if tracked:
            try:
                state = inspect_target_response(response.status_code, response.json())
            except Exception:
                state = "error: invalid JSON response"
            self.evidence[symbol] = state
        return response


def target_number(value: object) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value) or value <= 0:
        return None
    return round(float(value), 4)


def fetch_target(item: dict[str, str], session: TargetSession | None = None) -> dict[str, object]:
    code, symbol = item["code"], item["symbol"]
    session = session or TargetSession()
    result = yf.Ticker(symbol, session=session).get_analyst_price_targets()
    state = session.evidence.get(symbol.upper())
    if state not in {"complete", "unavailable"}:
        raise ValueError(f"{code}: {state or 'target response not verified'}")
    if not isinstance(result, dict):
        raise ValueError(f"{code}: analyst target response is not an object")
    values = {key: target_number(result.get(key)) for key in ("low", "mean", "high")}
    if all(value is None for value in values.values()):
        return {"code": code, "symbol": symbol, "status": "unavailable", **values}
    low, mean, high = values["low"], values["mean"], values["high"]
    if low is not None and high is not None and low > high:
        raise ValueError(f"{code}: analyst low exceeds high")
    if mean is not None and ((low is not None and mean < low) or (high is not None and mean > high)):
        raise ValueError(f"{code}: analyst mean outside low/high range")
    return {"code": code, "symbol": symbol, "status": "available", **values}


def generate(source: Path, destination: Path, workers: int = 4) -> tuple[int, int]:
    with source.open(encoding="utf-8-sig", newline="") as handle:
        items = list(csv.DictReader(handle))
    if len({item["code"] for item in items}) != len(items):
        raise ValueError("Duplicate stock code")
    yf.set_tz_cache_location(str(ROOT / ".cache" / "yfinance-targets"))
    results: dict[str, dict[str, object]] = {}
    failures: list[str] = []
    session = TargetSession()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(fetch_target, item, session): item for item in items}
        for future in as_completed(futures):
            item = futures[future]
            try:
                results[item["code"]] = future.result()
            except Exception as exc:  # noqa: BLE001
                failures.append(f'{item["code"]}: {exc}')
    if failures:
        raise RuntimeError(f"Analyst target refresh failed for {len(failures)} symbols; old snapshot kept:\n" + "\n".join(sorted(failures)))
    rows = [results[item["code"]] for item in items]
    payload = {
        "schema_version": 1,
        "source": "yfinance / Yahoo Finance analyst price targets",
        "fetched_at": datetime.now(ZoneInfo("America/New_York")).isoformat(timespec="minutes"),
        "rows": rows,
    }
    export_dashboard(destination, payload)
    available = sum(row["status"] == "available" for row in rows)
    return available, len(rows) - available


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE)
    parser.add_argument("--output", type=Path, default=DESTINATION)
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    available, unavailable = generate(args.source, args.output, args.workers)
    print(f"Analyst targets: available={available}, unavailable={unavailable}, total={available + unavailable}")
