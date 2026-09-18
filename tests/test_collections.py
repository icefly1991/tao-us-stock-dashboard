from __future__ import annotations

import sys
import unittest
from dataclasses import replace
from unittest.mock import Mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from data_pipeline.config import STOCK_LIST_FILE, WatchlistItem, load_watchlist, build_runtime_config
from data_pipeline.summary import build_dashboard_payload
from data_pipeline.yfinance_client import YFinancePipelineClient


class CollectionTests(unittest.TestCase):
    def test_suspended_skipped_but_retained_in_total_and_metadata(self):
        items = load_watchlist(STOCK_LIST_FILE)
        pstg = next(item for item in items if item.code == "PSTG")
        cflt = WatchlistItem("CFLT", "Confluent", "CFLT", "stock", "", "B", "suspended", "已停止交易")
        self.assertEqual(pstg.symbol, "P")
        self.assertEqual(cflt.trading_status, "suspended")
        config = replace(build_runtime_config(), watchlist=[pstg, cflt])
        client = YFinancePipelineClient(config)
        client.download_history = Mock(return_value=None)
        client.build_row = Mock(return_value=({"code": "PSTG", "today_return_pct": 2}, "20260917"))
        result = client.build_adjustment_rows()
        client.download_history.assert_called_once_with(["P"])
        self.assertEqual((result.successful_stocks, result.failed_stocks), (1, 0))
        self.assertEqual(result.errors, [])
        payload = build_dashboard_payload(result.rows_by_adjustment, [], 2, watchlist=[pstg, cflt])
        self.assertEqual(payload["suspended"][0]["code"], "CFLT")
        for mode in ("adjusted", "raw"):
            self.assertEqual(payload["adjustments"][mode]["summary"],
                             {"watchlist_total": 2, "today_up": 1, "today_down": 0})
        client.build_row = Mock(side_effect=ValueError("download unavailable"))
        result = client.build_adjustment_rows()
        self.assertEqual((result.successful_stocks, result.failed_stocks), (0, 1))
        self.assertTrue(all(not rows for rows in result.rows_by_adjustment.values()))
        self.assertEqual({error["code"] for error in result.errors}, {"PSTG"})

    def test_membership_counts_and_original_list_preserved(self):
        items = load_watchlist(STOCK_LIST_FILE)
        original = {item.code for item in items if item.watchlist == "original"}
        expected = set("SMR VIX IMSR NABL HOOD MP ORCL HIMS BITX CRWV IBIT RZLV MCD IREN ATCH CRCL NVDA NKE KLAR MNTN MSFT META RGTI NXH AVGO QQQ ETOR ARKO UAA PG DOGEUSD STUB VOR MSTR GEMI EIKN TTAN DKNG AMD TQQQ APP WBTN FIG".split())
        self.assertEqual(original, expected)
        self.assertNotIn("CFLT", {item.code for item in items})
        self.assertEqual(len(items), 133)
        self.assertEqual(len({item.symbol for item in items}), 133)
        self.assertEqual([sum(item.tier == tier for item in items) for tier in "ABC"], [30, 34, 35])
        self.assertEqual(len(original & {item.code for item in items if item.tier}), 9)

    def test_shared_stock_and_failed_member_counts_in_both_modes(self):
        items = [WatchlistItem("SHARED", "Shared", "SHARED", "stock", "original", "A"),
                 WatchlistItem("MISSING", "Missing", "MISSING", "stock", "", "B")]
        payload = build_dashboard_payload(
            {"adjusted": [{"code": "SHARED", "today_return_pct": 1}],
             "raw": [{"code": "SHARED", "today_return_pct": -1}]},
            [{"code": "MISSING", "error": "no data"}], 2, watchlist=items)
        groups = {item["id"]: item for item in payload["collections"]}
        self.assertEqual(groups["research"]["codes"], ["SHARED", "MISSING"])
        self.assertEqual(groups["research"]["summaries"]["adjusted"],
                         {"watchlist_total": 2, "today_up": 1, "today_down": 0})
        self.assertEqual(groups["A"]["summaries"]["raw"]["today_down"], 1)
        self.assertEqual(groups["B"]["summaries"]["raw"],
                         {"watchlist_total": 1, "today_up": 0, "today_down": 0})
        self.assertEqual(groups["original"]["codes"], ["SHARED"])


if __name__ == "__main__":
    unittest.main()
