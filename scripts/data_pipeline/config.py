from __future__ import annotations

import csv
import calendar
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo


ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = ROOT_DIR / "scripts"
STOCK_LIST_FILE = SCRIPTS_DIR / "stock_list.csv"
OUTPUT_JSON_FILE = ROOT_DIR / "public" / "data" / "dashboard.json"
SUPPORTED_ADJUSTMENTS = ("adjusted", "raw")
NEW_YORK_TZ = ZoneInfo("America/New_York")


@dataclass(frozen=True)
class WatchlistItem:
    code: str
    name: str
    symbol: str
    asset_type: str
    watchlist: str = "original"
    tier: str = ""
    trading_status: str = "active"
    status_note: str = ""
    business: str = ""


@dataclass(frozen=True)
class RuntimeConfig:
    root_dir: Path
    stock_list_file: Path
    output_json_file: Path
    watchlist: list[WatchlistItem]
    adjustments: tuple[str, ...]
    updated_at: str
    start_date: str
    end_date: str
    year_start: str


def get_new_york_now() -> datetime:
    return datetime.now(NEW_YORK_TZ)


def build_runtime_config(today: date | None = None) -> RuntimeConfig:
    market_today = today or get_new_york_now().date()
    year_start = date(market_today.year, 1, 1)
    history_start = date(market_today.year - 5, market_today.month,
                         min(market_today.day, calendar.monthrange(market_today.year - 5, market_today.month)[1]))

    return RuntimeConfig(
        root_dir=ROOT_DIR,
        stock_list_file=STOCK_LIST_FILE,
        output_json_file=OUTPUT_JSON_FILE,
        watchlist=load_watchlist(STOCK_LIST_FILE),
        adjustments=SUPPORTED_ADJUSTMENTS,
        updated_at=get_new_york_now().isoformat(timespec="minutes"),
        start_date=history_start.isoformat(),
        # yfinance treats end as exclusive, so request tomorrow to include today.
        end_date=(market_today + timedelta(days=1)).isoformat(),
        year_start=year_start.strftime("%Y%m%d"),
    )


def load_watchlist(path: Path) -> list[WatchlistItem]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        items = []
        for row_number, row in enumerate(reader, start=2):
            code = (row.get("code") or "").strip().upper()
            name = (row.get("name") or "").strip()
            symbol = (row.get("symbol") or code).strip().upper()
            asset_type = (row.get("asset_type") or "stock").strip().lower()
            watchlist = row.get("watchlist", "original").strip()
            tier = (row.get("tier") or "").strip().upper()
            trading_status = (row.get("trading_status") or "active").strip()
            status_note = (row.get("status_note") or "").strip()
            if trading_status not in {"active", "suspended"}:
                raise RuntimeError(f"Unsupported trading_status on row {row_number} in {path}")
            if watchlist not in {"", "original"} or tier not in {"", "A", "B", "C"}:
                raise RuntimeError(f"Unsupported list membership on row {row_number} in {path}")
            if not watchlist and not tier:
                raise RuntimeError(f"Missing list membership on row {row_number} in {path}")
            if not code:
                continue
            if asset_type not in {"stock", "etf", "index", "crypto"}:
                raise RuntimeError(f"Unsupported asset_type '{asset_type}' on row {row_number} in {path}")
            items.append(
                WatchlistItem(
                    code=code,
                    name=name or code,
                    symbol=symbol,
                    asset_type=asset_type,
                    watchlist=watchlist,
                    tier=tier,
                    trading_status=trading_status,
                    status_note=status_note,
                    business=(row.get("business") or "").strip(),
                )
            )

    if not items:
        raise RuntimeError(f"No watchlist rows found in {path}")

    seen: set[str] = set()
    duplicate_codes: set[str] = set()
    for item in items:
        if item.code in seen:
            duplicate_codes.add(item.code)
        seen.add(item.code)
    if duplicate_codes:
        raise RuntimeError(f"Duplicate display codes in {path}: {', '.join(sorted(duplicate_codes))}")
    return items
