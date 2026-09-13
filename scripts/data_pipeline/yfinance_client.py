from __future__ import annotations

from dataclasses import dataclass
import time
from typing import Any

import pandas as pd
import yfinance as yf

from .config import RuntimeConfig, WatchlistItem
from .indicators import build_metrics, merge_name_and_metrics


@dataclass(frozen=True)
class PipelineRunResult:
    rows_by_adjustment: dict[str, list[dict[str, Any]]]
    errors: list[dict[str, str]]
    latest_trade_date: str | None
    successful_stocks: int
    failed_stocks: int


class YFinancePipelineClient:
    def __init__(self, config: RuntimeConfig) -> None:
        self.config = config
        cache_dir = config.root_dir / ".cache" / "yfinance"
        cache_dir.mkdir(parents=True, exist_ok=True)
        yf.set_tz_cache_location(str(cache_dir))

    def build_adjustment_rows(self) -> PipelineRunResult:
        rows_by_adjustment = {adjustment: [] for adjustment in self.config.adjustments}
        errors: list[dict[str, str]] = []
        latest_trade_date: str | None = None
        latest_any_date: str | None = None
        successful_codes: set[str] = set()
        failed_codes: set[str] = set()

        symbols = [item.symbol for item in self.config.watchlist]
        try:
            history = self.download_history(symbols)
        except Exception as exc:  # noqa: BLE001
            history = pd.DataFrame()
            errors.append({"code": "*", "name": "批量下载", "error": str(exc)})

        for item in self.config.watchlist:
            item_failed = False
            for adjustment in self.config.adjustments:
                try:
                    row, trade_date = self.build_row(item, history, adjustment)
                    rows_by_adjustment[adjustment].append(row)
                    latest_any_date = max_known_trade_date(latest_any_date, trade_date)
                    if item.asset_type != "crypto":
                        latest_trade_date = max_known_trade_date(latest_trade_date, trade_date)
                except Exception as exc:  # noqa: BLE001
                    item_failed = True
                    errors.append(
                        {
                            "code": item.code,
                            "name": item.name,
                            "error": f"{adjustment}: {exc}",
                        }
                    )
            if item_failed:
                failed_codes.add(item.code)
            else:
                successful_codes.add(item.code)

        return PipelineRunResult(
            rows_by_adjustment=rows_by_adjustment,
            errors=errors,
            # Prefer the latest regular-market date so weekend crypto bars do not
            # make the US stock data appear fresher than it is.
            latest_trade_date=latest_trade_date or latest_any_date,
            successful_stocks=len(successful_codes),
            failed_stocks=len(failed_codes),
        )

    def download_history(self, symbols: list[str]) -> pd.DataFrame:
        retry_delays = (0, 15, 45)
        for attempt, delay in enumerate(retry_delays, start=1):
            if delay:
                print(f"yfinance download retry {attempt}/{len(retry_delays)} after {delay}s")
                time.sleep(delay)
            frame = yf.download(
                tickers=symbols,
                start=self.config.start_date,
                end=self.config.end_date,
                interval="1d",
                group_by="ticker",
                auto_adjust=False,
                repair=False,
                actions=False,
                # Concurrent requests can trigger Yahoo throttling and lock its cache database.
                threads=False,
                progress=False,
                multi_level_index=True,
                timeout=30,
            )
            if frame is not None and not frame.empty:
                return frame
        raise RuntimeError("yfinance returned no rows after three attempts.")

    def build_row(
        self,
        item: WatchlistItem,
        downloaded: pd.DataFrame,
        adjustment: str,
    ) -> tuple[dict[str, Any], str]:
        frame = extract_symbol_frame(
            downloaded,
            item.symbol,
            adjusted=adjustment == "adjusted",
        )
        metrics = build_metrics(frame, self.config.year_start)
        trade_date = str(frame["trade_date"].astype(str).max())
        row = merge_name_and_metrics(item.code, item.name, metrics)
        row["symbol"] = item.symbol
        row["asset_type"] = item.asset_type
        row["adjustment"] = adjustment
        return row, trade_date


def extract_symbol_frame(downloaded: pd.DataFrame, symbol: str, adjusted: bool) -> pd.DataFrame:
    if downloaded is None or downloaded.empty:
        raise ValueError("No history returned by yfinance.")

    if isinstance(downloaded.columns, pd.MultiIndex):
        first_level = downloaded.columns.get_level_values(0)
        second_level = downloaded.columns.get_level_values(1)
        if symbol in first_level:
            frame = downloaded[symbol].copy()
        elif symbol in second_level:
            frame = downloaded.xs(symbol, axis=1, level=1).copy()
        else:
            raise ValueError(f"Ticker '{symbol}' was not returned by yfinance.")
    else:
        frame = downloaded.copy()

    frame = frame.reset_index()
    date_column = "Date" if "Date" in frame.columns else "Datetime"
    required_columns = {date_column, "Close", "High", "Low"}
    if adjusted:
        required_columns.add("Adj Close")
    missing = required_columns.difference(frame.columns)
    if missing:
        raise ValueError(f"Missing yfinance columns: {', '.join(sorted(missing))}")

    if adjusted:
        raw_close = pd.to_numeric(frame["Close"], errors="coerce")
        factor = pd.to_numeric(frame["Adj Close"], errors="coerce") / raw_close
        for column in ("Close", "High", "Low"):
            frame[column] = pd.to_numeric(frame[column], errors="coerce") * factor

    frame = frame.rename(columns={date_column: "trade_date", "Close": "close", "High": "high", "Low": "low"})
    frame = frame[["trade_date", "close", "high", "low"]].dropna()
    frame["trade_date"] = pd.to_datetime(frame["trade_date"]).dt.strftime("%Y%m%d")
    if frame.empty:
        raise ValueError(f"Ticker '{symbol}' has no usable daily bars.")
    return frame


def max_known_trade_date(current: str | None, candidate: str | None) -> str | None:
    if not candidate:
        return current
    if not current:
        return candidate
    return max(current, candidate)
