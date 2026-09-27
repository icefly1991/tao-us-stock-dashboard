"""Reproducible SEC screening from a downloaded evidence directory; never run daily."""
from __future__ import annotations
import argparse
import json
from datetime import date
from pathlib import Path

TAGS = {
    'revenue': ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'Revenue'],
    'net_income': ['NetIncomeLoss', 'ProfitLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic'],
    'operating_cash_flow': ['NetCashProvidedByUsedInOperatingActivities', 'CashFlowsFromUsedInOperatingActivities'],
    'cash': ['CashAndCashEquivalentsAtCarryingValue', 'CashAndCashEquivalents'],
    'current_assets': ['AssetsCurrent', 'CurrentAssets'],
    'current_liabilities': ['LiabilitiesCurrent', 'CurrentLiabilities'],
    'equity_proceeds': ['ProceedsFromStockIssuance', 'ProceedsFromIssuanceOfCommonStock', 'ProceedsFromSaleOfTreasuryStock', 'ProceedsFromIssuingShares'],
    'financing_cash_flow': ['NetCashProvidedByUsedInFinancingActivities', 'CashFlowsFromUsedInFinancingActivities'],
}
INSTANT = {'cash', 'current_assets', 'current_liabilities'}
CATEGORIES = {'clinical', 'precommercial', 'funded_loss', 'turnaround', 'commercial_medical',
              'digital_assets', 'financial', 'operating', 'disclosure_risk', 'unresolved'}

