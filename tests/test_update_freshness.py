import os
import sys
import tempfile
import unittest
from dataclasses import replace
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from data_pipeline.market_calendar import latest_closed_session
from data_pipeline.config import build_runtime_config, WatchlistItem
from data_pipeline.yfinance_client import YFinancePipelineClient, PipelineRunResult, extract_symbol_frame
from update_preflight import publication_current
import update_preflight
import generate_dashboard


class SessionCalendarTests(unittest.TestCase):
    def test_after_close_and_after_midnight_use_same_session(self):
        for moment in ("2026-10-14T16:15:00-04:00", "2026-10-15T03:15:00-04:00"):
            self.assertEqual(latest_closed_session(datetime.fromisoformat(moment)), "20261014")

    def test_before_close_weekend_and_holiday(self):
        for moment, expected in (
            ("2026-10-14T15:59:00-04:00", "20261013"),
            ("2026-10-17T12:00:00-04:00", "20261016"),
            ("2026-12-25T18:00:00-05:00", "20261224"),
            ("2026-01-01T18:00:00-05:00", "20251231"),
            ("2026-07-03T18:00:00-04:00", "20260702"),
            ("2026-03-09T16:15:00-04:00", "20260309"),
            ("2026-11-02T16:15:00-05:00", "20261102"),
        ):
            with self.subTest(moment=moment):
                self.assertEqual(latest_closed_session(datetime.fromisoformat(moment)), expected)

    def test_early_close(self):
        self.assertEqual(latest_closed_session(datetime.fromisoformat("2026-11-27T12:59:00-05:00")), "20261125")
        self.assertEqual(latest_closed_session(datetime.fromisoformat("2026-11-27T13:15:00-05:00")), "20261127")

    def test_publication_requires_both_revision_and_data_date(self):
        marker = {"revision": "abc", "data_date": "20261014"}
        self.assertTrue(publication_current("20261014", "abc", marker, {"data_date": "20261014"}))
        self.assertFalse(publication_current("20261014", "def", marker, {"data_date": "20261014"}))
        self.assertFalse(publication_current("20261015", "abc", marker, {"data_date": "20261014"}))
        self.assertFalse(publication_current("20261014", "abc", marker, {"data_date": "20261013"}))

    def test_target_caps_request_before_next_session(self):
        with patch.dict(os.environ, {"DASHBOARD_TARGET_DATE": "20261014"}):
            self.assertEqual(build_runtime_config().end_date, "2026-10-15")

    def test_scheduled_skip_and_network_failure_fallback(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / "output"
            with patch.dict(os.environ, {"GITHUB_OUTPUT": str(output), "GITHUB_EVENT_NAME": "schedule", "GITHUB_SHA": "abc"}), \
                    patch.object(update_preflight, "latest_closed_session", return_value="20261014"), \
                    patch.object(update_preflight, "read_published", side_effect=[
                        {"revision": "abc", "data_date": "20261014"}, {"data_date": "20261014"}]):
                update_preflight.main()
                self.assertIn("needed=false", output.read_text())
            output.unlink()
            with patch.dict(os.environ, {"GITHUB_OUTPUT": str(output), "GITHUB_EVENT_NAME": "schedule"}), \
                    patch.object(update_preflight, "latest_closed_session", return_value="20261014"), \
                    patch.object(update_preflight, "read_published", side_effect=OSError("unavailable")):
                update_preflight.main()
                self.assertIn("needed=true", output.read_text())

    def test_manual_run_does_not_skip_existing_publication(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {
            "GITHUB_OUTPUT": str(Path(folder) / "output"), "GITHUB_EVENT_NAME": "workflow_dispatch"
        }), patch.object(update_preflight, "latest_closed_session", return_value="20261014"), \
                patch.object(update_preflight, "read_published") as read:
            update_preflight.main()
            read.assert_not_called()
            self.assertIn("needed=true", (Path(folder) / "output").read_text())

    def test_stale_batch_does_not_export_and_is_retryable(self):
        result = PipelineRunResult({"adjusted": [{"code": "A"}]}, [], "20261013", 1, 0)
        with patch.dict(os.environ, {"DASHBOARD_TARGET_DATE": "20261014"}), \
                patch.object(generate_dashboard, "YFinancePipelineClient") as client, \
                patch.object(generate_dashboard, "write_diagnostics"), \
                patch.object(generate_dashboard, "export_dashboard") as export, \
                patch.object(generate_dashboard, "generate_boxes") as boxes:
            client.return_value.build_adjustment_rows.return_value = result
            with self.assertRaises(generate_dashboard.IncompleteLatestPricesError):
                generate_dashboard.main()
            export.assert_not_called()
            boxes.assert_not_called()

    def test_empty_network_failure_is_fatal_not_classified_as_stale(self):
        result = PipelineRunResult({"adjusted": []}, [{"code": "*", "error": "network unavailable"}], None, 0, 1)
        with patch.dict(os.environ, {"DASHBOARD_TARGET_DATE": "20261014"}), \
                patch.object(generate_dashboard, "YFinancePipelineClient") as client, \
                patch.object(generate_dashboard, "write_diagnostics"), \
                patch.object(generate_dashboard, "export_dashboard") as export:
            client.return_value.build_adjustment_rows.return_value = result
            with self.assertRaisesRegex(RuntimeError, "No valid dashboard rows") as caught:
                generate_dashboard.main()
            self.assertNotIsInstance(caught.exception, generate_dashboard.IncompleteLatestPricesError)
            export.assert_not_called()


class RetryCacheTests(unittest.TestCase):
    def frame(self, symbols, incomplete=None, date="2026-10-14"):
        columns = pd.MultiIndex.from_product([symbols, ["Open", "High", "Low", "Close", "Adj Close", "Volume"]])
        frame = pd.DataFrame([[100, 110, 90, 100, 100, 20] * len(symbols)],
                             index=pd.to_datetime([date]), columns=columns, dtype=float)
        frame.index.name = "Date"
        if incomplete:
            frame.loc[:, (incomplete, "Adj Close")] = float("nan")
        return frame

    def test_retry_only_fetches_incomplete_symbol_and_preserves_prices(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {
            "DASHBOARD_TARGET_DATE": "20261014", "DASHBOARD_RETRY_CACHE": folder
        }):
            client = YFinancePipelineClient(replace(build_runtime_config(), root_dir=Path(folder)))
            with patch.object(client, "fetch_history", return_value=self.frame(["A", "B"], incomplete="B")) as fetch:
                first = client.download_history(["A", "B"])
                fetch.assert_called_once_with(["A", "B"])
                with self.assertRaises(ValueError):
                    extract_symbol_frame(first, "B", True)
            with patch.object(client, "fetch_history", return_value=self.frame(["B"])) as fetch:
                second = client.download_history(["A", "B"])
                fetch.assert_called_once_with(["B"])
                pd.testing.assert_frame_equal(extract_symbol_frame(first, "A", True),
                                              extract_symbol_frame(second, "A", True), check_dtype=False)
            with patch.object(client, "fetch_history") as fetch:
                client.download_history(["A", "B"])
                fetch.assert_not_called()

    def test_old_bars_are_not_cached_as_current(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {
            "DASHBOARD_TARGET_DATE": "20261014", "DASHBOARD_RETRY_CACHE": folder
        }):
            client = YFinancePipelineClient(replace(build_runtime_config(), root_dir=Path(folder)))
            with patch.object(client, "fetch_history", return_value=self.frame(["A"], date="2026-10-13")):
                client.download_history(["A"])
            self.assertEqual(list(Path(folder).glob("*.json")), [])
            with patch.object(client, "fetch_history", return_value=self.frame(["A"])) as fetch:
                client.download_history(["A"])
                fetch.assert_called_once_with(["A"])

    def test_corrupt_cache_falls_back_to_download(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {
            "DASHBOARD_TARGET_DATE": "20261014", "DASHBOARD_RETRY_CACHE": folder
        }):
            client = YFinancePipelineClient(replace(build_runtime_config(), root_dir=Path(folder)))
            with patch.object(client, "fetch_history", return_value=self.frame(["A"])):
                client.download_history(["A"])
            for path in Path(folder).glob("*.json"):
                path.write_text("corrupt", encoding="utf-8")
            with patch.object(client, "fetch_history", return_value=self.frame(["A"])) as fetch:
                client.download_history(["A"])
                fetch.assert_called_once_with(["A"])

    def test_missing_chart_open_does_not_freeze_a_failed_chart(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {
            "DASHBOARD_TARGET_DATE": "20261014", "DASHBOARD_RETRY_CACHE": folder
        }):
            client = YFinancePipelineClient(replace(build_runtime_config(), root_dir=Path(folder)))
            frame = self.frame(["A"])
            frame.loc[:, ("A", "Open")] = float("nan")
            with patch.object(client, "fetch_history", return_value=frame):
                client.download_history(["A"])
            self.assertEqual(list(Path(folder).glob("*.json")), [])

    def test_stale_single_symbol_is_explicit_error(self):
        with patch.dict(os.environ, {"DASHBOARD_TARGET_DATE": "20261014"}):
            client = YFinancePipelineClient(build_runtime_config())
            with self.assertRaisesRegex(ValueError, "Target session 20261014 unavailable"):
                client.build_row(WatchlistItem("A", "A", "A", "stock"),
                                 self.frame(["A"], date="2026-10-13"), "raw")

    def test_all_stale_rows_keep_observed_date_for_retry_diagnostics(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {"DASHBOARD_TARGET_DATE": "20261014"}):
            config = replace(build_runtime_config(), root_dir=Path(folder),
                             watchlist=[WatchlistItem("A", "A", "A", "stock")])
            client = YFinancePipelineClient(config)
            with patch.object(client, "download_history", return_value=self.frame(["A"], date="2026-10-13")):
                result = client.build_adjustment_rows()
            self.assertEqual(result.latest_trade_date, "20261013")
            self.assertEqual(result.successful_stocks, 0)
            self.assertEqual(result.failed_stocks, 1)


if __name__ == "__main__":
    unittest.main()
