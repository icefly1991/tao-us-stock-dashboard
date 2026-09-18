from __future__ import annotations

from typing import Any

import pandas as pd


def build_metrics(frame: pd.DataFrame, year_start: str) -> dict[str, float | int | None]:
    ordered = normalize_history(frame)
    latest = ordered.iloc[-1]
    previous = ordered.iloc[-2]
    close = float(latest["close"])
    current_year = ordered[ordered["trade_date"] >= year_start]

    ma250 = float(ordered["close"].tail(250).mean()) if len(ordered) >= 250 else None
    year_start_close = float(current_year.iloc[0]["close"]) if not current_year.empty else None

    high_52w: float | None = None
    low_52w: float | None = None
    if len(ordered) >= 252:
        range_52w = ordered.tail(252)
        high_52w = float(range_52w["high"].max())
        low_52w = float(range_52w["low"].min())

    return {
        "close": round(close, 4),
        "today_return_pct": rounded_percent_change(close, float(previous["close"])),
        "distance_ma250_pct": rounded_percent_change(close, ma250),
        "ytd_return_pct": rounded_percent_change(close, year_start_close),
        "distance_52w_high_pct": rounded_percent_change(close, high_52w),
        "distance_52w_low_pct": rounded_percent_change(close, low_52w),
        "position_52w_pct": rounded_range_position(close, low_52w, high_52w),
        "history_days": len(ordered),
    }


def normalize_history(frame: pd.DataFrame) -> pd.DataFrame:
    if frame.empty:
        raise ValueError("No usable history returned by yfinance.")

    ordered = frame.copy()
    required = {"trade_date", "close", "high", "low"}
    missing = required.difference(ordered.columns)
    if missing:
        raise ValueError(f"Missing history columns: {', '.join(sorted(missing))}")

    ordered["trade_date"] = ordered["trade_date"].astype(str)
    for column in ("close", "high", "low"):
        ordered[column] = pd.to_numeric(ordered[column], errors="coerce")
    ordered = ordered.dropna(subset=["close", "high", "low"])
    ordered = ordered.sort_values("trade_date").drop_duplicates("trade_date", keep="last").reset_index(drop=True)

    if len(ordered) < 2:
        raise ValueError("At least two daily bars are required.")
    return ordered


def rounded_percent_change(current: float, base: float | None) -> float | None:
    if base is None or base == 0:
        return None
    return round((current / base - 1) * 100, 2)


def rounded_range_position(current: float, low: float | None, high: float | None) -> float | None:
    if low is None or high is None or high == low:
        return None
    return round((current - low) / (high - low) * 100, 2)


def merge_name_and_metrics(code: str, name: str, metrics: dict[str, Any]) -> dict[str, Any]:
    return {"code": code, "name": name, **metrics}


def build_history_metrics(frame: pd.DataFrame) -> dict[str, float | None]:
    """Actual available chart range; never presented as the strict 52-week metric."""
    high, low = float(frame["high"].max()), float(frame["low"].min())
    close = float(frame.iloc[-1]["close"])
    return {"high": round(high, 8), "low": round(low, 8), "close": round(close, 8),
            "distance_high_pct": rounded_percent_change(close, high),
            "position_pct": rounded_range_position(close, low, high)}
