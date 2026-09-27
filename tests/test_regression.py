"""Contract boundaries: formulas stay in Python; failures must preserve files."""
from contextlib import redirect_stdout
from dataclasses import replace
from datetime import date, datetime
from io import StringIO
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
from zoneinfo import ZoneInfo

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from data_pipeline.config import build_runtime_config, WatchlistItem
from data_pipeline.exporter import export_dashboard
from data_pipeline.indicators import build_metrics
from data_pipeline.yfinance_client import extract_symbol_frame, YFinancePipelineClient, PipelineRunResult
import generate_dashboard
import retry_dashboard


def frame(count):
    return pd.DataFrame({"trade_date": pd.bdate_range("2025-01-02", periods=count).strftime("%Y%m%d"),
                         "close": [100.] * count, "high": [120.] * count, "low": [80.] * count})


class FormulaBoundaryTests(unittest.TestCase):
    def test_exact_250_and_252_windows(self):
        for count in (249, 250, 251, 252):
            with self.subTest(count=count):
                metrics = build_metrics(frame(count), "20250101")
                self.assertEqual(metrics["distance_ma250_pct"], 0 if count >= 250 else None)
                self.assertEqual(metrics["position_52w_pct"], 50 if count >= 252 else None)

    def test_window_excludes_old_extreme(self):
        data = frame(253)
        data.loc[0, ["high", "low"]] = [1000, 1]
        metrics = build_metrics(data, "20250101")
        self.assertEqual(metrics["position_52w_pct"], 50)
        self.assertEqual(metrics["distance_52w_low_pct"], 25)

    def test_ytd_first_available_session_and_new_year_without_prices(self):
        data = pd.DataFrame({"trade_date": ["20251231", "20260105", "20260106"], "close": [50, 100, 110], "high": [60, 120, 130], "low": [40, 90, 100]})
        self.assertEqual(build_metrics(data, "20260101")["ytd_return_pct"], 10)
        self.assertIsNone(build_metrics(data, "20270101")["ytd_return_pct"])

    def test_constant_range_is_missing_not_zero(self):
        data = frame(252)
        data["high"] = data["low"] = data["close"]
        self.assertIsNone(build_metrics(data, "20250101")["position_52w_pct"])

    def test_duplicate_days_do_not_satisfy_history_threshold(self):
        data = frame(249)
        result = build_metrics(pd.concat([data.iloc[::-1], data.tail(5)]), "20250101")
        self.assertEqual(result["history_days"], 249)
        self.assertIsNone(result["distance_ma250_pct"])

    def test_new_york_dst_and_exclusive_end(self):
        for month, offset in ((1, "-05:00"), (9, "-04:00")):
            now = datetime(2026, month, 26, 22, 30, tzinfo=ZoneInfo("America/New_York"))
            with patch("data_pipeline.config.get_new_york_now", return_value=now):
                config = build_runtime_config()
            self.assertTrue(config.updated_at.endswith(offset))
            self.assertEqual(config.end_date, f"2026-{month:02d}-27")
        self.assertEqual(build_runtime_config(date(2024, 2, 29)).start_date, "2019-02-28")


