import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from research_valuation_evidence import select_fact  # noqa: E402


def point(value, end='2026-06-30', filed='2026-08-01', start='2026-01-01'):
    result = dict(val=value, end=end, filed=filed, accn='0000000001-26-000001', form='10-Q')
    if start:
        result['start'] = start
    return result


class ValuationEvidenceTests(unittest.TestCase):
    def test_obsolete_first_alias_cannot_hide_current_revenue(self):
        company = {'facts': {'us-gaap': {
            'RevenueFromContractWithCustomerExcludingAssessedTax': {'units': {'USD': [point(10, end='2022-06-30', filed='2022-08-01', start='2022-01-01')]}},
            'Revenues': {'units': {'USD': [point(80)]}},
        }}}
        actual = select_fact(company, 'revenue', '2026-10-01')
        self.assertEqual((actual['val'], actual['tag'], actual['end']), (80, 'Revenues', '2026-06-30'))

    def test_annual_selection_requires_latest_annual_period(self):
        company = {'facts': {'us-gaap': {'NetCashProvidedByUsedInOperatingActivities': {'units': {'USD': [point(10, start='2025-07-01'), point(6)]}}}}}
        self.assertEqual(select_fact(company, 'operating_cash_flow', '2026-10-01', '2026-06-30')['val'], 10)
        self.assertIsNone(select_fact(company, 'operating_cash_flow', '2026-10-01', '2025-06-30'))
        self.assertEqual(select_fact(company, 'operating_cash_flow', '2026-10-01')['val'], 6)

    def test_later_correction_wins_but_future_filings_and_wrong_units_do_not(self):
        company = {'facts': {'us-gaap': {'Revenues': {'units': {
            'USD': [point(10), point(12, filed='2026-09-01'), point(99, filed='2026-10-02'), point(True)],
            'EUR': [point(1000)],
        }}}}}
        self.assertEqual(select_fact(company, 'revenue', '2026-10-01')['val'], 12)

    def test_cash_cannot_use_duration_fact(self):
        company = {'facts': {'us-gaap': {'CashAndCashEquivalentsAtCarryingValue': {'units': {'USD': [point(50), point(7, start=None)]}}}}}
        self.assertEqual(select_fact(company, 'cash', '2026-10-01')['val'], 7)
