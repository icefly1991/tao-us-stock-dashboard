import copy
import json
import unittest
from pathlib import Path
from research_pool import apply_categories, apply_review
from data_pipeline.config import load_watchlist


class PoolCategoryTests(unittest.TestCase):
    def payload(self):
        return {'schema_version': 1, 'rows': [{'code': 'A', 'grade': 'watch', 'facts': {},
                'sources': [{'title': 'Filing', 'url': 'https://www.sec.gov/test'}],
                'review_method': '原文专项核查', 'runway_months': 4}]}

    def categories(self, kind='clinical'):
        return {'reviewed_at': '2026-09-27', 'overrides': {'A': {
            'category': kind, 'category_reason': 'Primary source business model',
            'category_method': '原文经营类型核查',
            'category_sources': [{'title': 'Filing', 'url': 'https://www.sec.gov/test'}]}}}

    def test_clinical_type_does_not_override_liquidity_grade(self):
        for grade in ['watch', 'pressure']:
            data = self.payload(); data['rows'][0]['grade'] = grade
            result = apply_categories(data, self.categories(), '2026-09-27')
            self.assertEqual(result['schema_version'], 2)
            self.assertEqual(result['rows'][0]['grade'], grade)
            self.assertEqual(result['rows'][0]['category'], 'clinical')

    def test_special_sectors_disable_industrial_cash_runway(self):
        for kind in ['financial', 'digital_assets', 'disclosure_risk']:
            result = apply_categories(self.payload(), self.categories(kind), '2026-09-27')
            self.assertIsNone(result['rows'][0]['runway_months'])

    def test_manual_type_requires_current_date_member_and_primary_evidence(self):
        variants = []
        data = self.categories(); data['reviewed_at'] = '2026-09-26'; variants.append(data)
        data = self.categories(); data['overrides']['B'] = data['overrides'].pop('A'); variants.append(data)
        for field, value in [('category', 'constructor'), ('category_reason', ''), ('category_sources', []),
                             ('category_sources', [{'url': 'javascript:alert(1)'}])]:
            data = self.categories(); data['overrides']['A'][field] = value; variants.append(data)
        for data in variants:
            with self.subTest(data=data), self.assertRaises(ValueError):
                apply_categories(self.payload(), data, '2026-09-27')

    def test_default_screen_never_asserts_financing_dependence(self):
        for grade, kind in [('supported', 'operating'), ('watch', 'turnaround'), ('pressure', 'turnaround'), ('unknown', 'unresolved')]:
            data = self.payload(); data['rows'][0]['grade'] = grade
            result = apply_categories(data, {'reviewed_at': '2026-09-27', 'overrides': {}}, '2026-09-27')
            self.assertEqual(result['rows'][0]['category'], kind)

    def test_supplement_replaces_stale_facts_and_missing_field_tags(self):
        row = self.payload()['rows'][0] | {'tags': ['财报字段待补'], 'facts': {'cash': {'value': 99}}}
        override = {'reviewed_at': '2026-09-27', 'overrides': {'A': {
            'grade': 'watch', 'tags': ['原文已核查'], 'replace_tags': True,
            'facts': {'cash': None}, 'sources': row['sources']}}}
        result = apply_review([copy.deepcopy(row)], {'accepted_codes': ['A'], 'excluded': [], 'captured_at': '2026-09-27'}, override, '2026-09-27')['rows'][0]
        self.assertEqual(result['tags'], ['原文已核查'])
        self.assertIsNone(result['facts']['cash'])
        self.assertNotIn('replace_tags', result)

    def test_checked_in_examples_distinguish_precommercial_financing_and_approved_drug(self):
        root = Path(__file__).resolve().parents[1]
        data = json.loads((root / 'public/data/pool-review.json').read_text(encoding='utf-8'))
        rows = {row['code']: row for row in data['rows']}
        self.assertEqual(rows['IMSR']['category'], 'precommercial')
        self.assertEqual(rows['GEMI']['category'], 'funded_loss')
        self.assertEqual(rows['AURA']['category'], 'clinical')
        self.assertEqual(rows['DNLI']['category'], 'commercial_medical')
        self.assertEqual(rows['RCKT']['category'], 'commercial_medical')
        self.assertEqual(rows['HUBG']['category'], 'disclosure_risk')
        self.assertTrue(rows['HUBG']['evidence_gap'])
        self.assertTrue(all(row['category_sources'] for row in rows.values()))
        members = {item.code: item for item in load_watchlist(root / 'scripts/stock_list.csv') if item.pool}
        self.assertEqual(set(rows), set(members))
        self.assertTrue(all(row['business'] == members[code].business for code, row in rows.items()))
        # Sector funds are not counted as unrestricted corporate cash.
        self.assertEqual(rows['GEMI']['facts']['cash']['value'], 188618000)
        self.assertEqual(rows['LAES']['facts']['cash']['value'], 479797000)
        self.assertIsNone(rows['DXYZ']['runway_months'])
        self.assertTrue(all(v is None for v in rows['HUBG']['facts'].values()))
