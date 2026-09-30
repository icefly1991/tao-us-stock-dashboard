"""Build evidence-labelled weekly machine research without relabelling manual findings."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from research_pool import build_assessment, apply_briefs


def newest_filing(facts: dict) -> str | None:
    dates = [item['filed'] for item in facts.values() if item and item.get('filed')]
    return max(dates) if dates else None


def attention(filings: list[dict]) -> list[str]:
    signals = []
    for filing in filings:
        items = set(part.strip() for part in str(filing.get('items', '')).split(','))
        if filing['form'].startswith('25'):
            signals.append('退市/摘牌表格申报，须核实证券与生效状态')
        if '1.03' in items:
            signals.append('8-K含破产/接管条款，须核实申报主体和原文')
        if '3.01' in items:
            signals.append('8-K含上市合规条款，须核实通知及整改期限')
        if '4.02' in items:
            signals.append('8-K含财报不可依赖条款，须核实重述范围')
    return list(dict.fromkeys(signals))


def build_weekly(scan: dict, pool: dict, governance: dict, evidence_dir: Path, previous_weekly: dict | None = None) -> dict:
    if scan['errors']:
        raise ValueError('Incomplete SEC scan cannot publish weekly research')
    scan_rows = {row['code']: row for row in scan['rows']}
    if set(scan_rows) != {row['code'] for row in governance['rows']}:
        raise ValueError('Weekly scan must cover every governance member')
    cutoff = scan['scanned_at'][:10]
    if previous_weekly and (previous_weekly.get('pool_reviewed_at') != pool['reviewed_at'] or previous_weekly.get('governance_reviewed_at') != governance['reviewed_at']):
        previous_weekly = None
    previous_pool = {row['code']: row for row in (previous_weekly or {}).get('pool_rows', [])}
    previous_companies = {row['code']: row for row in (previous_weekly or {}).get('company_rows', [])}
    machine_rows = []
    for previous in pool['rows']:
        code = previous['code']
        item = scan_rows.get(code)
        if not item or item['status'] == 'not_applicable':
            raise ValueError(f'Missing company scan for {code}')
        if item['facts_status'] == 'not_available':
            machine_rows.append({'code': code, 'status': 'no_structured_facts', 'grade': None, 'highlights': [], 'risks': [], 'facts': {}, 'facts_filed_at': None, 'source': None})
            continue
        assessment = build_assessment(code, evidence_dir, cutoff)
        filed = newest_filing(assessment['facts'])
        old_filed = newest_filing(previous['facts'])
        prior_machine = previous_pool.get(code)
        prior_filed = prior_machine.get('facts_filed_at') if prior_machine else None
        if not filed or (old_filed and filed <= old_filed) or (prior_filed and filed <= prior_filed):
            carried = {key: prior_machine.get(key) for key in ('grade', 'grade_reason', 'highlights', 'risks', 'facts', 'facts_filed_at', 'source', 'manual_grade', 'manual_reviewed_at') if prior_machine and key in prior_machine}
            machine_rows.append({'code': code, 'status': 'unchanged', 'grade': None, 'highlights': [], 'risks': [], 'facts': {}, 'facts_filed_at': filed, 'source': None, **carried})
            continue
        assessment['category'] = previous['category']
        fresh = apply_briefs({'rows': [assessment]}, {'reviewed_at': cutoff, 'overrides': {}}, cutoff)['rows'][0]
        sources = [fact['url'] for fact in assessment['facts'].values() if fact and fact.get('filed') == filed]
        special = previous['category'] in {'financial', 'digital_assets', 'disclosure_risk'}
        machine_rows.append({'code': code, 'status': 'new_structured_facts', 'grade': None if special else assessment['grade'], 'grade_reason': '行业或披露事项需专门口径，结构化财报不自动分级。' if special else assessment['reason'], 'highlights': fresh['highlights'], 'risks': fresh['risks'], 'facts': assessment['facts'], 'facts_filed_at': filed, 'source': sources[0] if sources else None, 'manual_grade': previous['grade'], 'manual_reviewed_at': previous['reviewed_at']})
    signals = []
    for row in scan['rows']:
        if row['status'] == 'not_applicable':
            signals.append({'code': row['code'], 'status': 'not_applicable', 'filings': [], 'sic_description': None})
            continue
        seen = set(previous_companies.get(row['code'], {}).get('seen_accessions', []))
        filings = [filing for filing in row['filings'] if filing['accession'] not in seen]
        seen.update(filing['accession'] for filing in row['filings'])
        signals.append({'code': row['code'], 'status': 'new_filings_need_interpretation' if filings else 'no_new_relevant_filing', 'filings': filings, 'attention': attention(filings), 'seen_accessions': sorted(seen), 'sic_description': row.get('sic_description')})
    return {'schema_version': 1, 'scanned_at': scan['scanned_at'], 'pool_reviewed_at': pool['reviewed_at'], 'governance_reviewed_at': governance['reviewed_at'], 'method': 'SEC structured facts and filing metadata; no automatic legal or survival conclusion', 'pool_count': len(machine_rows), 'company_count': len(signals), 'pool_rows': machine_rows, 'company_rows': signals}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('--scan', type=Path, default=Path('.cache/weekly-research/scan.json'))
    parser.add_argument('--evidence-dir', type=Path, default=Path('.cache/weekly-research/sec'))
    parser.add_argument('--output', type=Path, default=Path('public/data/weekly-research.json'))
    args = parser.parse_args()
    scan = json.loads(args.scan.read_text(encoding='utf-8'))
    pool = json.loads(Path('public/data/pool-review.json').read_text(encoding='utf-8'))
    governance = json.loads(Path('public/data/governance-review.json').read_text(encoding='utf-8'))
    previous = json.loads(args.output.read_text(encoding='utf-8')) if args.output.exists() else None
    payload = build_weekly(scan, pool, governance, args.evidence_dir, previous)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')
    print(f"Weekly research: {len(payload['pool_rows'])} pool, {len(payload['company_rows'])} companies")


if __name__ == '__main__':
    main()
