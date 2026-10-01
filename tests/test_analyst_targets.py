import csv
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import generate_analyst_targets as targets  # noqa: E402


class AnalystTargetTests(unittest.TestCase):
    def test_refresh_preserves_old_snapshot_if_one_request_fails(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, output = root / "list.csv", root / "targets.json"
            with source.open("w", encoding="utf-8", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=["code", "symbol"])
                writer.writeheader()
                writer.writerows([{"code": "AAA", "symbol": "AAA"}, {"code": "BBB", "symbol": "BBB"}])
            output.write_text('old snapshot', encoding="utf-8")

            def fail_one(item, session=None):
                if item["code"] == "BBB":
                    raise RuntimeError("HTTP 429")
                return {"code": "AAA", "symbol": "AAA", "status": "available", "low": 8, "mean": 10, "high": 12}

            with patch.object(targets, "fetch_target", side_effect=fail_one):
                with self.assertRaisesRegex(RuntimeError, "BBB"):
                    targets.generate(source, output, workers=1)
            self.assertEqual(output.read_text(encoding="utf-8"), "old snapshot")

            def available_or_missing(item, session=None):
                if item["code"] == "AAA":
                    return {"code": "AAA", "symbol": "AAA", "status": "available", "low": 8, "mean": 10, "high": 12}
                return {"code": "BBB", "symbol": "BBB", "status": "unavailable", "low": None, "mean": None, "high": None}

            with patch.object(targets, "fetch_target", side_effect=available_or_missing):
                self.assertEqual(targets.generate(source, output, workers=1), (1, 1))
            data = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual([row["code"] for row in data["rows"]], ["AAA", "BBB"])

    def test_nonpositive_and_nonfinite_values_are_missing(self):
        self.assertIsNone(targets.target_number(0))
        self.assertIsNone(targets.target_number(float("nan")))
        self.assertIsNone(targets.target_number(True))
        self.assertEqual(targets.target_number(10.123456), 10.1235)

    def test_http_failures_are_not_missing_target_prices(self):
        missing = {"quoteSummary": {"error": {"code": "Not Found", "description": "No fundamentals data found for symbol: QQQ"}, "result": None}}
        self.assertEqual(targets.inspect_target_response(404, missing), "unavailable")
        for status in (401, 403, 429, 500):
            self.assertTrue(targets.inspect_target_response(status, missing).startswith("error:"))
        self.assertTrue(targets.inspect_target_response(200, {}).startswith("error:"))
        self.assertEqual(targets.inspect_target_response(200, {"quoteSummary": {"result": [{"financialData": {"currentPrice": 10}}], "error": None}}), "complete")

    def test_swallowed_yfinance_error_cannot_publish_unavailable(self):
        session = SimpleNamespace(evidence={"AAA": "error: HTTP 500"})
        with patch.object(targets.yf, "Ticker") as ticker:
            ticker.return_value.get_analyst_price_targets.return_value = {}
            with self.assertRaisesRegex(ValueError, "HTTP 500"):
                targets.fetch_target({"code": "AAA", "symbol": "AAA"}, session)


if __name__ == "__main__":
    unittest.main()
