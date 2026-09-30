import sys
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from build_weekly_research import attention, build_weekly


class WeeklyResearchTests(unittest.TestCase):
    def test_form_items_are_review_signals_not_legal_conclusions(self):
        signals = attention([
            {'form': '8-K', 'items': '1.03, 3.01'},
            {'form': '8-K', 'items': '4.02'},
            {'form': '25', 'items': ''},
        ])
        self.assertEqual(len(signals), 4)
        self.assertTrue(all('须核实' in item for item in signals))

    def test_incomplete_scan_never_publishes(self):
        scan = {'errors': [{'code': 'AAA', 'error': 'HTTP 429'}], 'rows': []}
        with self.assertRaisesRegex(ValueError, 'Incomplete SEC scan'):
            build_weekly(scan, {'rows': []}, {'rows': []}, Path('.'))

    def test_unreviewed_filings_remain_visible_after_next_scan(self):
        filing = {'accession': '0001-26-000001', 'form': '8-K', 'items': '3.01', 'filed': '2026-09-28', 'url': 'https://www.sec.gov/test'}
        scan = {'errors': [], 'scanned_at': '2026-10-04T14:00:00Z', 'rows': [{'code': 'AAA', 'status': 'review_needed', 'filings': [filing], 'sic_description': 'Test'}]}
        pool = {'reviewed_at': '2026-09-27', 'rows': []}
        governance = {'reviewed_at': '2026-09-27', 'rows': [{'code': 'AAA'}]}
        previous = {'pool_reviewed_at': '2026-09-27', 'governance_reviewed_at': '2026-09-27', 'pool_rows': [], 'company_rows': [{'code': 'AAA', 'seen_accessions': ['0001-26-000001']}]}
        result = build_weekly(scan, pool, governance, Path('.'), previous)
        self.assertEqual(result['company_rows'][0]['status'], 'new_filings_need_interpretation')
        self.assertEqual(result['company_rows'][0]['new_since_last_scan'], 0)
        self.assertEqual(len(result['company_rows'][0]['filings']), 1)
        self.assertEqual(len(result['company_rows'][0]['attention']), 1)

    def test_older_facts_do_not_become_new_when_manual_snapshot_lacks_fact(self):
        scan = {'errors': [], 'scanned_at': '2026-10-04T14:00:00Z', 'rows': [{'code': 'AAA', 'status': 'no_relevant_filing', 'facts_status': 'available', 'filings': []}]}
        pool = {'reviewed_at': '2026-09-27', 'rows': [{'code': 'AAA', 'facts': {}, 'category': 'turnaround'}]}
        governance = {'reviewed_at': '2026-09-27', 'rows': [{'code': 'AAA'}]}
        previous = {'pool_reviewed_at': '2026-09-27', 'governance_reviewed_at': '2026-09-27', 'pool_rows': [{'code': 'AAA', 'facts_filed_at': '2026-03-31', 'grade': 'unknown', 'highlights': [{'text': 'stale'}]}], 'company_rows': []}
        with patch('build_weekly_research.build_assessment', return_value={'facts': {'cash': {'filed': '2026-03-31'}}}):
            result = build_weekly(scan, pool, governance, Path('.'), previous)
        row = result['pool_rows'][0]
        self.assertEqual(row['status'], 'unchanged')
        self.assertIsNone(row['grade'])
        self.assertEqual(row['highlights'], [])


if __name__ == '__main__':
    unittest.main()
