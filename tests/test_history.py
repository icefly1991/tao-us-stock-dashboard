from __future__ import annotations

import sys
import unittest
from dataclasses import replace
from datetime import date
from pathlib import Path
from unittest.mock import Mock

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from data_pipeline.config import WatchlistItem, build_runtime_config
from data_pipeline.history import build_chart_history
from data_pipeline.indicators import build_metrics
from data_pipeline.yfinance_client import YFinancePipelineClient, extract_symbol_frame


class HistoryTests(unittest.TestCase):
    def setUp(self):
        self.downloaded = pd.DataFrame(
            [[10, 15, 8, 12, 6, 100], [12, 18, 10, 16, 8, 200],
             [16, 20, 14, 18, 9, 0], [18, 22, 17, 20, 10, 50]],
            columns=pd.MultiIndex.from_product([["TEST"], ["Open", "High", "Low", "Close", "Adj Close", "Volume"]]),
            index=pd.to_datetime(["2026-09-10", "2026-09-11", "2026-09-14", "2026-09-15"]))
        self.downloaded.index.name = "Date"

    def chart(self, adjusted=True):
        frame = extract_symbol_frame(self.downloaded, "TEST", adjusted, include_ohlcv=True)
        return build_chart_history(frame, "TEST", "adjusted" if adjusted else "raw", "VERSION", "2021-09-18")

    def test_adjusts_all_prices_but_not_volume_and_aggregates_weekly(self):
        chart = self.chart()
        self.assertEqual(chart["daily"][0], {"time": "2026-09-10", "open": 5, "high": 7.5, "low": 4, "close": 6, "volume": 100})
        self.assertEqual(chart["weekly"][0], {"time": "2026-09-10", "open": 5, "high": 9, "low": 4, "close": 8, "volume": 300})
        self.assertEqual(len(chart["weekly"]), 2)
        self.assertEqual(chart["daily"][2]["volume"], 0)
        self.assertEqual(chart["metrics"]["position_pct"], 85.71)
        self.assertEqual(self.chart(False)["daily"][0]["open"], 10)

    def test_missing_volume_remains_null_in_daily_and_weekly(self):
        self.downloaded.loc[self.downloaded.index[0], ("TEST", "Volume")] = float("nan")
        chart = self.chart()
        self.assertIsNone(chart["daily"][0]["volume"])
        self.assertIsNone(chart["weekly"][0]["volume"])
        self.assertEqual(chart["weekly"][1]["volume"], 50)

    def test_missing_open_does_not_remove_valid_dashboard_metrics(self):
        self.downloaded = self.downloaded.drop(columns=[("TEST", "Open")])
        config = replace(build_runtime_config(date(2026, 9, 18)), watchlist=[WatchlistItem("TEST", "Test", "TEST", "stock")])
        client = YFinancePipelineClient(config)
        client.download_history = Mock(return_value=self.downloaded)
        result = client.build_adjustment_rows()
        self.assertEqual(result.successful_stocks, 1)
        self.assertEqual(result.failed_stocks, 0)
        self.assertEqual(len(result.history_errors), 2)
        self.assertFalse(result.rows_by_adjustment["adjusted"][0]["history_available"])

    def test_pipeline_outputs_matching_versions_modes_and_latest_prices(self):
        config = replace(build_runtime_config(date(2026, 9, 18)), watchlist=[WatchlistItem("TEST", "Test", "TEST", "stock")])
        client = YFinancePipelineClient(config)
        client.download_history = Mock(return_value=self.downloaded)
        result = client.build_adjustment_rows()
        self.assertEqual(result.history_errors, [])
        for mode in ("adjusted", "raw"):
            chart = result.histories[mode]["TEST"]
            self.assertEqual(chart["updated_at"], config.updated_at)
            self.assertEqual(chart["adjustment"], mode)
            self.assertEqual(chart["metrics"]["close"], result.rows_by_adjustment[mode][0]["close"])
            self.assertEqual(chart["actual_end"], "2026-09-15")
        client.download_history.assert_called_once_with(["TEST"])

    def test_longer_download_does_not_change_existing_metric_formulas(self):
        dates = pd.bdate_range("2021-09-18", "2026-09-18")
        values = pd.Series(range(10, 10 + len(dates)))
        frame = pd.DataFrame({"trade_date": dates.strftime("%Y%m%d"), "close": values, "high": values + 2, "low": values - 2})
        full = build_metrics(frame, "20260101")
        previous = build_metrics(frame[frame.trade_date >= "20250317"], "20260101")
        full.pop("history_days")
        previous.pop("history_days")
        self.assertEqual(full, previous)
        self.assertEqual(build_runtime_config(date(2024, 2, 29)).start_date, "2019-02-28")


if __name__ == "__main__":
    unittest.main()
