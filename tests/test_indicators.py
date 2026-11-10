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
    def test_since_nov5_exact_date_and_independent_price_basis(self) -> None:
        for baseline, latest in [(100, 110), (50, 60)]:
            frame = pd.DataFrame({"trade_date": ["20261104", "20261105", "20261110"],
                                  "close": [90, baseline, latest],
                                  "high": [200, 200, 200], "low": [1, 1, 1]})
            metrics = build_metrics(frame, "20260101")
            self.assertEqual(metrics["close_20261105"], baseline)
            self.assertEqual(metrics["since_20261105_pct"], round((latest / baseline - 1) * 100, 2))
            on_base = build_metrics(frame.iloc[:2], "20260101")
            self.assertEqual(on_base["since_20261105_pct"], 0)
            missing = build_metrics(frame.iloc[[0, 2]], "20260101")
            self.assertIsNone(missing["since_20261105_pct"])
            self.assertIsNone(missing["close_20261105"])
            frame.loc[2, "trade_date"] = "20270105"
            self.assertEqual(build_metrics(frame, "20270101")["close_20261105"], baseline)

    def test_since_nov5_before_baseline_is_unavailable(self) -> None:
        frame = make_frame(20)
        metrics = build_metrics(frame, "20250101")
        self.assertIsNone(metrics["since_20261105_pct"])
        self.assertIsNone(metrics["close_20261105"])

    def test_complete_history_calculates_all_metrics(self) -> None:
        metrics = build_metrics(make_frame(260), "20250101")

        self.assertEqual(metrics["close"], 260.0)
        self.assertEqual(metrics["today_return_pct"], 0.39)
        self.assertEqual(metrics["history_days"], 260)
        self.assertIsNotNone(metrics["distance_ma250_pct"])
        self.assertIsNotNone(metrics["distance_52w_high_pct"])
        self.assertIsNotNone(metrics["distance_52w_low_pct"])
        self.assertIsNotNone(metrics["position_52w_pct"])
        self.assertEqual(metrics["high_52w"], 261.0)
        self.assertEqual(metrics["low_52w"], 8.0)

    def test_range_prices_share_strict_252_row_window_with_distances(self) -> None:
        for count in (251, 252, 253):
            with self.subTest(count=count):
                frame = make_frame(count)
                frame.loc[0, "high"] = 10000
                frame.loc[0, "low"] = 0.123456789
                metrics = build_metrics(frame, "20250101")
                if count < 252:
                    self.assertIsNone(metrics["high_52w"])
                    self.assertIsNone(metrics["low_52w"])
                else:
                    self.assertEqual(metrics["high_52w"], 10000 if count == 252 else 254)
                    self.assertEqual(metrics["low_52w"], 0.12345679 if count == 252 else 1)
                    window = frame.tail(252)
                    for side in ("high", "low"):
                        bound = window[side].max() if side == "high" else window[side].min()
                        self.assertEqual(metrics[f"distance_52w_{side}_pct"], round((count / bound - 1) * 100, 2))

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
