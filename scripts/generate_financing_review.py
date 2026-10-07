"""Export manually evidenced financing research; never infer risk from missing data."""
from __future__ import annotations

import argparse
import copy
import json
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

from data_pipeline.config import ROOT_DIR, STOCK_LIST_FILE, get_new_york_now, load_watchlist
from data_pipeline.exporter import export_dashboard
from data_pipeline.indicators import calculate_financing_share_growth

LEVELS = {"severe", "high", "watch", "clear", "unknown", "not_applicable"}
AXES = ("actual", "potential", "funding")


def checked_date(value):
    if not isinstance(value, str) or date.fromisoformat(value).isoformat() != value:
        raise ValueError("Invalid financing date")
    if value > get_new_york_now().date().isoformat():
        raise ValueError("Future financing date")
    return value


def unknown_axis():
    return {"summary": "待核实", "detail": "尚未完成此维度专项原文核查；不能用缺失数据判断低风险。", "as_of": None, "sources": []}


def validate_row(row):
    if row.get("level") not in LEVELS - {"not_applicable"}:
        raise ValueError("Invalid financing level")
    if row.get("completeness") not in {"partial", "complete"}:
        raise ValueError("Invalid financing completeness")
    checked_date(row.get("reviewed_at"))
    if not isinstance(row.get("reason"), str) or not row["reason"].strip():
        raise ValueError("Missing financing reason")
    known = 0
    for key in AXES:
        axis = row.get(key)
        if not isinstance(axis, dict) or not all(isinstance(axis.get(k), str) and axis[k].strip() for k in ("summary", "detail")):
            raise ValueError("Invalid financing axis")
        if len(axis["summary"]) > 42:
            raise ValueError("Financing summary too long")
        if not isinstance(axis.get("sources"), list):
            raise ValueError("Missing financing sources")
        if axis.get("as_of") is None:
            if axis["sources"] or axis["summary"] != "待核实":
                raise ValueError("Unknown axis cannot claim a finding")
        else:
            checked_date(axis["as_of"])
            if axis["as_of"] > row["reviewed_at"] or not axis["sources"]:
                raise ValueError("Fact must predate review and have evidence")
            for source in axis["sources"]:
                if not isinstance(source, dict) or not isinstance(source.get("title"), str) or not source["title"].strip():
                    raise ValueError("Invalid source title")
                link = urlparse(source.get("url", ""))
                if link.scheme != "https" or not link.netloc or any(c.isspace() for c in source["url"]):
                    raise ValueError("Invalid source URL")
            known += 1
    if not known or (row["completeness"] == "complete" and known != 3):
        raise ValueError("Incomplete evidence cannot be complete")
    if row["level"] == "clear" and row["completeness"] != "complete":
        raise ValueError("Missing evidence cannot produce clear risk")


def build_review(assessments, stock_list=STOCK_LIST_FILE):
    if assessments.get("schema_version") != 1 or not isinstance(assessments.get("rows"), list):
        raise ValueError("Invalid financing input")
    members = load_watchlist(stock_list)
    by_code = {}
    member_map = {m.code: m for m in members}
    for row in assessments["rows"]:
        if not isinstance(row, dict) or row.get("code") not in member_map or row["code"] in by_code:
            raise ValueError("Unknown or duplicate financing member")
        member = member_map[row["code"]]
        if member.asset_type != "stock" or row.get("symbol") != member.symbol:
            raise ValueError("Financing identity mismatch")
        validate_row(row)
        row = copy.deepcopy(row)
        comparison = row['actual'].get('comparison')
        if comparison is not None:
            if not isinstance(comparison, dict) or not isinstance(comparison.get('scope'), str) or not comparison['scope'].strip():
                raise ValueError('Missing comparable share scope')
            current_date = checked_date(comparison.get('current_date'))
            previous_date = checked_date(comparison.get('previous_date'))
            spans = {'3月': (70, 115), '6月': (150, 215), '9月': (240, 310), '12月': (330, 400)}
            period = comparison.get('period')
            span = (date.fromisoformat(current_date) - date.fromisoformat(previous_date)).days
            if period not in spans or not spans[period][0] <= span <= spans[period][1] or current_date != row['actual']['as_of']:
                raise ValueError('Invalid comparable share dates or period')
            growth = calculate_financing_share_growth(comparison.get('current_shares'), comparison.get('previous_shares'))
            row['actual']['summary'] = f'{period}股数 {growth:+.1f}%'
            row['actual']['share_growth_pct'] = round(growth, 4)
        by_code[row["code"]] = row
    rows = []
    for member in members:
        base = {"code": member.code, "symbol": member.symbol, "asset_type": member.asset_type}
        if member.asset_type != "stock":
            base.update(level="not_applicable", completeness="not_applicable", reviewed_at=None,
                        reason="非公司资产，不套用公司融资／稀释模型。")
            for key in AXES:
                base[key] = {"summary": "不适用", "detail": base["reason"], "as_of": None, "sources": []}
        elif member.code in by_code:
            reviewed = by_code[member.code]
            base.update({k: reviewed[k] for k in ("level", "completeness", "reviewed_at", "reason", *AXES)})
        else:
            base.update(level="unknown", completeness="unreviewed", reviewed_at=None,
                        reason="尚未完成融资专项核查；原估值假设和资金等级不能替代实际股数、融资条款与资金需求核验。")
            for key in AXES:
                base[key] = unknown_axis()
        rows.append(base)
    return {"schema_version": 1, "generated_at": get_new_york_now().isoformat(timespec="minutes"), "rows": rows}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT_DIR / "scripts/financing_assessments.json")
    parser.add_argument("--output", type=Path, default=ROOT_DIR / "public/data/financing-review.json")
    args = parser.parse_args()
    payload = build_review(json.loads(args.source.read_text(encoding="utf-8")))
    export_dashboard(args.output, payload)
    print(f"Financing rows={len(payload['rows'])}; complete={sum(r['completeness'] == 'complete' for r in payload['rows'])}; "
          f"partial={sum(r['completeness'] == 'partial' for r in payload['rows'])}; "
          f"unreviewed={sum(r['completeness'] == 'unreviewed' for r in payload['rows'])}; "
          f"not_applicable={sum(r['level'] == 'not_applicable' for r in payload['rows'])}")


if __name__ == "__main__":
    main()
