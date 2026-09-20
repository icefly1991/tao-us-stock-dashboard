"""Build an independent, version-matched range-screening artifact from real histories."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from data_pipeline.indicators import build_box_metrics
from data_pipeline.exporter import export_dashboard


def generate_boxes(data_dir: Path) -> dict:
    dashboard = json.loads((data_dir / "dashboard.json").read_text(encoding="utf-8"))
    codes = set(next(item["codes"] for item in dashboard["collections"] if item["id"] == "research"))
    rows, errors = [], []
    for stock in dashboard["adjustments"]["adjusted"]["rows"]:
        if stock["code"] not in codes:
            continue
        try:
            history = json.loads((data_dir / "history" / "adjusted" / f'{stock["code"]}.json').read_text(encoding="utf-8"))
            if history["updated_at"] != dashboard["updated_at"] or history["code"] != stock["code"] or history["adjustment"] != "adjusted":
                raise ValueError("历史文件版本/代码/口径不匹配")
            if not history["daily"] or history["actual_end"].replace("-", "") != dashboard["data_date"]:
                raise ValueError("历史行情日期未对齐最新市场日")
            start = history["daily"][-252:][0]["time"]
            if any(date >= start for date in history.get("skipped_dates", [])):
                raise ValueError("扫描区间存在缺失日线，不能准确统计交易日耗时")
            result = build_box_metrics(history["daily"])
            rsi_by_date = {point["time"]: point["value"]
                           for point in history.get("rsi_history", {}).get("points", [])}
            result["bars"] = [{**bar, "rsi_value": rsi_by_date.get(bar["time"])} for bar in result["bars"]]
            rows.append({"code": stock["code"], "name": stock["name"], "fundamentals": "待专项复核",
                         "rsi": stock.get("rsi"), "business": stock.get("business", ""), **result})
        except (OSError, KeyError, ValueError) as error:
            errors.append({"code": stock["code"], "error": str(error)})
    processed = {row["code"] for row in rows} | {row["code"] for row in errors}
    errors.extend({"code": code, "error": "本批缺少可用行情"} for code in sorted(codes - processed))
    payload = {"schema_version": 4, "updated_at": dashboard["updated_at"], "data_date": dashboard["data_date"],
               "adjustment": "adjusted", "source": "yfinance", "universe": "活跃股观察列表 · 固定扫描池",
               "universe_count": len(codes), "market_scan_enabled": False, "rows": rows, "errors": errors}
    if not rows:
        raise RuntimeError("箱体扫描无有效结果；保留已有文件")
    export_dashboard(data_dir / "boxes.json", payload)
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path, default=Path("public/data"))
    result = generate_boxes(parser.parse_args().data_dir)
    print(f'Box scan: {len(result["rows"])} processed / {len(result["errors"])} errors; '
          f'{sum(row["status"] == "match" for row in result["rows"])} shape matches; data_date={result["data_date"]}')
