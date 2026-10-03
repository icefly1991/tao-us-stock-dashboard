import copy
import json
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from data_pipeline.config import WatchlistItem  # noqa: E402
from data_pipeline.indicators import calculate_scenario_value, calculate_scenario_gap  # noqa: E402
from generate_valuation_scenarios import build_snapshot, generate  # noqa: E402


def case(flow=10):
    return {"model": "enterprise_dcf", "inputs": {"fcff": [flow], "discount_rate": .1, "terminal_growth": 0,
            "cash_and_nonoperating_assets": 0, "debt_and_other_claims": 0, "diluted_shares": 10},
            "assumptions": {key: "Synthetic test assumption" for key in ("business", "valuation", "financing", "dilution", "failure_case")},
            "sources": [{"title": "Test source", "url": "https://www.sec.gov/"}]}


def sample():
    return {"schema_version": 1, "basis": "present_value", "rows": [{"code": "TEST", "symbol": "TEST", "currency": "USD",
            "valued_at": "2026-10-01", "evidence_date": "2026-09-01", "reason": "Synthetic fixture, not a real security valuation",
            "scenarios": {"optimistic": case(20), "conservative": case(10), "stress": case(5)}}]}


class ValuationTests(unittest.TestCase):
    def test_corrupt_research_narratives_are_rejected(self):
        members = [WatchlistItem("TEST", "Synthetic", "TEST", "stock")]
        for damaged in ("???", "\ufffd"):
            for field in ("reason", "financing"):
                data = sample()
                if field == "reason":
                    data["rows"][0][field] = damaged
                else:
                    data["rows"][0]["scenarios"]["stress"]["assumptions"][field] = damaged
                with self.assertRaisesRegex(ValueError, "Corrupt valuation narrative"):
                    build_snapshot(data, members, date(2026, 10, 1))

    def test_equity_dcf_retains_negative_recapitalization_and_extra_claims(self):
        inputs = {"fcfe": [100, -50, 100], "discount_rate": .1, "terminal_growth": 0,
                  "excess_equity_assets": 20, "additional_common_claims": 30, "diluted_shares": 10}
        self.assertEqual(calculate_scenario_value("equity_dcf", inputs), 86.6033)
        inputs["diluted_shares"] = 20
        self.assertEqual(calculate_scenario_value("equity_dcf", inputs), 43.3017)
        with self.assertRaises(ValueError):
            calculate_scenario_value("equity_dcf", {**inputs, "customer_cash": 10000})

    def test_equity_dcf_snapshot_and_duration_gate(self):
        data = sample()
        for scenario in data["rows"][0]["scenarios"].values():
            scenario["model"] = "equity_dcf"
            values = scenario["inputs"]
            values["fcfe"] = values.pop("fcff")
            values["excess_equity_assets"] = values.pop("cash_and_nonoperating_assets")
            values["additional_common_claims"] = values.pop("debt_and_other_claims")
        members = [WatchlistItem("TEST", "Synthetic", "TEST", "stock")]
        self.assertEqual(build_snapshot(data, members, date(2026, 10, 1))["coverage"]["available"], 1)
        data["rows"][0]["scenarios"]["optimistic"]["inputs"]["fcfe"].append(20)
        with self.assertRaises(ValueError):
            build_snapshot(data, members, date(2026, 10, 1))

    def test_dcf_enterprise_to_equity_and_dilution(self):
        inputs = case()["inputs"]
        self.assertEqual(calculate_scenario_value("enterprise_dcf", inputs), 10)
        inputs.update(cash_and_nonoperating_assets=20, debt_and_other_claims=30)
        self.assertEqual(calculate_scenario_value("enterprise_dcf", inputs), 9)
        inputs["diluted_shares"] = 20
        self.assertEqual(calculate_scenario_value("enterprise_dcf", inputs), 4.5)

    def test_recovery_accounts_for_priority_cost_time_and_zero(self):
        inputs = {"recoverable_assets": 120, "senior_claims": 50, "recovery_costs": 10, "current_common_shares": 10, "existing_common_entitlement": 1, "years_to_recovery": 1, "discount_rate": .2}
        self.assertEqual(calculate_scenario_value("asset_recovery", inputs), 5)
        inputs["existing_common_entitlement"] = 0
        self.assertEqual(calculate_scenario_value("asset_recovery", inputs), 0)
        inputs["existing_common_entitlement"] = 1
        inputs["senior_claims"] = 200
        self.assertEqual(calculate_scenario_value("asset_recovery", inputs), 0)

    def test_invalid_terminal_or_forecast_rejected(self):
        for change in [{"terminal_growth": .1}, {"fcff": [float("nan")]}, {"diluted_shares": 0}, {"fcff": [-1]}, {"discount_rate": True}]:
            inputs = {**case()["inputs"], **change}
            with self.assertRaises(ValueError):
                calculate_scenario_value("enterprise_dcf", inputs)

    def test_csv_coverage_does_not_invent_missing_values(self):
        members = [WatchlistItem("TEST", "Synthetic", "TEST", "stock"), WatchlistItem("OTHER", "Other", "OTHER", "stock"), WatchlistItem("INDEX", "Index", "^INDEX", "index")]
        payload = build_snapshot(sample(), members, date(2026, 10, 1))
        self.assertEqual(payload["coverage"], {"available": 1, "pending": 1, "not_applicable": 1})
        self.assertIsNone(payload["rows"][1]["valued_at"])
        self.assertIsNone(payload["rows"][1]["scenarios"])
        self.assertEqual(payload["rows"][0]["scenarios"]["conservative"]["value"], 10)

    def test_evidence_identity_and_scenario_order_are_required(self):
        members = [WatchlistItem("TEST", "Synthetic", "TEST", "stock")]
        variants = []
        for mutation in ("sources", "dilution", "ordering", "symbol", "date", "duration"):
            data = copy.deepcopy(sample())
            entry = data["rows"][0]
            if mutation == "sources": entry["scenarios"]["stress"]["sources"] = []
            if mutation == "dilution": del entry["scenarios"]["conservative"]["assumptions"]["dilution"]
            if mutation == "ordering": entry["scenarios"]["stress"]["inputs"]["fcff"] = [30]
            if mutation == "symbol": entry["symbol"] = "WRONG"
            if mutation == "date": entry["evidence_date"] = "2026-10-02"
            if mutation == "duration": entry["scenarios"]["optimistic"]["inputs"]["fcff"] = [20, 20]
            variants.append(data)
        for data in variants:
            with self.assertRaises(ValueError): build_snapshot(data, members, date(2026, 10, 1))

    def test_invalid_research_preserves_snapshot(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, output, members = root / "input.json", root / "output.json", root / "members.csv"
            source.write_text(json.dumps({"schema_version": 99, "basis": "present_value", "rows": []}))
            output.write_text("old valid snapshot")
            members.write_text("code,name,symbol,asset_type,watchlist\nTEST,Synthetic,TEST,stock,original\n")
            with self.assertRaises(ValueError): generate(source, output, members)
            self.assertEqual(output.read_text(), "old valid snapshot")

    def test_full_coverage_release_gate_preserves_existing_output(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, output, members = root / "input.json", root / "output.json", root / "members.csv"
            source.write_text(json.dumps(sample()))
            output.write_text("old valid snapshot")
            members.write_text("code,name,symbol,asset_type,watchlist\nTEST,Synthetic,TEST,stock,original\nOTHER,Missing,OTHER,stock,original\n")
            with self.assertRaisesRegex(ValueError, "1 company stocks still pending: OTHER"):
                generate(source, output, members, require_complete=True)
            self.assertEqual(output.read_text(), "old valid snapshot")


if __name__ == "__main__":
    unittest.main()


class ScenarioComparisonTests(unittest.TestCase):
    def test_price_gaps_and_zero_equity(self):
        self.assertAlmostEqual(calculate_scenario_gap(18, 10), 80)
        self.assertAlmostEqual(calculate_scenario_gap(10, 10), 0)
        self.assertAlmostEqual(calculate_scenario_gap(0, 10), -100)
        for value, close in [(1, 0), (-1, 10), (float('nan'), 10), (1, float('inf')), (True, 10)]:
            with self.assertRaises(ValueError):
                calculate_scenario_gap(value, close)


class AnalystComparisonTests(unittest.TestCase):
    def test_mean_comparison_uses_raw_close_and_verified_symbol(self):
        from generate_dashboard import add_analyst_comparisons
        payload = {'adjustments': {'raw': {'rows': [{'code': 'AAA', 'symbol': 'AAA', 'close': 100}]}}}
        target = {'code': 'AAA', 'symbol': 'AAA', 'status': 'available', 'mean': 120}
        add_analyst_comparisons(payload, {'rows': [target]})
        self.assertAlmostEqual(payload['adjustments']['raw']['rows'][0]['analyst_comparison']['gap_pct'], 20)
        payload['adjustments']['raw']['rows'][0].pop('analyst_comparison')
        target['symbol'] = 'OTHER'
        add_analyst_comparisons(payload, {'rows': [target]})
        self.assertNotIn('analyst_comparison', payload['adjustments']['raw']['rows'][0])
