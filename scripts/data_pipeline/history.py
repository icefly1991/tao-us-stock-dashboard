from __future__ import annotations

import math
from typing import Any

import pandas as pd

from .indicators import build_history_metrics


def build_chart_history(frame: pd.DataFrame, code: str, adjustment: str,
                        updated_at: str, requested_start: str) -> dict[str, Any]:
    ordered = frame.sort_values("trade_date").drop_duplicates("trade_date", keep="last").copy()
    if ordered.empty:
        raise ValueError("No chart history available.")
    for column in ("open", "high", "low", "close"):
        if not ordered[column].map(lambda value: math.isfinite(float(value)) and value > 0).all():
            raise ValueError(f"Invalid chart {column}.")
    if ((ordered.high < ordered[["open", "close", "low"]].max(axis=1)) |
            (ordered.low > ordered[["open", "close"]].min(axis=1))).any():
        raise ValueError("Invalid chart OHLC range.")
    dates = pd.to_datetime(ordered.trade_date, format="%Y%m%d")
    ordered["time"] = dates.dt.strftime("%Y-%m-%d")
    ordered["week"] = dates.dt.to_period("W-SUN")

    def bars(source: pd.DataFrame) -> list[dict[str, Any]]:
        result = []
        for row in source.to_dict("records"):
            volume = row.get("volume")
            result.append({"time": row["time"],
                           **{key: round(float(row[key]), 8) for key in ("open", "high", "low", "close")},
                           "volume": float(volume) if pd.notna(volume) and math.isfinite(float(volume)) and volume >= 0 else None})
        return result

    weekly = ordered.groupby("week", sort=True).agg(
        time=("time", "first"), open=("open", "first"), high=("high", "max"),
        low=("low", "min"), close=("close", "last"),
        volume=("volume", lambda values: values.sum() if values.notna().all() and (values >= 0).all() else None))
    return {"code": code, "adjustment": adjustment, "updated_at": updated_at,
            "source": "yfinance", "requested_start": requested_start,
            "actual_start": ordered.iloc[0]["time"], "actual_end": ordered.iloc[-1]["time"],
            "daily": bars(ordered), "weekly": bars(weekly), "metrics": build_history_metrics(ordered)}
