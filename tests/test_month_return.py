import unittest
import sys
from pathlib import Path
import pandas as pd
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from data_pipeline.indicators import build_metrics


def metrics(points):
    frame = pd.DataFrame([{'trade_date': day, 'close': close, 'high': close + 1,
                           'low': close - 1} for day, close in points])
    return build_metrics(frame, str(points[-1][0])[:4] + '0101')


class MonthReturnTests(unittest.TestCase):
    def test_includes_first_session_and_uses_last_prior_month_close(self):
        value = metrics([('20261029', 90), ('20261030', 100), ('20261102', 110), ('20261105', 120)])
        self.assertEqual(value['month_return_pct'], 20)
        self.assertEqual(value['today_return_pct'], 9.09)

    def test_month_first_session_and_year_rollover(self):
        self.assertEqual(metrics([('20261231', 80), ('20270104', 100)])['month_return_pct'], 25)

    def test_short_history_does_not_substitute_ipo_first_close(self):
        self.assertIsNone(metrics([('20261102', 100), ('20261105', 120)])['month_return_pct'])

    def test_missing_entire_previous_month_does_not_use_older_month(self):
        self.assertIsNone(metrics([('20260930', 100), ('20261102', 120)])['month_return_pct'])

    def test_modes_use_their_own_prices(self):
        self.assertEqual(metrics([('20261030', 100), ('20261102', 55)])['month_return_pct'], -45)
        self.assertEqual(metrics([('20261030', 50), ('20261102', 55)])['month_return_pct'], 10)

    def test_calendar_month_including_leap_day_and_iso_dates(self):
        self.assertEqual(metrics([('2024-02-29', 100), ('2024-03-01', 110)])['month_return_pct'], 10)


if __name__ == '__main__':
    unittest.main()