class ExportRegressionTests(unittest.TestCase):
    def test_round_trip_unicode_and_null(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "data" / "test.json"
            value = {"name": "公司", "missing": None, "zero": 0}
            export_dashboard(path, value)
            self.assertEqual(json.loads(path.read_text(encoding="utf-8")), value)
            self.assertEqual(list(path.parent.glob("*.tmp")), [])

    def test_nonstandard_numbers_never_overwrite_valid_json(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "test.json"
            path.write_text('{"old":true}', encoding="utf-8")
            for invalid in (float("nan"), float("inf"), -float("inf")):
                with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                    export_dashboard(path, {"price": invalid})
                self.assertEqual(path.read_text(), '{"old":true}')

    def test_replace_failure_keeps_old_file_and_cleans_temp(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "test.json"
            path.write_text('{"old":true}', encoding="utf-8")
            with patch("data_pipeline.exporter.os.replace", side_effect=OSError("disk unavailable")), self.assertRaises(OSError):
                export_dashboard(path, {"new": True})
            self.assertEqual(path.read_text(), '{"old":true}')
            self.assertEqual(list(path.parent.glob("*.tmp")), [])


class PipelineRegressionTests(unittest.TestCase):
    def test_yahoo_reversed_multiindex_layout(self):
        data = pd.DataFrame([[100, 120, 80, 50], [110, 130, 90, 55]],
                            index=pd.to_datetime(["2026-09-24", "2026-09-25"]),
                            columns=pd.MultiIndex.from_product([["Close", "High", "Low", "Adj Close"], ["AAA"]]))
        data.index.name = "Date"
        result = extract_symbol_frame(data, "AAA", True)
        self.assertEqual(result["close"].tolist(), [50, 55])
        self.assertEqual(result["high"].tolist(), [60, 65])

    def test_all_empty_download_retries_are_bounded(self):
        client = YFinancePipelineClient(build_runtime_config())
        with patch("data_pipeline.yfinance_client.yf.download", return_value=pd.DataFrame()) as download, patch("data_pipeline.yfinance_client.time.sleep") as sleep:
            with self.assertRaisesRegex(RuntimeError, "three attempts"):
                client.download_history(["AAA"])
            self.assertEqual(download.call_count, 3)
            self.assertEqual([call.args[0] for call in sleep.call_args_list], [15, 45])

    def test_partial_failure_keeps_other_symbol_and_does_not_imply_suspended(self):
        data = pd.DataFrame([[100, 120, 80, 50], [110, 130, 90, 55]], index=pd.to_datetime(["2026-09-24", "2026-09-25"]),
                            columns=pd.MultiIndex.from_product([["AAA"], ["Close", "High", "Low", "Adj Close"]]))
        data.index.name = "Date"
        config = replace(build_runtime_config(), watchlist=[WatchlistItem("AAA", "Alpha", "AAA", "stock"), WatchlistItem("MISSING", "Missing", "MISSING", "stock")])
        client = YFinancePipelineClient(config)
        with patch.object(client, "download_history", return_value=data):
            result = client.build_adjustment_rows()
        self.assertEqual((result.successful_stocks, result.failed_stocks), (1, 1))
        self.assertEqual([row["code"] for row in result.rows_by_adjustment["adjusted"]], ["AAA"])
        self.assertEqual(result.incomplete_latest_errors, [])

    def test_zero_success_never_exports_and_keeps_previous(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "dashboard.json"
            path.write_text('{"old":true}')
            config = replace(build_runtime_config(), output_json_file=path)
            with patch.object(generate_dashboard, "build_runtime_config", return_value=config), patch.object(generate_dashboard, "YFinancePipelineClient") as client, patch.object(generate_dashboard, "write_diagnostics"), patch.object(generate_dashboard, "export_dashboard") as export, redirect_stdout(StringIO()):
                client.return_value.build_adjustment_rows.return_value = PipelineRunResult({"adjusted": [], "raw": []}, [], None, 0, 133)
                with self.assertRaisesRegex(RuntimeError, "No valid dashboard"):
                    generate_dashboard.main()
                export.assert_not_called()
            self.assertEqual(path.read_text(), '{"old":true}')

    def test_retry_does_not_archive_previous_report_as_new_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            diagnostics = root / ".cache" / "pipeline-diagnostics"
            diagnostics.mkdir(parents=True)
            (diagnostics / "report.json").write_text('old evidence')
            with patch.object(retry_dashboard.subprocess, "run", return_value=Mock(returncode=1)), patch.object(retry_dashboard, "note"):
                self.assertEqual(retry_dashboard.run_with_retries(root=root), 1)
            self.assertFalse((diagnostics / "attempt-01" / "report.json").exists())
