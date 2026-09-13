from __future__ import annotations

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo


NEW_YORK_TZ = ZoneInfo("America/New_York")


def summarize_rows(rows: list[dict[str, Any]], watchlist_total: int) -> dict[str, int]:
    return {
        "watchlist_total": watchlist_total,
        "today_up": sum(1 for row in rows if row["today_return_pct"] > 0),
        "today_down": sum(1 for row in rows if row["today_return_pct"] < 0),
    }


def build_dashboard_payload(
    rows_by_adjustment: dict[str, list[dict[str, Any]]],
    errors: list[dict[str, str]],
    watchlist_total: int,
    updated_at: str | None = None,
    data_date: str | None = None,
) -> dict[str, Any]:
    payload = {
        "source": "yfinance",
        "updated_at": updated_at or datetime.now(NEW_YORK_TZ).isoformat(timespec="minutes"),
        "data_date": data_date,
        "adjustments": {
            key: {"summary": summarize_rows(rows, watchlist_total), "rows": rows}
            for key, rows in rows_by_adjustment.items()
        },
    }
    if errors:
        payload["errors"] = errors
    return payload
