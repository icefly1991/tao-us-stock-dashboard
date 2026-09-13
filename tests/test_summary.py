from __future__ import annotations

import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from data_pipeline.summary import build_dashboard_payload  # noqa: E402


class SummaryTests(unittest.TestCase):
    def test_payload_tracks_source_dates_and_summary(self) -> None:
        rows = [{"today_return_pct": 1.0}, {"today_return_pct": -2.0}, {"today_return_pct": 0.0}]
        payload = build_dashboard_payload(
            {"adjusted": rows, "raw": rows},
            [],
            watchlist_total=3,
            updated_at="2026-09-14T18:30-04:00",
            data_date="20260914",
        )

        self.assertEqual(payload["source"], "yfinance")
        self.assertEqual(payload["data_date"], "20260914")
        self.assertEqual(payload["adjustments"]["adjusted"]["summary"]["today_up"], 1)
        self.assertEqual(payload["adjustments"]["adjusted"]["summary"]["today_down"], 1)
        self.assertNotIn("errors", payload)


if __name__ == "__main__":
    unittest.main()
