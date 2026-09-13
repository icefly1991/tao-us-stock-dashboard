from __future__ import annotations

import sys
import unittest
from pathlib import Path

import pandas as pd


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from data_pipeline.indicators import build_metrics  # noqa: E402


def make_frame(rows: int) -> pd.DataFrame:
    closes = [float(index) for index in range(1, rows + 1)]
    return pd.DataFrame(
        {
            "trade_date": pd.bdate_range("2025-01-02", periods=rows).strftime("%Y%m%d"),
            "close": closes,
            "high": [value + 1 for value in closes],
            "low": [max(value - 1, 0.5) for value in closes],
        }
    )


class IndicatorTests(unittest.TestCase):
    def test_complete_history_calculates_all_metrics(self) -> None:
        metrics = build_metrics(make_frame(260), "20250101")

        self.assertEqual(metrics["close"], 260.0)
        self.assertEqual(metrics["today_return_pct"], 0.39)
        self.assertEqual(metrics["history_days"], 260)
        self.assertIsNotNone(metrics["distance_ma250_pct"])
        self.assertIsNotNone(metrics["distance_52w_high_pct"])
        self.assertIsNotNone(metrics["distance_52w_low_pct"])
        self.assertIsNotNone(metrics["position_52w_pct"])

    def test_short_history_keeps_basic_metrics_and_uses_null_for_long_metrics(self) -> None:
        metrics = build_metrics(make_frame(20), "20250101")

        self.assertEqual(metrics["close"], 20.0)
        self.assertIsNotNone(metrics["today_return_pct"])
        self.assertIsNotNone(metrics["ytd_return_pct"])
        self.assertIsNone(metrics["distance_ma250_pct"])
        self.assertIsNone(metrics["distance_52w_high_pct"])
        self.assertIsNone(metrics["distance_52w_low_pct"])
        self.assertIsNone(metrics["position_52w_pct"])

    def test_requires_two_usable_rows(self) -> None:
        with self.assertRaisesRegex(ValueError, "At least two"):
            build_metrics(make_frame(1), "20250101")


if __name__ == "__main__":
    unittest.main()
