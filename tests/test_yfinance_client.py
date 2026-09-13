from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

import pandas as pd


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from data_pipeline.config import RuntimeConfig, WatchlistItem  # noqa: E402
from data_pipeline.yfinance_client import YFinancePipelineClient, extract_symbol_frame  # noqa: E402


class YFinanceFrameTests(unittest.TestCase):
    def setUp(self) -> None:
        columns = pd.MultiIndex.from_product(
            [["TEST"], ["Adj Close", "Close", "High", "Low"]]
        )
        self.downloaded = pd.DataFrame(
            [[50.0, 100.0, 110.0, 90.0], [60.0, 120.0, 130.0, 100.0]],
            index=pd.to_datetime(["2026-01-02", "2026-01-05"]),
            columns=columns,
        )
        self.downloaded.index.name = "Date"

    def test_raw_frame_keeps_original_ohlc(self) -> None:
        frame = extract_symbol_frame(self.downloaded, "TEST", adjusted=False)

        self.assertEqual(frame.iloc[0]["close"], 100.0)
        self.assertEqual(frame.iloc[0]["high"], 110.0)

    def test_adjusted_frame_applies_close_factor_to_all_ohlc(self) -> None:
        frame = extract_symbol_frame(self.downloaded, "TEST", adjusted=True)

        self.assertEqual(frame.iloc[0]["close"], 50.0)
        self.assertEqual(frame.iloc[0]["high"], 55.0)
        self.assertEqual(frame.iloc[0]["low"], 45.0)

    def test_latest_date_ignores_newer_weekend_crypto_bar(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            watchlist = [
                WatchlistItem("NVDA", "NVIDIA", "NVDA", "stock"),
                WatchlistItem("DOGEUSD", "Dogecoin", "DOGE-USD", "crypto"),
            ]
            config = RuntimeConfig(
                root_dir=root,
                stock_list_file=root / "stocks.csv",
                output_json_file=root / "dashboard.json",
                watchlist=watchlist,
                adjustments=("adjusted", "raw"),
                updated_at="2026-09-14T18:30-04:00",
                start_date=date(2025, 1, 1).isoformat(),
                end_date=date(2026, 9, 15).isoformat(),
                year_start="20260101",
            )
            client = YFinancePipelineClient(config)
            client.download_history = lambda symbols: pd.DataFrame({"value": [1]})  # type: ignore[method-assign]

            def fake_build_row(item, downloaded, adjustment):  # type: ignore[no-untyped-def]
                trade_date = "20260913" if item.asset_type == "crypto" else "20260911"
                return {"code": item.code}, trade_date

            client.build_row = fake_build_row  # type: ignore[method-assign]

            result = client.build_adjustment_rows()

            self.assertEqual(result.latest_trade_date, "20260911")


if __name__ == "__main__":
    unittest.main()
