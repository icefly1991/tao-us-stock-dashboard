import json
import sys
import tempfile
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from data_pipeline.indicators import build_box_metrics, build_long_range_metrics, analyze_box_window, summarize_box_cycles
from generate_boxes import generate_boxes


def bars(values):
    dates = pd.bdate_range("2026-01-01", periods=len(values))
    return [{"time": str(date.date()), "open": value, "high": value + 1, "low": value - 1, "close": value}
            for date, value in zip(dates, values)]


class BoxTests(unittest.TestCase):
    def test_repeated_wide_range_and_single_leg_duration(self):
        values = ([70] * 10 + [110] * 10) * 6
        values[-1] = 90
        result = analyze_box_window(bars(values), 120)
        self.assertEqual(result["status"], "match")
        self.assertEqual(result["up_count"], 6)
        self.assertEqual(result["down_count"], 5)
        self.assertEqual(result["up_days"], 10)
        self.assertAlmostEqual(result["width_pct"], 57.14)
        self.assertEqual(result["trips"][0]["start_index"], 0)
        self.assertEqual(result["round_count"], 3)
        self.assertEqual(result["recognition_method"], "retrospective_full_window")

    def test_entire_window_sets_one_boundary_pair_and_counts_early_legs(self):
        values = ([100] * 5 + [140] * 5) * 6
        result = analyze_box_window(bars(values), 60)
        self.assertEqual(result["low"], 100)
        self.assertEqual(result["high"], 140)
        self.assertEqual(result["trips"][0]["start_index"], 0)
        changed = analyze_box_window(bars(values[:30] + [200] * 30), 60)
        self.assertNotEqual(changed["high"], result["high"])
        self.assertEqual(changed["window_start_index"], 0)
        # This is retrospective recognition, explicitly not a frozen formation/test split.
        self.assertNotIn("formation_end", result)

    def test_watch_requires_third_leg_halfway_not_a_single_mountain(self):
        for inverted in (False, True):
            for last, expected in [(100, "rejected"), (119.99, "rejected"), (120, "watch"), (140, "match")]:
                values = [100] * 15 + [140] * 15 + [100] * 15 + [last] * 15
                if inverted:
                    values = [240 - value for value in values]
                result = analyze_box_window(bars(values), 60)
                self.assertEqual(result["status"], expected, (inverted, last, result["reason"]))
                if expected == "watch":
                    self.assertEqual(result["round_count"], 0)
                    self.assertIsNone(result["cycle_days"])
                    self.assertEqual(result["third_leg_progress_pct"], 50)
                if expected == "match":
                    self.assertEqual(result["round_count"], 1)

    def test_user_three_to_eight_width_formula_and_exact_touch_edges(self):
        result = analyze_box_window(bars(([3] * 5 + [8] * 5) * 6), 60)
        self.assertEqual(result["width_pct"], 166.67)
        values = [100] * 10 + [140] * 10 + [108] * 10 + [132] * 10 + [108] * 10 + [132] * 10
        result = analyze_box_window(bars(values), 60)
        self.assertEqual((result["low"], result["high"]), (100, 140))
        self.assertEqual([t["end_index"] for t in result["trips"]], [10, 20, 30, 40, 50])

    def test_touch_zone_edges_and_same_side_dwell(self):
        values = ([100] * 10 + [140] * 10) * 3
        result = analyze_box_window(bars(values), 60)
        self.assertEqual(len(result["trips"]), 5)
        self.assertEqual([t["start_index"] for t in result["trips"]], [0, 10, 20, 30, 40])
        # Same-side dwelling does not reset a leg's clock.
        self.assertEqual(result["rounds"][0]["calendar_days"], (pd.Timestamp(bars(values)[30]["time"]) - pd.Timestamp(bars(values)[0]["time"])).days)

    def test_short_year_uses_actual_history_and_marks_missing_four_years(self):
        result = build_box_metrics(bars(([70] * 10 + [110] * 10) * 6))
        self.assertTrue(result["short_year"])
        self.assertEqual(result["recognition_method"], "retrospective_full_window")
        self.assertFalse(result["long_history_complete"])
        self.assertIsNone(result["year_return_pct"])

    def test_annual_surge_excluded_even_below_long_term_high(self):
        result = build_long_range_metrics(bars([200] * 800 + [20] * 127 + [50] * 126))
        self.assertLess(result["long_position_pct"], 80)
        self.assertEqual(result["year_return_pct"], 150)
        self.assertIn("近一年涨幅≥100%", result["exclusion_reasons"])

    def test_low_rebound_and_high_position_are_independent_filters(self):
        rebound = build_long_range_metrics(bars([200] * 800 + [100] * 127 + [20] * 63 + [80] * 63))
        self.assertLess(rebound["year_return_pct"], 100)
        self.assertIn("较近一年低点上涨≥200%", rebound["exclusion_reasons"])
        high = build_long_range_metrics(bars([50, 100] * 126 + [95]))
        self.assertIn("长期区间位置≥80%", high["exclusion_reasons"])

    def test_four_year_window_does_not_include_older_peak(self):
        result = build_long_range_metrics(bars([1000] * 300 + [100] * 1100))
        self.assertEqual(result["long_high"], 101)
        self.assertTrue(result["long_history_complete"])
        self.assertEqual(result["long_bars"][-1]["close"], 100)

    def test_downtrend_is_not_a_range_and_position_is_not_clipped(self):
        result = build_box_metrics(bars(list(range(200, 80, -1))))
        self.assertEqual(result["status"], "broken")
        self.assertLess(result["position_pct"], 0)
        self.assertEqual(result["up_count"], 0)
        self.assertIsNone(result["up_days"])

    def test_short_or_flat_history_has_no_fabricated_box(self):
        for values in ([90] * 59, [90] * 120):
            result = build_box_metrics(bars(values))
            self.assertEqual(result["status"], "insufficient")
            self.assertNotIn("width_pct", result)

    def test_twenty_percent_narrow_box_and_interior_space(self):
        values = ([100] * 5 + [120] * 5) * 3 + ([100] * 3 + [120] * 3) * 5
        values[-1] = 110
        result = build_box_metrics(bars(values))
        self.assertEqual(result["status"], "match")
        self.assertEqual(result["window_days"], 60)
        self.assertEqual(result["width_pct"], 20)
        self.assertEqual(result["round_count"], 5)
        self.assertAlmostEqual(result["inner_space_pct"], 11.54)

    def test_recent_contraction_selected_over_old_wide_box(self):
        values = ([70] * 7 + [150] * 7) * 9
        values += ([70] * 6 + [150] * 6) * 5 + [70] * 6
        values += ([100] * 5 + [125] * 5) * 3 + ([100] * 3 + [125] * 3) * 5
        values[-1] = 112
        result = build_box_metrics(bars(values))
        self.assertEqual(result["window_days"], 60)
        self.assertTrue(result["contracting"])
        self.assertEqual(result["width_pct"], 25)
        self.assertEqual(result["prior_box"]["window_days"], 252)
        self.assertGreater(result["prior_box"]["width_pct"], 100)
        self.assertEqual(len(result["bars"]), 252)
        self.assertGreaterEqual(result["trips"][0]["start_index"], 192)

    def test_three_alternating_legs_both_directions_without_reuse(self):
        history = [{"time": str(date.date())} for date in pd.date_range("2026-01-01", periods=91)]
        for start_low in (True, False):
            indices = list(range(0, 91, 10))
            events = [{"side": "low" if (i % 2 == 0) == start_low else "high", "index": index} for i, index in enumerate(indices)]
            trips = [{"direction": "up" if events[i]["side"] == "low" else "down", "start_index": start, "end_index": end}
                     for i, (start, end) in enumerate(zip(indices, indices[1:]))]
            for count in (1, 2):
                partial = summarize_box_cycles(history, trips[:count], events[:count + 1])
                self.assertEqual(partial["round_count"], 0)
                self.assertIsNone(partial["cycle_days"])
            result = summarize_box_cycles(history, trips, events)
            self.assertEqual(result["round_count"], 3)  # 9 legs, not 7 overlapping samples
            self.assertEqual([r["calendar_days"] for r in result["rounds"]], [30, 30, 30])
            self.assertEqual([r["start_index"] for r in result["rounds"]], [0, 30, 60])
            self.assertEqual(len(result["rounds"][0]["turns"]), 4)
            self.assertEqual(result["rounds"][0]["turns"][0]["side"], events[0]["side"])

    def test_arithmetic_mean_not_median_or_latest_or_pending(self):
        indices = [0, 10, 20, 30, 40, 50, 60, 120, 180, 240]
        history = [{"time": str(date.date())} for date in pd.date_range("2026-01-01", periods=391)]
        events = [{"side": "low" if i % 2 == 0 else "high", "index": index} for i, index in enumerate(indices)]
        trips = [{"direction": "up" if i % 2 == 0 else "down", "start_index": start, "end_index": end}
                 for i, (start, end) in enumerate(zip(indices, indices[1:]))]
        result = summarize_box_cycles(history, trips, events)
        self.assertEqual(result["cycle_days"], 80)  # (30+30+180)/3, median would be 30
        self.assertEqual(result["latest_cycle_days"], 180)
        self.assertEqual(result["pending_days"], 150)
        self.assertEqual(result["speed_band"], "qualified")

    def test_120_calendar_days_inclusive_and_pending_not_a_filter(self):
        for days, pending, expected in [(60, 0, "qualified"), (120, 0, "qualified"),
                                        (121, 0, "slow"), (20, 150, "qualified")]:
            history = [{"time": str(date.date())} for date in pd.date_range("2026-01-01", periods=days + pending + 1)]
            indices = [0, 1, 2, days]
            events = [{"side": "low" if i % 2 == 0 else "high", "index": index} for i, index in enumerate(indices)]
            trips = [{"direction": "up" if i % 2 == 0 else "down", "start_index": start, "end_index": end}
                     for i, (start, end) in enumerate(zip(indices, indices[1:]))]
            result = summarize_box_cycles(history, trips, events)
            self.assertEqual(result["speed_band"], expected)
            self.assertEqual(result["pending_days"], pending)
            self.assertEqual(result["maturity"], "verified")

    def test_export_aligns_existing_rsi_and_preserves_volume_missing_and_zero(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "history/adjusted").mkdir(parents=True)
            daily = bars(([100] * 5 + [140] * 5) * 6)
            daily[0]["volume"] = None
            daily[-1]["volume"] = 0
            date = daily[-1]["time"].replace("-", "")
            dashboard = {"updated_at": "same", "data_date": date, "collections": [{"id": "research", "codes": ["X"]}],
                         "adjustments": {"adjusted": {"rows": [{"code": "X", "name": "Example", "business": "Example business"}]}}}
            history = {"code": "X", "adjustment": "adjusted", "updated_at": "same", "actual_end": daily[-1]["time"],
                       "daily": daily, "rsi_history": {"points": [{"time": daily[-1]["time"], "value": 44.2}]}}
            (root / "dashboard.json").write_text(json.dumps(dashboard))
            (root / "history/adjusted/X.json").write_text(json.dumps(history))
            row = generate_boxes(root)["rows"][0]
            self.assertIsNone(row["bars"][0]["volume"])
            self.assertIsNone(row["bars"][0]["rsi_value"])
            self.assertEqual(row["bars"][-1]["volume"], 0)
            self.assertEqual(row["bars"][-1]["rsi_value"], 44.2)
            self.assertEqual(row["business"], "Example business")
            self.assertEqual(row["rounds"], build_box_metrics(daily)["rounds"])
            del history["rsi_history"]
            (root / "history/adjusted/X.json").write_text(json.dumps(history))
            self.assertTrue(all(bar["rsi_value"] is None for bar in generate_boxes(root)["rows"][0]["bars"]))

    def test_export_rejects_wrong_version_and_preserves_previous(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "history/adjusted").mkdir(parents=True)
            dashboard = {"updated_at": "new", "data_date": "20260617", "collections": [{"id": "research", "codes": ["X"]}],
                         "adjustments": {"adjusted": {"rows": [{"code": "X", "name": "Example"}]}}}
            (root / "dashboard.json").write_text(json.dumps(dashboard))
            (root / "history/adjusted/X.json").write_text(json.dumps({"updated_at": "old", "code": "X", "adjustment": "adjusted"}))
            (root / "boxes.json").write_text('previous')
            with self.assertRaises(RuntimeError):
                generate_boxes(root)
            self.assertEqual((root / "boxes.json").read_text(), 'previous')


if __name__ == "__main__":
    unittest.main()
