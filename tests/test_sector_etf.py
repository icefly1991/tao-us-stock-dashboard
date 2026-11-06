import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from data_pipeline.config import load_watchlist, build_runtime_config, WatchlistItem
from data_pipeline.yfinance_client import YFinancePipelineClient
from data_pipeline.summary import build_dashboard_payload


class SectorEtfTests(unittest.TestCase):
    def test_verified_scope_and_noncompany_exclusion(self):
        items = load_watchlist(Path('scripts/stock_list.csv'))
        companies = [r for r in items if r.asset_type == 'stock' and (r.watchlist == 'original' or r.tier)]
        self.assertEqual(len(companies), 129)
        self.assertTrue(all(r.sector_etf for r in companies))
        self.assertEqual(next(r.sector_etf for r in items if r.code == 'META'), 'XLC')
        self.assertEqual(next(r.sector_etf for r in items if r.code == 'NVDA'), 'XLK')
        self.assertTrue(all(not r.sector_etf for r in items if r.asset_type != 'stock'))

    def test_old_csv_and_invalid_sector(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'stocks.csv'
            path.write_text('code,name\nX,Example\n', encoding='utf-8')
            self.assertEqual(load_watchlist(path)[0].sector_etf, '')
            for kind, fund in [('stock', 'FAKE'), ('etf', 'XLK'), ('crypto', 'XLF')]:
                path.write_text(f'code,name,asset_type,sector_etf\nX,Example,{kind},{fund}\n', encoding='utf-8')
                with self.assertRaisesRegex(RuntimeError, 'Invalid sector ETF'):
                    load_watchlist(path)

    def test_same_identity_metadata_survives_modes_and_suspension(self):
        client = YFinancePipelineClient(build_runtime_config())
        frame = pd.DataFrame({'trade_date': ['20261030', '20261105'], 'close': [100, 110], 'high': [101, 111], 'low': [99, 109]})
        import data_pipeline.yfinance_client as module
        from unittest.mock import patch
        item = WatchlistItem('META', 'Meta', 'META', 'stock', sector_etf='XLC')
        with patch.object(module, 'extract_symbol_frame', Mock(return_value=frame)):
            for mode in ['adjusted', 'raw']:
                row, _ = client.build_row(item, pd.DataFrame(), mode)
                self.assertEqual(row['sector_etf'], 'XLC')
        suspended = WatchlistItem('X', 'Example', 'X', 'stock', trading_status='suspended', sector_etf='XLV')
        data = build_dashboard_payload({'adjusted': [], 'raw': []}, [], 1, watchlist=[suspended])
        self.assertEqual(data['suspended'][0]['sector_etf'], 'XLV')
