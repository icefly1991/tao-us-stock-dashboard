import sys
import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from data_pipeline.config import load_watchlist, build_runtime_config, WatchlistItem
from data_pipeline.yfinance_client import YFinancePipelineClient
from data_pipeline.summary import build_dashboard_payload
from data_pipeline.sector_etf import load_sector_etf_review, valid_holding, sector_etf_holding, validate_sector_etf_assignments


class SectorEtfTests(unittest.TestCase):
    def test_verified_scope_and_noncompany_exclusion(self):
        items = load_watchlist(Path('scripts/stock_list.csv'))
        companies = [r for r in items if r.asset_type == 'stock' and (r.watchlist == 'original' or r.tier)]
        self.assertEqual(len(companies), 129)
        self.assertEqual(sum(bool(r.sector_etf) for r in companies), 120)
        self.assertEqual(next(r.sector_etf for r in items if r.code == 'SMR'), 'URA')
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
        suspended = WatchlistItem('META', 'Meta', 'META', 'stock', trading_status='suspended', sector_etf='XLC')
        data = build_dashboard_payload({'adjusted': [], 'raw': []}, [], 1, watchlist=[suspended])
        self.assertEqual(data['suspended'][0]['sector_etf_holding']['holding_symbol'], 'META')

    def test_all_displayed_assignments_have_exact_official_extracted_record(self):
        items = load_watchlist(Path('scripts/stock_list.csv'))
        self.assertEqual(validate_sector_etf_assignments(items), {'companies': 129, 'verified': 120, 'unverified': 9})
        audit = json.loads(Path('docs/reviews/2026-11-06-etf-holdings-evidence.json').read_text(encoding='utf-8'))
        extracted = {r['code']: r for r in audit['verified_records']}
        for row in load_sector_etf_review()['rows']:
            if row['status'] == 'verified':
                h = sector_etf_holding(row['code'], row['symbol'], row['etf'])
                self.assertEqual(h, extracted[row['code']]['holding'])
                self.assertEqual(extracted[row['code']]['source_sha256'], load_sector_etf_review()['funds'][row['etf']]['sha256'])
                raw = extracted[row['code']]['issuer_row']
                ticker = next(raw[k] for k in ['Ticker', 'ticker', 'Identifier', 'Symbol'] if k in raw)
                self.assertEqual(ticker.split(' ')[0], row['symbol'])
                shares = next(raw[k] for k in ['Shares Held', 'Shares', 'shares', 'Shares / Quantity', 'Quantity', 'Shares/Contracts'] if k in raw)
                weight = next(raw[k] for k in ['Weight', 'Weight (%)', 'netAssets', 'weight (%)', 'Weighting', 'ETF Weight', 'Market Weight'] if k in raw)
                self.assertEqual(float(re.sub(r'[^0-9.\-]', '', shares)), h['shares'])
                self.assertEqual(float(re.sub(r'[^0-9.\-]', '', weight)), h['weight_pct'])
            else:
                self.assertEqual(row['etf'], '')
                self.assertIsNone(row['holding'])

    def test_evidence_rejects_wrong_stock_fund_derivative_zero_and_third_party(self):
        original = sector_etf_holding('SMR', 'SMR', 'URA')
        mutations = {'holding_symbol': 'SMR.WS', 'etf': 'XLI', 'position_type': 'swap', 'shares': 0, 'weight_pct': 0, 'source': 'https://www.globalxetfs.com.evil.example/funds/ura', 'as_of': '2026-11-07', 'holding_name': ''}
        for key, value in mutations.items():
            h = {**original, key: value}
            with self.subTest(key=key), self.assertRaises(ValueError):
                valid_holding(h, 'SMR', 'URA')

    def test_alias_uses_query_symbol_and_not_old_display_ticker(self):
        h = sector_etf_holding('PSTG', 'P', 'XLK')
        self.assertEqual(h['holding_symbol'], 'P')
        with self.assertRaises(ValueError):
            sector_etf_holding('PSTG', 'PSTG', 'XLK')
        with self.assertRaises(ValueError):
            sector_etf_holding('SMR', 'SMR', 'XLI')

    def test_csv_cannot_restore_an_unsupported_sector_proxy(self):
        items = load_watchlist(Path('scripts/stock_list.csv'))
        from dataclasses import replace
        changed = [replace(i, sector_etf='XLK') if i.code == 'RZLV' else i for i in items]
        with self.assertRaises(ValueError):
            validate_sector_etf_assignments(changed)
