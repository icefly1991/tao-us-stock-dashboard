import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from data_pipeline.config import WatchlistItem
from generate_financing_review import build_review, main, unknown_axis
from data_pipeline.indicators import calculate_financing_share_growth


def assessment():
    return {'code': 'TEST', 'symbol': 'TEST', 'level': 'watch', 'completeness': 'partial',
            'reviewed_at': '2026-09-27', 'reason': 'Synthetic evidence, not a real stock',
            'actual': unknown_axis(), 'potential': unknown_axis(),
            'funding': {'summary': '经营消耗依赖融资', 'detail': 'Synthetic finding', 'as_of': '2026-09-01',
                        'sources': [{'title': 'Synthetic source', 'url': 'https://www.sec.gov/'}]}}


class FinancingTests(unittest.TestCase):
    def test_share_growth_preserves_decrease_and_rejects_invalid_denominator(self):
        self.assertAlmostEqual(calculate_financing_share_growth(140, 100), 40)
        self.assertAlmostEqual(calculate_financing_share_growth(90, 100), -10)
        for value in [0, -1, None, True, float('nan'), float('inf')]:
            with self.assertRaises(ValueError): calculate_financing_share_growth(100, value)

    def test_reconciled_shares_and_period_are_exported_without_mutating_source(self):
        row = assessment()
        row['actual'] = copy.deepcopy(row['funding'])
        row['actual']['as_of'] = '2026-06-30'
        row['actual']['comparison'] = {'current_shares': 429701540, 'previous_shares': 284736899,
                                      'current_date': '2026-06-30', 'previous_date': '2025-06-30',
                                      'period': '12月', 'scope': 'Class A plus LLC Class B economic interests'}
        before = copy.deepcopy(row)
        result = self.build(row)['rows'][0]
        self.assertEqual(result['actual']['summary'], '12月股数 +50.9%')
        self.assertEqual(row, before)
        row['actual']['comparison']['previous_date'] = '2026-03-31'
        with self.assertRaises(ValueError): self.build(row)

    def setUp(self):
        self.members = [WatchlistItem('TEST', 'Test', 'TEST', 'stock'),
                        WatchlistItem('MISSING', 'Missing', 'MISSING', 'stock'),
                        WatchlistItem('ETF', 'ETF', 'ETF', 'etf')]

    def build(self, row):
        with patch('generate_financing_review.load_watchlist', return_value=self.members):
            return build_review({'schema_version': 1, 'rows': [row]})

    def test_missing_is_unknown_noncompany_is_not_applicable_and_date_preserved(self):
        rows = self.build(assessment())['rows']
        self.assertEqual(rows[0]['reviewed_at'], '2026-09-27')
        self.assertEqual(rows[1]['level'], 'unknown')
        self.assertIsNone(rows[1]['reviewed_at'])
        self.assertEqual(rows[2]['level'], 'not_applicable')
        self.assertEqual(rows[0]['actual']['summary'], '待核实')

    def test_partial_evidence_cannot_be_clear_or_complete(self):
        for field, value in [('level', 'clear'), ('completeness', 'complete')]:
            row = assessment()
            row[field] = value
            with self.assertRaises(ValueError):
                self.build(row)

    def test_findings_require_source_and_actual_date(self):
        for mutation in ['source', 'date', 'after_review', 'url']:
            row = assessment()
            if mutation == 'source': row['funding']['sources'] = []
            if mutation == 'date': row['funding']['as_of'] = '2026-02-30'
            if mutation == 'after_review': row['funding']['as_of'] = '2026-09-28'
            if mutation == 'url': row['funding']['sources'][0]['url'] = 'javascript:alert(1)'
            with self.subTest(mutation=mutation), self.assertRaises(ValueError):
                self.build(row)

    def test_unknown_cannot_claim_numeric_finding(self):
        row = assessment()
        row['actual']['summary'] = '12月股数+24%'
        with self.assertRaises(ValueError):
            self.build(row)

    def test_identity_duplicate_and_removed_members_rejected(self):
        row = assessment()
        row['symbol'] = 'OTHER'
        with self.assertRaises(ValueError): self.build(row)
        row = assessment()
        row['code'] = 'REMOVED'
        with self.assertRaises(ValueError): self.build(row)
        with patch('generate_financing_review.load_watchlist', return_value=self.members), self.assertRaises(ValueError):
            build_review({'schema_version': 1, 'rows': [assessment(), assessment()]})

    def test_invalid_input_cannot_replace_old_snapshot(self):
        with tempfile.TemporaryDirectory() as temp:
            source = Path(temp) / 'source.json'
            target = Path(temp) / 'snapshot.json'
            bad = copy.deepcopy(assessment())
            bad['level'] = 'clear'
            source.write_text(json.dumps({'schema_version': 1, 'rows': [bad]}), encoding='utf-8')
            target.write_text('old valid snapshot', encoding='utf-8')
            with patch('sys.argv', ['generate', '--source', str(source), '--output', str(target)]), patch('generate_financing_review.load_watchlist', return_value=self.members), self.assertRaises(ValueError):
                main()
            self.assertEqual(target.read_text(encoding='utf-8'), 'old valid snapshot')
