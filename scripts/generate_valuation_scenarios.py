"""Build the monthly valuation snapshot from reviewed assumptions; never invent prices."""
from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path

from data_pipeline.config import ROOT_DIR, STOCK_LIST_FILE, get_new_york_now, load_watchlist
from data_pipeline.exporter import export_dashboard
from data_pipeline.indicators import calculate_scenario_value


SCENARIOS = ("optimistic", "conservative", "stress")


def checked_date(value: object, latest: date) -> str:
    if not isinstance(value, str):
        raise ValueError("Valuation dates must be YYYY-MM-DD strings")
    parsed = date.fromisoformat(value)
    if parsed.isoformat() != value or parsed > latest:
        raise ValueError("Valuation date is malformed or in the future")
    return value


def build_snapshot(assumptions: dict, watchlist, today: date | None = None) -> dict:
    today = today or get_new_york_now().date()
    if assumptions.get("schema_version") != 1 or assumptions.get("basis") != "present_value" or not isinstance(assumptions.get("rows"), list):
        raise ValueError("Invalid valuation assumptions version or basis")
    members = {item.code: item for item in watchlist}
    reviewed = {}
    for entry in assumptions["rows"]:
        if not isinstance(entry, dict):
            raise ValueError("Valuation assumption row must be an object")
        code = entry.get("code")
        if code not in members or code in reviewed:
            raise ValueError(f"Unknown or duplicate valuation code: {code}")
        item = members[code]
        if item.asset_type != "stock" or entry.get("symbol") != item.symbol or entry.get("currency") != "USD":
            raise ValueError(f"Valuation identity/currency mismatch: {code}")
        valued_at = checked_date(entry.get("valued_at"), today)
        evidence_date = checked_date(entry.get("evidence_date"), date.fromisoformat(valued_at))
        if not isinstance(entry.get("reason"), str) or not entry["reason"].strip():
            raise ValueError(f"Missing valuation rationale: {code}")
        cases = entry.get("scenarios")
        if not isinstance(cases, dict) or set(cases) != set(SCENARIOS):
            raise ValueError(f"Exactly three researched scenarios required: {code}")
        output_cases = {}
        for key in SCENARIOS:
            case = cases[key]
            if not isinstance(case, dict):
                raise ValueError(f"Scenario must be an object: {code}/{key}")
            narrative = case.get("assumptions")
            required = {"business", "valuation", "financing", "dilution"} | ({"failure_case"} if key == "stress" else set())
            if not isinstance(narrative, dict) or not required.issubset(narrative) or not all(isinstance(text, str) and text.strip() for text in narrative.values()):
                raise ValueError(f"Missing business/valuation/financing/dilution assumptions: {code}/{key}")
            sources = case.get("sources")
            if not isinstance(sources, list) or not sources or not all(
                isinstance(source, dict) and isinstance(source.get("title"), str) and source["title"].strip()
                and isinstance(source.get("url"), str) and source["url"].startswith("https://") for source in sources
            ):
                raise ValueError(f"Missing valuation evidence: {code}/{key}")
            value = calculate_scenario_value(case.get("model"), case.get("inputs", {}))
            output_cases[key] = {"value": value, "model": case["model"], "inputs": case["inputs"], "assumptions": narrative, "sources": sources}
        if not output_cases["optimistic"]["value"] >= output_cases["conservative"]["value"] >= output_cases["stress"]["value"]:
            raise ValueError(f"Scenario values do not follow optimistic >= conservative >= stress: {code}")
        # DCF annual forecasts must use a common duration within this ticker.
        durations = {len(case["inputs"]["fcff"]) for case in output_cases.values() if case["model"] == "enterprise_dcf"}
        if len(durations) > 1:
            raise ValueError(f"Inconsistent DCF forecast duration: {code}")
        reviewed[code] = {"code": code, "symbol": item.symbol, "status": "available", "currency": "USD", "valued_at": valued_at,
                          "evidence_date": evidence_date, "reason": entry["reason"], "scenarios": output_cases}
    rows = []
    for item in watchlist:
        rows.append(reviewed.get(item.code) or {
            "code": item.code, "symbol": item.symbol, "status": "pending" if item.asset_type == "stock" else "not_applicable",
            "currency": "USD", "valued_at": None, "evidence_date": None, "scenarios": None,
            "reason": "尚未完成逐只原文核查、经营预测与融资稀释假设" if item.asset_type == "stock" else "首期公司估值模型不适用；该资产需另建专门方法",
        })
    coverage = {state: sum(row["status"] == state for row in rows) for state in ("available", "pending", "not_applicable")}
    return {"schema_version": 1, "basis": "present_value", "generated_at": get_new_york_now().isoformat(timespec="minutes"), "coverage": coverage, "rows": rows}


def generate(source: Path, output: Path, stock_list: Path = STOCK_LIST_FILE) -> dict:
    payload = build_snapshot(json.loads(source.read_text(encoding="utf-8")), load_watchlist(stock_list))
    export_dashboard(output, payload)
    return payload["coverage"]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT_DIR / "scripts" / "valuation_assumptions.json")
    parser.add_argument("--output", type=Path, default=ROOT_DIR / "public" / "data" / "valuation-scenarios.json")
    args = parser.parse_args()
    print("Valuation coverage:", generate(args.source, args.output))
