import copy
import json
import unittest
from pathlib import Path
from research_pool import apply_briefs


class PoolBriefTests(unittest.TestCase):
    def build(self, facts=None, category='clinical', overrides=None):
        row = {'code': 'A', 'category': category, 'facts': facts or {}, 'runway_months': None}
        return apply_briefs({'rows': [row]}, overrides or {'reviewed_at': '2026-09-27', 'overrides': {}}, '2026-09-27')['rows'][0]

    def fact(self, value):
        return {'value': value, 'end': '2026-06-30', 'unit': 'USD', 'url': 'https://www.sec.gov/filing'}

    def test_clinical_revenue_is_not_product_approval_or_profit(self):
        row = self.build({'revenue': self.fact(100), 'net_income': self.fact(-200), 'operating_cash_flow': self.fact(-300)})
        self.assertEqual([p['text'] for p in row['highlights']], ['已有收入基础'])
        self.assertEqual([p['text'] for p in row['risks']], ['报告期亏损', '经营现金净流出'])
        self.assertTrue(all(p['sources'] for p in row['highlights'] + row['risks']))

    def test_missing_evidence_produces_no_fabricated_positive_or_risk(self):
        row = self.build()
        self.assertEqual(row['highlights'], [])
        self.assertEqual(row['risks'], [])

    def test_financial_cash_flows_do_not_imply_operating_cash_burn(self):
        row = self.build({'operating_cash_flow': self.fact(-300)}, 'financial')
        self.assertEqual(row['risks'], [])

    def test_no_cross_currency_or_period_balance_comparison(self):
        for field, value in [('unit', 'EUR'), ('end', '2025-12-31')]:
            liabilities = {**self.fact(200), field: value}
            row = self.build({'current_assets': self.fact(100), 'current_liabilities': liabilities})
            self.assertEqual(row['risks'], [])

    def test_manual_phrase_requires_current_date_and_evidence(self):
        base = {'reviewed_at': '2026-09-27', 'overrides': {'A': {'risks': [{'text': '临床结果待验证', 'method': '原文提炼', 'sources': [{'title': 'Filing', 'url': 'https://www.sec.gov/filing'}]}]}}}
        for kind in ['date', 'member', 'source', 'url', 'long']:
            bad = copy.deepcopy(base)
            if kind == 'date': bad['reviewed_at'] = '2020-01-01'
            if kind == 'member': bad['overrides']['B'] = bad['overrides'].pop('A')
            if kind == 'source': bad['overrides']['A']['risks'][0]['sources'] = []
            if kind == 'url': bad['overrides']['A']['risks'][0]['sources'][0]['url'] = 'javascript:alert(1)'
            if kind == 'long': bad['overrides']['A']['risks'][0]['text'] = 'a' * 25
            with self.assertRaises(ValueError): self.build(overrides=bad)

    def test_published_briefs_are_complete_and_keep_special_cases(self):
        data = json.loads(Path('public/data/pool-review.json').read_text(encoding='utf-8'))
        rows = {r['code']: r for r in data['rows']}
        self.assertEqual(len(rows), 234)
        self.assertTrue(all(1 <= len(r['risks']) <= 3 and len(r['highlights']) <= 3 for r in rows.values()))
        self.assertEqual(rows['HUBG']['highlights'], [])
        self.assertTrue(any('商业化' in p['text'] for p in rows['IMSR']['risks']))
        self.assertTrue(any('融资' in p['text'] for p in rows['GEMI']['risks']))
        self.assertFalse(any('持续经营疑虑' in p['text'] for p in rows['GEMI']['risks']))
