"""Index SEC valuation evidence. Financial facts are not cash-flow forecasts."""
from __future__ import annotations

import argparse
import json
import math
from datetime import date
from pathlib import Path

from data_pipeline.config import ROOT_DIR, STOCK_LIST_FILE, load_watchlist
from data_pipeline.exporter import export_dashboard


TAGS = {
    "revenue": ("RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "Revenues", "SalesRevenueNet"),
    "operating_cash_flow": ("NetCashProvidedByUsedInOperatingActivities",),
    "capital_expenditure": ("PaymentsToAcquirePropertyPlantAndEquipment", "PaymentsToAcquireProductiveAssets"),
    "stock_compensation": ("ShareBasedCompensation", "AllocatedShareBasedCompensationExpense"),
    "interest_expense": ("InterestExpenseNonoperating", "InterestExpense", "InterestAndDebtExpense"),
    "cash": ("CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsAndShortTermInvestments"),
    "common_shares": ("CommonStockSharesOutstanding", "EntityCommonStockSharesOutstanding"),
    "diluted_shares": ("WeightedAverageNumberOfDilutedSharesOutstanding",),
}
FORMS = {"10-K", "10-Q", "20-F", "40-F", "6-K"}


def fact_candidates(company: dict, tags: tuple[str, ...], unit: str, as_of: str) -> list[dict]:
    """Search every alias; an obsolete first alias must not hide newer facts."""
    cutoff = date.fromisoformat(as_of)
    result = []
    for namespace in ("us-gaap", "dei", "ifrs-full"):
        for tag in tags:
            for point in company.get("facts", {}).get(namespace, {}).get(tag, {}).get("units", {}).get(unit, []):
                number = point.get("val")
                if isinstance(number, bool) or not isinstance(number, (int, float)) or not math.isfinite(number) or point.get("form") not in FORMS:
                    continue
                try:
                    period = date.fromisoformat(point["end"])
                    filed = date.fromisoformat(point["filed"])
                    if point.get("start"):
                        start = date.fromisoformat(point["start"])
                        if start > period:
                            continue
                except (KeyError, TypeError, ValueError):
                    continue
                if period <= cutoff and filed <= cutoff and isinstance(point.get("accn"), str):
                    result.append({**point, "namespace": namespace, "tag": tag, "unit": unit})
    return result


def select_fact(company: dict, field: str, as_of: str, annual_end: str | None = None) -> dict | None:
    unit = "shares" if field.endswith("shares") else "USD"
    candidates = fact_candidates(company, TAGS[field], unit, as_of)
    if field in ("cash", "common_shares"):
        candidates = [p for p in candidates if not p.get("start")]
    else:
        candidates = [p for p in candidates if p.get("start")]
        if annual_end is not None:
            candidates = [p for p in candidates if p["end"] == annual_end and 330 <= (date.fromisoformat(p["end"]) - date.fromisoformat(p["start"])).days <= 380]
    if not candidates:
        return None
    # Prefer the latest period, then a subsequent correction, then the shortest
    # duration for that period. Never silently annualize a quarter or YTD flow.
    point = max(candidates, key=lambda p: (p["end"], p["filed"], p.get("start", "")))
    return {key: point[key] for key in ("val", "unit", "tag", "namespace", "end", "filed", "accn", "form")} | ({"start": point["start"]} if point.get("start") else {})


def filings(submissions: dict, as_of: str) -> list[dict]:
    recent = submissions["filings"]["recent"]
    result = []
    for i, form in enumerate(recent["form"]):
        if form not in FORMS | {"8-K"} or recent["filingDate"][i] > as_of:
            continue
        result.append({"form": form, "filed": recent["filingDate"][i], "period_end": recent["reportDate"][i],
                       "url": f'https://www.sec.gov/Archives/edgar/data/{int(submissions["cik"])}/{recent["accessionNumber"][i].replace("-", "")}/{recent["primaryDocument"][i]}'})
    return sorted(result, key=lambda f: (f["filed"], f["form"]), reverse=True)


def build_evidence(cache: Path, as_of: str, assumptions: dict, stock_list: Path = STOCK_LIST_FILE) -> dict:
    if date.fromisoformat(as_of).isoformat() != as_of:
        raise ValueError("Evidence cutoff must use YYYY-MM-DD")
    intake = {r["code"]: r for r in json.loads((cache / "index.json").read_text(encoding="utf-8"))["rows"]}
    completed = {row["code"] for row in assumptions["rows"]}
    rows = []
    for member in load_watchlist(stock_list):
        row = {"code": member.code, "symbol": member.symbol, "asset_type": member.asset_type, "as_of": as_of}
        if member.asset_type != "stock":
            rows.append(row | {"status": "excluded", "reason": "用户要求非公司资产建议价整组留空"})
            continue
        try:
            submissions = json.loads((cache / f"{member.code}-submissions.json").read_text(encoding="utf-8"))
            company = json.loads((cache / f"{member.code}-facts.json").read_text(encoding="utf-8"))
            identity = intake[member.code]
            if identity.get("symbol") != member.symbol or int(company["cik"]) != int(submissions["cik"]) or int(company["cik"]) != int(identity["cik"]):
                raise ValueError("SEC submissions/companyfacts CIK mismatch")
            reports = filings(submissions, as_of)
            annual = next((f for f in reports if f["form"] in {"10-K", "20-F", "40-F"}), None)
            latest = next((f for f in reports if f["form"] in {"10-K", "10-Q", "20-F", "40-F"}), None)
            facts = {field: select_fact(company, field, as_of) for field in TAGS}
            annual_facts = {field: select_fact(company, field, as_of, annual["period_end"]) for field in TAGS if field not in {"cash", "common_shares"}} if annual else {}
            issues = [f"{field}: 最新年报标准标签缺失，须查原文/自定义标签" for field, value in annual_facts.items() if value is None]
            for field in ("cash", "common_shares", "diluted_shares"):
                point = facts[field]
                if point is None or latest and point["end"] < latest["period_end"]:
                    issues.append(f"{field}: 缺最新报告期数据，旧字段不能冒充当前数值")
            common, diluted = facts["common_shares"], facts["diluted_shares"]
            if common and diluted and common["val"] > 0 and not .5 <= diluted["val"] / common["val"] <= 2:
                issues.append("股数数量级或股份类别不一致：不得自动乘百万修补SEC单位")
            rows.append(row | {"status": "evidence_collected", "model_status": "available" if member.code in completed else "pending",
                               "cik": int(company["cik"]), "latest_periodic_report": latest, "latest_annual_report": annual,
                               "subsequent_filings": reports[:5], "latest_reported_facts": facts, "latest_annual_facts": annual_facts,
                               "issues": issues, "reason": "原文和模型已逐只建立" if member.code in completed else "资料收集完成；经营预测、优先权益、融资稀释及行业模型仍待逐只核实。不得从本清单自动生成三价。"})
        except (OSError, ValueError, KeyError, TypeError) as error:
            rows.append(row | {"status": "failed", "reason": f"{type(error).__name__}: {error}"})
    return {"schema_version": 1, "as_of": as_of, "purpose": "evidence_intake_only", "coverage": {status: sum(r["status"] == status for r in rows) for status in ("evidence_collected", "excluded", "failed")}, "rows": rows}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--as-of", required=True)
    parser.add_argument("--output", type=Path, default=ROOT_DIR / "scripts" / "valuation_evidence.json")
    args = parser.parse_args()
    assumptions = json.loads((ROOT_DIR / "scripts" / "valuation_assumptions.json").read_text(encoding="utf-8"))
    payload = build_evidence(args.cache, args.as_of, assumptions)
    if payload["coverage"]["failed"]:
        raise SystemExit(f'Evidence incomplete; old output retained: {payload["coverage"]}')
    export_dashboard(args.output, payload)
    print("Evidence intake:", payload["coverage"])
