"""Publish reviewed events; keyword hits are never promoted to accusations."""
import argparse
import json
from datetime import date
from pathlib import Path

KINDS = {'controls', 'accounting', 'listing', 'survival', 'controller', 'management', 'enforcement', 'operations', 'financing'}


def distress_summary(coverage, events):
    """Evidence-based triage, not a bankruptcy probability or financial score."""
    signals = [e for e in events if e['state'] == 'current' and e.get('distress') in {'major', 'watch'}]
    if coverage == 'not_applicable':
        level = 'not_applicable'
    elif any(e['distress'] == 'major' for e in signals):
        level = 'major'
    elif signals:
        level = 'watch'
    elif coverage == 'unavailable':
        level = 'unknown'
    else:
        level = 'not_flagged'
    return {'level': level, 'reasons': [e['label'] for e in signals]}


def build_governance(coverage: dict, events: dict, members: set[str]) -> dict:
    cutoff = coverage['reviewed_at']
    date.fromisoformat(cutoff)
    if events['reviewed_at'] != cutoff or not set(events['overrides']) <= members:
        raise ValueError('Event date/membership mismatch')
    rows = coverage['rows']
    if {r['code'] for r in rows} != members or len(rows) != len(members):
        raise ValueError('Coverage must contain every member exactly once')
    def sources(items, required=True):
        if required and not items:
            raise ValueError('Primary evidence required')
        if len({s.get('url') for s in items}) != len(items):
            raise ValueError('Duplicate evidence URLs')
        for source in items:
            if not source.get('title') or not source.get('url', '').startswith('https://'):
                raise ValueError('Primary HTTPS evidence required')
    result = []
    for row in rows:
        if row['coverage'] not in {'targeted', 'screened', 'unavailable', 'not_applicable'}:
            raise ValueError('Invalid coverage')
        sources(row['sources'], row['coverage'] in {'targeted', 'screened'})
        items = events['overrides'].get(row['code'], [])
        for event in items:
            if event['kind'] not in KINDS or event['state'] not in {'current', 'historical', 'resolved'} or event['legal_status'] not in {'disclosed', 'investigation', 'charged', 'admitted', 'adjudicated', 'alleged'} or event['severity'] not in {'high', 'elevated', 'info'}:
                raise ValueError('Invalid event taxonomy')
            if not event['label'] or not event['detail'] or date.fromisoformat(event['disclosed_at']) > date.fromisoformat(cutoff):
                raise ValueError('Invalid or future event')
            sources(event['sources'])
            if event.get('distress') not in {None, 'major', 'watch'}:
                raise ValueError('Invalid distress signal')
            if event.get('distress') and event['kind'] not in {'survival', 'listing', 'accounting', 'financing', 'operations'}:
                raise ValueError('Governance alone is not a survival signal')
        if row['coverage'] == 'not_applicable' and items:
            raise ValueError('Inapplicable coverage cannot contain company events')
        result.append({**row, 'events': items, 'distress': distress_summary(row['coverage'], items)})
    return {'schema_version': 1, 'reviewed_at': cutoff, 'rows': result}


if __name__ == '__main__':
    from data_pipeline.config import load_watchlist, STOCK_LIST_FILE
    parser = argparse.ArgumentParser()
    parser.add_argument('--coverage', type=Path, required=True)
    parser.add_argument('--events', type=Path, default=Path('scripts/governance_events.json'))
    parser.add_argument('--output', type=Path, default=Path('public/data/governance-review.json'))
    args = parser.parse_args()
    payload = build_governance(json.loads(args.coverage.read_text(encoding='utf-8')), json.loads(args.events.read_text(encoding='utf-8')), {r.code for r in load_watchlist(STOCK_LIST_FILE)})
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf-8')
    print('Governance rows:', len(payload['rows']))
