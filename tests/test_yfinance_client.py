from __future__ import annotations

import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest.mock import patch
from contextlib import redirect_stdout
from io import StringIO
from types import SimpleNamespace

import pandas as pd


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from data_pipeline.config import RuntimeConfig, WatchlistItem  # noqa: E402
from data_pipeline.yfinance_client import YFinancePipelineClient, extract_symbol_frame, IncompleteLatestBarError, PipelineRunResult  # noqa: E402
import generate_dashboard


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

    def test_incomplete_latest_session_is_not_silently_dropped(self):
        self.downloaded.loc[pd.Timestamp("2026-01-06")] = [float("nan"), float("nan"), 140, 110]
        for adjusted in (True, False):
            with self.subTest(adjusted=adjusted), self.assertRaises(IncompleteLatestBarError) as caught:
                extract_symbol_frame(self.downloaded, "TEST", adjusted)
            message = str(caught.exception)
            self.assertIn("session=2026-01-06", message)
            self.assertIn("missing=Close", message)
            self.assertIn("last_usable=2026-01-05", message)

    def test_missing_adjusted_close_blocks_adjusted_prices_only(self):
        self.downloaded.loc[pd.Timestamp("2026-01-06")] = [float("nan"), 125, 140, 110]
        with self.assertRaisesRegex(IncompleteLatestBarError, "missing=Adj Close"):
            extract_symbol_frame(self.downloaded, "TEST", True)
        self.assertEqual(extract_symbol_frame(self.downloaded, "TEST", False).iloc[-1]["close"], 125)

    def test_empty_union_date_and_old_gap_do_not_block_valid_latest_bar(self):
        self.downloaded.loc[pd.Timestamp("2026-01-03")] = [float("nan"), float("nan"), 140, 110]
        self.downloaded.loc[pd.Timestamp("2026-01-06")] = [float("nan")] * 4
        frame = extract_symbol_frame(self.downloaded, "TEST", True)
        self.assertEqual(frame.iloc[-1]["trade_date"], "20260105")

    def test_incomplete_session_stops_generation_before_any_export(self):
        result = PipelineRunResult(
            rows_by_adjustment={"adjusted": [{"code": "VIX"}]},
            errors=[{"code": "NVDA", "error": "session=2026-09-21 missing=Close,Adj Close last_usable=2026-09-18"}],
            latest_trade_date="20260921", successful_stocks=1, failed_stocks=1,
            incomplete_latest_errors=[{"code": "NVDA", "error": "incomplete"}])
        output = StringIO()
        with patch.object(generate_dashboard, "build_runtime_config", return_value=SimpleNamespace(watchlist=[])), \
             patch.object(generate_dashboard, "YFinancePipelineClient") as client, \
             patch.object(generate_dashboard, "export_dashboard") as export, \
             patch.object(generate_dashboard, "generate_boxes") as boxes, redirect_stdout(output):
            client.return_value.build_adjustment_rows.return_value = result
            with self.assertRaisesRegex(RuntimeError, "no dashboard/history/boxes files were written"):
                generate_dashboard.main()
            export.assert_not_called()
            boxes.assert_not_called()
        self.assertIn("NVDA", output.getvalue())
        self.assertIn("missing=Close,Adj Close", output.getvalue())
        self.assertIn("::error title=Latest daily prices incomplete::", output.getvalue())


if __name__ == "__main__":
    unittest.main()
