import copy
from dataclasses import replace
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch, Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from data_pipeline.config import build_runtime_config
from data_pipeline.diagnostics import DiagnosticSession, inspect_chart, write_diagnostics
from data_pipeline.yfinance_client import PipelineRunResult
from curl_cffi import requests


def response_payload():
    return {"chart": {"error": None, "result": [{
        "meta": {"exchangeTimezoneName": "America/New_York", "regularMarketTime": 1790020800, "regularMarketPrice": 227.38},
        "timestamp": [1789738200, 1789997400],
        "indicators": {"quote": [{"open": [220, 222.94], "high": [224, 228.5],
                                  "low": [219, 221.56], "close": [222.27, None], "volume": [100, 200]}],
                       "adjclose": [{"adjclose": [222.27, None]}]}}]}}


class DiagnosticsTests(unittest.TestCase):
    def test_raw_nulls_despite_quote_are_confirmed_without_guessing_internal_cause(self):
        result = inspect_chart(200, response_payload())
        self.assertEqual(result["category"], "incomplete_daily")
        self.assertEqual(result["session"], "2026-09-21")
        self.assertEqual(result["last_usable"], "2026-09-18")
        self.assertEqual(result["missing"], ["close", "adjclose"])
        self.assertEqual(result["market_quote_price"], 227.38)
        self.assertIsNone(result["latest_bar"]["close"])
        self.assertIn("未提供", result["internal_cause"])

    def test_http_and_api_failures_are_separate_from_missing_prices(self):
        for status, expected in [(429, "rate_limited"), (401, "access_denied"),
                                 (403, "access_denied"), (502, "server_error"), (404, "http_error")]:
            self.assertEqual(inspect_chart(status, {})["category"], expected)
        self.assertEqual(inspect_chart(200, {"chart": {"error": {"code": "Not Found"}}})["category"], "api_error")
        self.assertEqual(inspect_chart(200, {"chart": {"result": None}})["category"], "empty_response")

    def test_recovered_daily_response_is_not_reported_as_upstream_failure(self):
        payload = response_payload()
        indicators = payload["chart"]["result"][0]["indicators"]
        indicators["quote"][0]["close"][-1] = 227.38
        indicators["adjclose"][0]["adjclose"][-1] = 227.38
        result = inspect_chart(200, payload)
        self.assertEqual(result["category"], "complete")
        self.assertEqual(result["last_usable"], "2026-09-21")
        self.assertEqual(result["missing"], [])
        self.assertIsNone(result["internal_cause"])

    def test_session_observes_without_mutation_or_saving_query_secrets(self):
        payload = response_payload()
        original = copy.deepcopy(payload)
        response = Mock(status_code=200)
        response.json.return_value = payload
        with DiagnosticSession() as session, patch.object(requests.Session, "get", return_value=response) as get:
            returned = session.get("https://query2.finance.yahoo.com/v8/finance/chart/NVDA?crumb=SECRET", params={"interval": "1d", "crumb": "SECRET"})
            self.assertIs(returned, response)
            get.assert_called_once()
            self.assertNotIn("SECRET", json.dumps(session.evidence))
            self.assertEqual(session.evidence["NVDA"]["category"], "incomplete_daily")
        self.assertEqual(payload, original)

    def test_timeout_preserves_exception_and_malformed_json_does_not_break_request(self):
        with DiagnosticSession() as session:
            with patch.object(requests.Session, "get", side_effect=requests.exceptions.Timeout("timeout")):
                with self.assertRaises(requests.exceptions.Timeout):
                    session.get("https://query1.finance.yahoo.com/v8/finance/chart/NVDA", params={"interval": "1d"})
            self.assertEqual(session.evidence["NVDA"]["category"], "timeout")
            response = Mock(status_code=200)
            response.json.side_effect = ValueError("HTML error page")
            with patch.object(requests.Session, "get", return_value=response):
                self.assertIs(session.get("https://query1.finance.yahoo.com/v8/finance/chart/NVDA", params={"interval": "1d"}), response)
            self.assertEqual(session.evidence["NVDA"]["category"], "invalid_response")

    def test_summary_and_json_preserve_evidence_and_unknowns(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            config = replace(build_runtime_config(), root_dir=root)
            result = PipelineRunResult({}, [{"code": "NVDA"}, {"code": "MSFT"}], None, 0, 2,
                                       incomplete_latest_errors=[{"code": "NVDA"}])
            summary_path = root / "github-summary.md"
            with patch.dict(os.environ, {"GITHUB_STEP_SUMMARY": str(summary_path)}):
                write_diagnostics(config, result, {"NVDA": inspect_chart(200, response_payload())})
            summary = summary_path.read_text(encoding="utf-8")
            self.assertIn("部署已阻止", summary)
            self.assertIn("原始响应已确认", summary)
            self.assertIn("上游原因未确认", summary)
            report = json.loads((root / ".cache/pipeline-diagnostics/report.json").read_text(encoding="utf-8"))
            self.assertEqual(report["failure_categories"], {"incomplete_daily": 1, "unknown": 1})


if __name__ == "__main__":
    unittest.main()
