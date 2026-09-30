import copy
import json
import unittest
from pathlib import Path
from research_governance import build_governance, distress_summary


class GovernanceTests(unittest.TestCase):
    def setUp(self):
        self.coverage = json.loads(Path('docs/reviews/2026-09-27-governance-coverage.json').read_text(encoding='utf-8'))
        self.events = json.loads(Path('scripts/governance_events.json').read_text(encoding='utf-8'))
        self.members = {r['code'] for r in self.coverage['rows']}

    def test_evidence_required_no_keyword_only_accusations(self):
        for error in ['date', 'member', 'source', 'duplicate_source', 'future', 'taxonomy']:
            events = copy.deepcopy(self.events)
            event = events['overrides']['SMCI'][0]
            if error == 'date': events['reviewed_at'] = '2020-01-01'
            if error == 'member': events['overrides']['MISSING'] = [event]
            if error == 'source': event['sources'] = []
            if error == 'duplicate_source': event['sources'] += [event['sources'][0]]
            if error == 'future': event['disclosed_at'] = '2099-01-01'
            if error == 'taxonomy': event['legal_status'] = 'guilty_by_keyword'
            with self.assertRaises(ValueError): build_governance(self.coverage, events, self.members)

    def test_complete_unique_coverage(self):
        for coverage in [{**self.coverage, 'rows': self.coverage['rows'][:-1]}, {**self.coverage, 'rows': self.coverage['rows']+[self.coverage['rows'][0]]}]:
            with self.assertRaises(ValueError): build_governance(coverage, self.events, self.members)

    def test_person_company_and_resolved_events_stay_distinct(self):
        result = build_governance(self.coverage, self.events, self.members)
        rows = {r['code']: r for r in result['rows']}
        criminal = next(e for e in rows['SMCI']['events'] if e['kind'] == 'management')
        self.assertEqual(criminal['legal_status'], 'charged')
        self.assertIn('公司不是', criminal['detail'])
        self.assertIn('内部调查结论不替代司法结论', criminal['detail'])
        historical = next(e for e in rows['CVNA']['events'] if e['kind'] == 'controller')
        self.assertEqual(historical['state'], 'historical')
        self.assertTrue(all(e['state'] == 'resolved' for e in rows['TTAN']['events']))
        self.assertEqual(rows['IREN']['events'], [])
        self.assertEqual(rows['IREN']['coverage'], 'screened')
        self.assertEqual(rows['IBIT']['coverage'], 'not_applicable')
        self.assertTrue(all(e['review_due_at'] == '2026-10-27' for row in rows.values() for e in row['events'] if e['state'] == 'current'))

    def test_survival_risk_not_inferred_from_criminal_or_controls_severity(self):
        rows = {r['code']: r for r in build_governance(self.coverage, self.events, self.members)['rows']}
        for code in ['HUBG', 'SMMT', 'CRML']:
            self.assertEqual(rows[code]['distress']['level'], 'major')
        for code in ['CABA', 'GEMI', 'LCID', 'SPRY', 'ORBS']:
            self.assertEqual(rows[code]['distress']['level'], 'watch')
        for code in ['SMCI', 'CVNA', 'IMSR', 'IREN', 'MCD', 'TTAN']:
            self.assertEqual(rows[code]['distress']['level'], 'not_flagged')
        self.assertEqual(rows['IBIT']['distress']['level'], 'not_applicable')

    def test_resolved_signals_and_missing_coverage(self):
        self.assertEqual(distress_summary('unavailable', [])['level'], 'unknown')
        events = [{'state': 'resolved', 'distress': 'major', 'label': 'Resolved default'}]
        self.assertEqual(distress_summary('screened', events)['level'], 'not_flagged')
        events.append({'state': 'current', 'distress': 'watch', 'label': 'Funding dependency'})
        self.assertEqual(distress_summary('targeted', events), {'level': 'watch', 'reasons': ['Funding dependency']})

    def test_distress_classification_requires_relevant_evidence(self):
        events = copy.deepcopy(self.events)
        events['overrides']['SMCI'][0]['distress'] = 'major'
        with self.assertRaises(ValueError):
            build_governance(self.coverage, events, self.members)
