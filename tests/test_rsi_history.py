import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from data_pipeline.indicators import build_rsi_history, build_rsi_metrics, wilder_rsi
from data_pipeline.config import load_watchlist


class RsiHistoryTests(unittest.TestCase):
    def test_full_warmup_then_calendar_cutoff(self):
        dates = pd.bdate_range('2022-01-03', '2026-09-18')
        closes = [100 + i * .03 + (i % 19) * 2 for i in range(len(dates))]
        frame = pd.DataFrame({'trade_date': dates.strftime('%Y%m%d'), 'close': closes})
        result = build_rsi_history(frame)
        self.assertTrue(result['complete'])
        self.assertEqual(result['requested_start'], '2024-09-18')
        first_index = next(i for i, day in enumerate(dates) if day >= pd.Timestamp('2024-09-18'))
        self.assertEqual(result['points'][0]['value'], round(wilder_rsi(closes)[first_index], 1))
        self.assertEqual(result['points'][-1]['value'], build_rsi_metrics(frame)['value'])
        self.assertEqual(len(result['points']), len(dates) - first_index)

    def test_short_history_and_no_valid_rsi(self):
        frame = pd.DataFrame({'trade_date': pd.bdate_range('2026-01-01', periods=40).strftime('%Y%m%d'), 'close': range(1, 41)})
        result = build_rsi_history(frame)
        self.assertFalse(result['complete'])
        self.assertEqual(len(result['points']), 26)
        self.assertEqual(build_rsi_history(frame.head(14))['points'], [])
        self.assertEqual(build_rsi_history(frame.head(0))['points'], [])

    def test_csv_business_labels_complete_and_concise(self):
        items = load_watchlist(Path(__file__).resolve().parents[1] / 'scripts' / 'stock_list.csv')
        self.assertTrue(all(0 < len(item.business) <= 16 for item in items))
        self.assertEqual(next(item.business for item in items if item.code == 'CRWV'), 'AI算力云')


if __name__ == '__main__':
    unittest.main()
