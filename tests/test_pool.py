from __future__ import annotations
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from pool_membership import merge_symbols
from research_pool import extract_facts, classify, apply_review
from data_pipeline.config import load_watchlist, WatchlistItem
from data_pipeline.summary import build_dashboard_payload
from generate_boxes import generate_boxes

class PoolTests(unittest.TestCase):
    def test_merge_dedup_and_subtract_active_only(self):
        remaining, removed = merge_symbols([['NASDAQ:A', 'NYSE:B'], ['NASDAQ:A', 'NYSE:C']], {'B'})
        self.assertEqual(remaining, ['NASDAQ:A', 'NYSE:C'])
        self.assertEqual(removed, ['NYSE:B'])

    def test_reject_ambiguous_or_non_us_symbols(self):
        for lists in [[['NASDAQ:A', 'NYSE:A']], [['HKEX:00700']], [['A']]]:
            with self.assertRaises(ValueError): merge_symbols(lists, set())

    def test_pool_membership_and_legacy_csv(self):
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'list.csv'
            path.write_text('code,name,watchlist,tier,pool\nX,Example,,,tradingview\nY,Other,original,,tradingview\n')
            items=load_watchlist(path)
            self.assertTrue(all(item.pool for item in items))
            path.write_text('code,name,watchlist,tier,pool\nX,Example,,A,tradingview\n')
            with self.assertRaisesRegex(RuntimeError,'overlap'):load_watchlist(path)

    def test_collections_never_leak_pool_to_existing(self):
        items=[WatchlistItem('A','A','A','stock',pool=True),WatchlistItem('B','B','B','stock',watchlist='',tier='A'),WatchlistItem('C','C','C','stock',watchlist='',pool=True)]
        rows=[{'code':c,'today_return_pct':1} for c in 'ABC']
        payload=build_dashboard_payload({'adjusted':rows,'raw':rows},[],3,watchlist=items)
        collections={c['id']:c for c in payload['collections']}
        self.assertEqual(collections['original']['codes'],['A'])
        self.assertEqual(collections['research']['codes'],['B'])
        self.assertEqual(collections['pool']['codes'],['A','C'])
        self.assertEqual(collections['pool']['summaries']['raw']['watchlist_total'],2)

    def facts(self,profit=5,ocf=10,cash=20,assets=30):
        values={'revenue':100,'net_income':profit,'operating_cash_flow':ocf,'cash':cash,'current_assets':assets,'current_liabilities':10,'financing_cash_flow':5}
        return {key:{'value':value,'unit':'USD','start':'2026-01-01','end':'2026-06-30'} for key,value in values.items()}

    def test_profitable_and_cash_positive_supported(self):
        self.assertEqual(classify(self.facts(),'7372','2026-09-27')[0],'supported')

    def test_loss_alone_not_financing_distress(self):
        self.assertEqual(classify(self.facts(profit=-5),'7372','2026-09-27')[0],'watch')

    def test_long_cash_cover_not_distress(self):
        result=classify(self.facts(profit=-5,ocf=-1,cash=30),'2836','2026-09-27')
        self.assertEqual(result[0],'watch')
        self.assertIn('现金覆盖较长',result[1])

    def test_short_cover_and_financing_flag_pressure(self):
        self.assertEqual(classify(self.facts(profit=-10,ocf=-30,cash=5,assets=10),'7372','2026-09-27')[0],'pressure')

    def test_industry_missing_and_stale_not_supported(self):
        self.assertEqual(classify(self.facts(),'6199','2026-09-27')[0],'unknown')
        self.assertEqual(classify({},'7372','2026-09-27')[0],'unknown')
        self.assertEqual(classify(self.facts(),'7372','2027-09-27')[0],'unknown')

    def test_current_liability_pressure_overrides_positive_profit(self):
        facts=self.facts();facts['current_liabilities']['value']=100
        self.assertEqual(classify(facts,'7372','2026-09-27')[0],'watch')

    def test_extract_same_period_and_currency_no_future_filings(self):
        def point(value,start='2026-01-01',filed='2026-08-01',end='2026-06-30'):
            return dict(val=value,start=start,end=end,filed=filed,accn='0001-26-000001',form='10-Q')
        company={'facts':{'us-gaap':{
            'NetCashProvidedByUsedInOperatingActivities':{'units':{'USD':[point(-20)]}},
            'NetIncomeLoss':{'units':{'USD':[point(-30),point(10,start='2026-04-01'),point(999,filed='2026-10-01')],'EUR':[point(500)]}},
            'RevenueFromContractWithCustomerExcludingAssessedTax':{'units':{'USD':[point(60,start='2026-04-01')]}}
        }}}
        sub={'cik':1,'filings':{'recent':{'accessionNumber':['0001-26-000001'],'primaryDocument':['quarter.htm']}}}
        result=extract_facts(company,sub,'2026-09-27')
        self.assertEqual(result['net_income']['value'],-30)
        self.assertIsNone(result['revenue'])
        self.assertTrue(result['net_income']['url'].endswith('/quarter.htm'))

    def test_manual_override_requires_current_evidence(self):
        row={'code':'A','grade':'pressure','tags':[],'sources':[],'facts':{}}
        manifest={'accepted_codes':['A'],'excluded':[],'captured_at':'2026-09-26'}
        override={'reviewed_at':'2026-09-27','overrides':{'A':{'grade':'watch','tags':['融资后缓解'],'sources':[{'url':'https://example.com/filing'}]}}}
        self.assertEqual(apply_review([row],manifest,override,'2026-09-27')['rows'][0]['grade'],'watch')
        with self.assertRaises(ValueError):apply_review([row],manifest,override,'2026-09-28')
        with self.assertRaises(ValueError):apply_review([],manifest,override,'2026-09-27')

    def test_separate_box_artifacts_share_rules_without_member_leak(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'history'/'adjusted').mkdir(parents=True)
            data={'updated_at':'version','data_date':'20260925','collections':[{'id':'research','codes':['A']},{'id':'pool','codes':['B']}], 'adjustments':{'adjusted':{'rows':[{'code':c,'name':c} for c in 'AB']}}}
            (root/'dashboard.json').write_text(json.dumps(data))
            for code in 'AB':
                (root/'history'/'adjusted'/f'{code}.json').write_text(json.dumps({'updated_at':'version','code':code,'adjustment':'adjusted','actual_end':'2026-09-25','daily':[{'time':'2026-09-25'}]}))
            with patch('generate_boxes.build_box_metrics',return_value={'bars':[]}):
                original=generate_boxes(root)
                pool=generate_boxes(root,'pool','pool-boxes.json')
            self.assertEqual([r['code'] for r in original['rows']],['A'])
            self.assertEqual([r['code'] for r in pool['rows']],['B'])
            self.assertEqual(json.loads((root/'boxes.json').read_text(encoding='utf-8')),original)

    def test_checked_in_research_matches_actual_pool(self):
        root=Path(__file__).resolve().parents[1]
        items=load_watchlist(root/'scripts/stock_list.csv')
        review=json.loads((root/'public/data/pool-review.json').read_text(encoding='utf-8'))
        pool={item.code for item in items if item.pool}
        self.assertEqual(pool,{row['code'] for row in review['rows']})
        self.assertFalse(pool & {item.code for item in items if item.tier})
        self.assertFalse(pool & {item['code'] for item in review['excluded']})
        self.assertTrue(all(row['sources'] for row in review['rows']))