def extract_facts(company: dict, submissions: dict, cutoff: str) -> dict:
    namespaces = company.get('facts', {})
    recent = submissions['filings']['recent']
    docs = dict(zip(recent['accessionNumber'], recent['primaryDocument']))
    cik = int(submissions['cik'])
    def candidates(key):
        result = []
        for priority, tag in enumerate(TAGS[key]):
            for namespace in ['us-gaap', 'ifrs-full']:
                for unit, points in namespaces.get(namespace, {}).get(tag, {}).get('units', {}).items():
                    if unit not in {'USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'CNY', 'ILS'}:
                        continue
                    for point in points:
                        if point.get('filed', '9999') > cutoff or point['end'] > cutoff or point.get('form') not in {'10-Q', '10-K', '20-F', '40-F', '6-K'}:
                            continue
                        if key not in INSTANT and ('start' not in point or not 60 <= (date.fromisoformat(point['end']) - date.fromisoformat(point['start'])).days <= 380):
                            continue
                        result.append({**point, 'unit': unit, 'priority': priority, 'tag': tag})
        return result
    operating = candidates('operating_cash_flow')
    if not operating:
        return {}
    base = sorted(operating, key=lambda p: (p['end'], p['filed'], -p['priority'], -date.fromisoformat(p['start']).toordinal()))[-1]
    results = {}
    for key in TAGS:
        values = [p for p in candidates(key) if p['end'] == base['end'] and p['unit'] == base['unit'] and (key in INSTANT or p.get('start') == base['start'])]
        if not values:
            results[key] = None
            continue
        point = sorted(values, key=lambda p: (p['filed'], -p['priority']))[-1]
        accn = point['accn']
        file = docs.get(accn, f'{accn}-index.html')
        url = f'https://www.sec.gov/Archives/edgar/data/{cik}/{accn.replace("-", "")}/{file}'
        results[key] = {'value': point['val'], 'unit': point['unit'], 'end': point['end'], 'filed': point['filed'], 'url': url, 'tag': point['tag']}
        if key not in INSTANT:
            results[key]['start'] = point['start']
    return results

def classify(facts: dict, sic: str, cutoff: str) -> tuple[str, list[str], str, float | None]:
    tags = []
    def value(key):
        return facts.get(key, {}).get('value') if facts.get(key) else None
    revenue, profit, ocf, cash, assets = [value(k) for k in ['revenue', 'net_income', 'operating_cash_flow', 'cash', 'current_assets']]
    if profit is not None and profit < 0: tags.append('报告期亏损')
    if ocf is not None and ocf < 0: tags.append('经营现金净流出')
    if (value('equity_proceeds') or 0) > 0: tags.append('股权融资')
    if (value('financing_cash_flow') or 0) > 0: tags.append('融资现金净流入')
    if revenue is not None and revenue < 1_000_000 and ocf is not None and ocf < 0: tags.append('收入规模有限')
    base = facts.get('operating_cash_flow')
    runway = None
    if base and ocf < 0 and cash is not None and cash >= 0:
        months = ((date.fromisoformat(base['end']) - date.fromisoformat(base['start'])).days + 1) / 365.25 * 12
        runway = round(cash / -ocf * months, 1)
    # Sector-specific balance sheets and cash flows need a different review model.
    if sic.startswith(('60', '61', '62', '63', '64', '65', '67')):
        return 'unknown', tags + ['行业专门口径'], '金融、保险、投资或地产结构不能用通用经营现金消耗模型分级；需专项核查。', None
    if not base or any(v is None for v in [revenue, profit, ocf, cash]):
        return 'unknown', tags + ['财报字段待补'], '尚未取得同报告期、同币种的完整可比字段；不以缺失数据推断基本面尚可。', runway
    if (date.fromisoformat(cutoff) - date.fromisoformat(base['end'])).days > 200:
        return 'unknown', tags + ['报告期偏旧'], '结构化数据报告期距核查日超过200天，需补最新中期/公司公告。', runway
    if ocf < 0 and assets is not None and assets >= 0:
        duration = ((date.fromisoformat(base['end']) - date.fromisoformat(base['start'])).days + 1) / 365.25 * 12
        asset_cover = assets / -ocf * duration
        if asset_cover < 12 and (value('financing_cash_flow') or 0) > 0:
            return 'pressure', tags + ['资金消耗压力'], '经营现金净流出；即使以全部流动资产估算，按报告期消耗速度覆盖不足12个月，且同期有融资净流入。须进一步核查偿债与后续融资。', runway
    if profit > 0 and ocf > 0 and revenue > 0:
        liabilities = value('current_liabilities')
        if assets is not None and liabilities is not None and liabilities > assets:
            return 'watch', tags + ['流动负债高于流动资产'], '同期盈利与经营现金流为正，但流动负债超过流动资产；需结合行业周转及偿债结构观察。', runway
        return 'supported', tags or ['盈利且经营现金流为正'], '同报告期有经营收入、净利润与经营现金流均为正；不代表估值合理或不存在债务、行业风险。', runway
    if ocf < 0 and runway is not None and runway >= 24:
        tags.append('现金覆盖较长')
    return 'watch', tags, '经营资料可核验，但盈利或经营现金流仍需观察；现有证据不足以直接判为依赖融资生存。', runway

def build_assessment(code: str, root: Path, cutoff: str) -> dict:
    sub = json.loads((root / f'{code}-submissions.json').read_text(encoding='utf-8'))
    path = root / f'{code}-facts.json'
    company = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    facts = extract_facts(company, sub, cutoff)
    grade, tags, reason, runway = classify(facts, sub.get('sic', ''), cutoff)
    return {'code': code, 'name': sub['name'], 'grade': grade, 'tags': tags, 'reason': reason, 'business': sub.get('sicDescription', '') or '业务分类待核实', 'reviewed_at': cutoff, 'facts': facts, 'sources': [{'title': 'SEC 公司申报记录', 'url': f'https://www.sec.gov/edgar/browse/?CIK={sub["cik"]}&owner=exclude'}], 'runway_months': runway, 'sic': sub.get('sic', ''), 'country': sub['addresses']['business'].get('stateOrCountryDescription')}

def apply_review(rows: list[dict], manifest: dict, overrides: dict, cutoff: str) -> dict:
    if overrides['reviewed_at'] != cutoff:
        raise ValueError('Manual evidence date must match this review; do not relabel stale research.')
    members = set(manifest['accepted_codes'])
    excluded = {row['code'] for row in manifest['excluded']}
    if members & excluded or len(members) != len(manifest['accepted_codes']):
        raise ValueError('Conflicting or duplicate pool members')
    available = {row['code'] for row in rows}
    if not members <= available:
        raise ValueError(f'Missing research identities: {sorted(members - available)}')
    final = []
    for row in rows:
        if row['code'] not in members:
            continue
        override = overrides['overrides'].get(row['code'])
        row = {**row, 'review_method': '财报初筛', 'business_clarity': '行业可核验，商业质量需结合公告'}
        if override:
            if override['grade'] not in {'supported', 'watch', 'pressure', 'unknown'} or not override.get('sources'):
                raise ValueError('Manual classification requires a valid grade and primary sources')
            # A fresh narrative review can replace obsolete missing-field or old-period tags.
            tags = override['tags'] if override.get('replace_tags') else list(dict.fromkeys(override['tags'] + row['tags']))
            row = {**row, **override, 'tags': tags, 'sources': override['sources'] + row['sources'], 'review_method': '原文专项核查'}
            row.pop('replace_tags', None)
        if not row['facts']:
            row['business_clarity'] = '业务/财务资料待补，不能判为基本面尚可'
        final.append(row)
    return {'schema_version': 1, 'reviewed_at': cutoff, 'source_snapshot_date': manifest['captured_at'], 'rows': final, 'excluded': manifest['excluded']}


def apply_categories(payload: dict, categories: dict, cutoff: str) -> dict:
    """Business type is independent of liquidity grade; manual types require evidence."""
    if categories['reviewed_at'] != cutoff:
        raise ValueError('Category evidence date must match review date')
    members = {row['code'] for row in payload['rows']}
    if not set(categories['overrides']) <= members:
        raise ValueError('Category overrides contain non-members')
    for row in payload['rows']:
        override = categories['overrides'].get(row['code'])
        if override:
            if override.get('category') not in CATEGORIES or not override.get('category_reason') or not override.get('category_sources'):
                raise ValueError('Business category requires a valid type, reason and sources')
            for source in override['category_sources']:
                if not isinstance(source.get('url'), str) or not source['url'].startswith('https://'):
                    raise ValueError('Business category requires HTTPS evidence')
            row.update(override)
        else:
            row['category'] = 'operating' if row['grade'] == 'supported' else 'unresolved' if row['grade'] == 'unknown' else 'turnaround'
            row['category_reason'] = ('报告期盈利及经营现金流提供支撑；保留在用户池内作为对照，不因池名断言经营困难。' if row['category'] == 'operating' else
                                      '资料不足以确认经营类型，具体缺口见资金核查。' if row['category'] == 'unresolved' else
                                      '已有经营活动，但盈利、现金流、扩张或资产负债表仍需修复/验证；不自动认定依赖融资生存，也不表示反转已发生。')
            row['category_sources'] = row['sources'] if row['review_method'] == '原文专项核查' else list({f['url']: {'title': '财报初筛依据', 'url': f['url']} for f in row['facts'].values() if f}.values())
            row['category_method'] = '财报规则初筛'
        row.setdefault('evidence_gap', '')
        # Sector financing/asset valuation cannot use industrial-company cash burn runway.
        if row['category'] in {'financial', 'digital_assets', 'disclosure_risk'}:
            row['runway_months'] = None
    payload['schema_version'] = 2
    return payload

def apply_briefs(payload: dict, overrides: dict, cutoff: str) -> dict:
    """Evidence-linked observations, not forecasts or a second grading model."""
    if overrides['reviewed_at'] != cutoff or not set(overrides['overrides']) <= {r['code'] for r in payload['rows']}:
        raise ValueError('Brief date or membership mismatch')
    for row in payload['rows']:
        highlights, risks = [], []
        manual = overrides['overrides'].get(row['code'], {})
        def add(target, label, *facts):
            target.append({'text': label, 'method': '财报规则初筛', 'sources': list({f['url']: {'title': f"财报 · {f['end']}", 'url': f['url']} for f in facts}.values())})
        facts = row['facts']
        profit, ocf, revenue = (facts.get(k) for k in ('net_income', 'operating_cash_flow', 'revenue'))
        if profit and profit['value'] > 0:
            add(highlights, '报告期账面盈利', profit)
        if ocf and ocf['value'] > 0:
            add(highlights, '经营现金流为正', ocf)
        manual_revenue = any(any(term in p['text'] for term in ('收入', '销售', '业务')) for p in manual.get('highlights', []))
        if revenue and revenue['value'] > 0 and len(highlights) < 2 and not manual_revenue:
            add(highlights, '已有收入基础', revenue)
        cash = facts.get('cash')
        if row.get('runway_months') is not None and row['runway_months'] >= 24 and cash and ocf and ocf['value'] < 0 and len(highlights) < 2:
            add(highlights, '现金/历史年化消耗≥2年', cash, ocf)
        if profit and profit['value'] < 0:
            add(risks, '报告期亏损', profit)
        if ocf and ocf['value'] < 0 and row['category'] not in {'financial', 'digital_assets'}:
            add(risks, '经营现金净流出', ocf)
        assets, liabilities = facts.get('current_assets'), facts.get('current_liabilities')
        if assets and liabilities and assets['end'] == liabilities['end'] and assets['unit'] == liabilities['unit'] and liabilities['value'] > assets['value']:
            add(risks, '流动负债高于流动资产', assets, liabilities)
        for key, generated in [('highlights', highlights), ('risks', risks)]:
            phrases = manual.get(key, []) + generated
            unique = list({item['text']: item for item in reversed(phrases)}.values())[::-1][:3]
            for item in unique:
                if not isinstance(item.get('text'), str) or not item['text'].strip() or len(item['text']) > 24 or item.get('method') not in {'原文提炼', '财报规则初筛'} or not item.get('sources'):
                    raise ValueError('Brief requires a short phrase, method and evidence')
                if any(not s.get('title') or not isinstance(s.get('url'), str) or not s['url'].startswith('https://') for s in item['sources']):
                    raise ValueError('Brief requires HTTPS primary evidence')
            row[key] = unique
    return payload


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--evidence-dir', type=Path, required=True)
    parser.add_argument('--cutoff', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--source-manifest', type=Path)
    parser.add_argument('--overrides', type=Path)
    parser.add_argument('--categories', type=Path)
    parser.add_argument('--briefs', type=Path)
    args = parser.parse_args()
    rows = [build_assessment(path.name.removesuffix('-submissions.json'), args.evidence_dir, args.cutoff) for path in sorted(args.evidence_dir.glob('*-submissions.json'))]
    payload = {'reviewed_at': args.cutoff, 'rows': rows, 'excluded': []}
    if args.source_manifest or args.overrides:
        if not args.source_manifest or not args.overrides or not args.categories:
            parser.error('Final review requires --source-manifest, --overrides and --categories (schema v2)')
        payload = apply_review(rows, json.loads(args.source_manifest.read_text(encoding='utf-8')), json.loads(args.overrides.read_text(encoding='utf-8')), args.cutoff)
        if args.categories:
            payload = apply_categories(payload, json.loads(args.categories.read_text(encoding='utf-8')), args.cutoff)
        from data_pipeline.config import load_watchlist, STOCK_LIST_FILE
        members = {item.code: item for item in load_watchlist(STOCK_LIST_FILE) if item.pool}
        if set(members) != {row['code'] for row in payload['rows']}:
            raise ValueError('Research snapshot and current CSV pool differ')
        for row in payload['rows']:
            row['sic_description'] = row['business']
            row['business'] = members[row['code']].business
        if args.briefs:
            payload = apply_briefs(payload, json.loads(args.briefs.read_text(encoding='utf-8')), args.cutoff)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
    from collections import Counter
    print(Counter(row['grade'] for row in payload['rows']))
    print('Pressure:', [row['code'] for row in payload['rows'] if row['grade'] == 'pressure'])
