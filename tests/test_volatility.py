import unittest
import pandas as pd
from data_pipeline.indicators import build_volatility_metrics


class VolatilityTests(unittest.TestCase):
    def frame(self):
        dates = pd.bdate_range('2026-06-01', '2026-09-25')
        return pd.DataFrame({'trade_date': dates.strftime('%Y%m%d'), 'close': 100., 'high': 101., 'low': 99.})

    def test_calendar_window_and_known_range(self):
        result = build_volatility_metrics(self.frame())
        self.assertEqual(result['value'], 2.)
        self.assertEqual(result['window_start'], '2026-06-25')
        self.assertEqual(result['window_end'], '2026-09-25')
        self.assertEqual(result['sample_count'], len(pd.bdate_range('2026-06-26', '2026-09-25')))

    def test_gap_is_counted_and_dollars_do_not_affect_comparison(self):
        frame = self.frame()
        frame.loc[frame.index[-1], ['close', 'high', 'low']] = [110, 111, 109]
        result = build_volatility_metrics(frame)
        count = result['sample_count']
        self.assertEqual(result['value'], round((2*(count-1)+11)/count, 2))
        frame[['close', 'high', 'low']] *= 10
        self.assertEqual(build_volatility_metrics(frame)['value'], result['value'])

    def test_short_history_or_sparse_window_does_not_fake_three_months(self):
        for frame in [self.frame().tail(50), self.frame().iloc[[0, -1]]]:
            result = build_volatility_metrics(frame)
            self.assertIsNone(result['value'])
            self.assertEqual(result['status'], 'insufficient')

    def test_invalid_bars_are_not_silently_dropped(self):
        for high, low, close in [(90, 99, 100), (101, 99, 102), (101, 0, 100), (float('inf'), 99, 100)]:
            frame = self.frame(); frame.loc[frame.index[-2], ['high', 'low', 'close']] = [high, low, close]
            self.assertEqual(build_volatility_metrics(frame)['status'], 'invalid')

    def test_prices_outside_window_do_not_change_value(self):
        frame = self.frame(); frame.loc[0, 'high'] = 10000
        self.assertEqual(build_volatility_metrics(frame)['value'], 2.)

    def test_month_end_crypto_and_zero_range(self):
        dates = pd.date_range('2026-05-01', '2026-08-31')
        frame = pd.DataFrame({'trade_date': dates.strftime('%Y%m%d'), 'close': 100., 'high': 100., 'low': 100.})
        result = build_volatility_metrics(frame)
        self.assertEqual(result['window_start'], '2026-05-31')
        self.assertEqual(result['sample_count'], 92)
        self.assertEqual(result['value'], 0.)
