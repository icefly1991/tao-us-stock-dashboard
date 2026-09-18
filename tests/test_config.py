from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from data_pipeline.config import load_watchlist  # noqa: E402


class WatchlistTests(unittest.TestCase):
    def write_csv(self, content: str) -> Path:
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        path = Path(directory.name) / "stocks.csv"
        path.write_text(content, encoding="utf-8")
        return path

    def test_loads_special_symbol_mapping(self) -> None:
        path = self.write_csv(
            "code,name,symbol,asset_type\n"
            "VIX,CBOE Volatility Index,^VIX,index\n"
            "DOGEUSD,Dogecoin,DOGE-USD,crypto\n"
        )

        items = load_watchlist(path)

        self.assertEqual(items[0].code, "VIX")
        self.assertEqual(items[0].symbol, "^VIX")
        self.assertEqual(items[1].symbol, "DOGE-USD")

    def test_rejects_duplicate_display_codes(self) -> None:
        path = self.write_csv(
            "code,name,symbol,asset_type\n"
            "QQQ,One,QQQ,etf\n"
            "QQQ,Two,QQQ,etf\n"
        )

        with self.assertRaisesRegex(RuntimeError, "Duplicate"):
            load_watchlist(path)

    def test_rejects_unknown_asset_type(self) -> None:
        path = self.write_csv("code,name,symbol,asset_type\nTEST,Test,TEST,future\n")

        with self.assertRaisesRegex(RuntimeError, "Unsupported"):
            load_watchlist(path)

    def test_rejects_invalid_membership(self) -> None:
        for membership in (",D", ",", "unknown,A"):
            path = self.write_csv("code,name,symbol,asset_type,watchlist,tier\nTEST,Test,TEST,stock," + membership + "\n")
            with self.assertRaisesRegex(RuntimeError, "membership"):
                load_watchlist(path)


if __name__ == "__main__":
    unittest.main()
