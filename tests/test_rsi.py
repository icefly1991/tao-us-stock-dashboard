import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from data_pipeline.indicators import build_rsi_metrics, wilder_rsi


def frame(values, start="2026-01-01"):
    return pd.DataFrame({"trade_date": pd.bdate_range(start, periods=len(values)).strftime("%Y%m%d"), "close": values})


class RsiTests(unittest.TestCase):
    def test_wilder_known_seed_and_recursive_values(self):
        prices = [44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42,
                  45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03]
        result = wilder_rsi(prices)
        self.assertEqual(result[:14], [None] * 14)
        self.assertAlmostEqual(result[14], 70.4641350211, places=8)
        self.assertAlmostEqual(result[15], 66.2496185536, places=8)
        self.assertAlmostEqual(result[16], 66.4809418347, places=8)

    def test_minimum_history_and_flat_up_down(self):
        self.assertIsNone(build_rsi_metrics(frame([100] * 14))["value"])
        for prices, expected, state in [([100] * 15, 50, "neutral"), (list(range(100, 115)), 100, "overbought"),
                                        (list(range(115, 100, -1)), 0, "oversold")]:
            result = build_rsi_metrics(frame(prices))
            self.assertEqual(result["value"], expected)
            self.assertEqual(result["state"], state)
            self.assertIsNone(result["percentile_ytd"])

    def test_percentile_requires_twenty_valid_rsi_samples(self):
        nineteen = build_rsi_metrics(frame([100] * 33))
        twenty = build_rsi_metrics(frame([100] * 34))
        self.assertEqual(nineteen["sample_count"], 19)
        self.assertIsNone(nineteen["percentile_ytd"])
        self.assertEqual(twenty["sample_count"], 20)
        self.assertEqual(twenty["percentile_ytd"], 50)

    def test_year_boundary_keeps_smoothing_but_resets_rank_sample(self):
        source = frame([100] * 80, start="2025-11-03")
        result = build_rsi_metrics(source)
        self.assertEqual(result["sample_start"], "2026-01-01")
        self.assertEqual(result["sample_count"], int((source.trade_date >= "20260101").sum()))
        self.assertEqual(result["value"], 50)

    def test_midrank_ties_and_relative_extremes_do_not_change_absolute_state(self):
        for samples, percentile, rank_state in [([10, 40] + [60] * 17 + [40], 10, "low"),
                                                ([10] * 17 + [60, 40, 40], 90, "high")]:
            with patch("data_pipeline.indicators.wilder_rsi", return_value=[None] * 14 + samples):
                result = build_rsi_metrics(frame([100] * 34))
            self.assertEqual(result["percentile_ytd"], percentile)
            self.assertEqual(result["percentile_state"], rank_state)
            self.assertEqual(result["state"], "neutral")

    def test_absolute_thresholds_follow_display_precision(self):
        for value, expected in [(30, "oversold"), (30.1, "neutral"), (69.9, "neutral"), (70, "overbought")]:
            with patch("data_pipeline.indicators.wilder_rsi", return_value=[None] * 14 + [value]):
                result = build_rsi_metrics(frame([100] * 15))
            self.assertEqual(result["state"], expected)

    def test_invalid_price_resets_warmup_and_latest_missing_is_not_zero(self):
        series = wilder_rsi([100] * 34 + [float("nan")] + [100] * 14)
        self.assertEqual(series[-15:], [None] * 15)
        result = build_rsi_metrics(frame([100] * 34 + [float("nan")]))
        self.assertIsNone(result["value"])
        self.assertIsNone(result["percentile_ytd"])
        self.assertEqual(result["state"], "unavailable")


if __name__ == "__main__":
    unittest.main()
