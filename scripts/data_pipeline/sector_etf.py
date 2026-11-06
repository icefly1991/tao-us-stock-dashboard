"""Static issuer holdings evidence; daily quotes never refresh its research date."""
from __future__ import annotations

from datetime import date
from functools import lru_cache
import json
import math
import re
from pathlib import Path
from urllib.parse import urlparse

REVIEW_PATH = Path(__file__).resolve().parents[2] / 'public/data/sector-etf-review.json'
ISSUER_HOSTS = {'www.ssga.com', 'www.globalxetfs.com', 'www.ishares.com', 'www.ftportfolios.com', 'www.defianceetfs.com', 'assets.ark-funds.com', 'sprottetfs.com', 'www.proshares.com'}


@lru_cache(maxsize=1)
def load_sector_etf_review() -> dict:
    data = json.loads(REVIEW_PATH.read_text(encoding='utf-8'))
    if data.get('schema_version') != 1 or not isinstance(data.get('funds'), dict) or not isinstance(data.get('rows'), list):
        raise ValueError('Invalid ETF holdings review schema')
    reviewed_on = date.fromisoformat(data['reviewed_on'])
    if reviewed_on > date.today():
        raise ValueError('ETF research date cannot be in the future')
    for fund in data['funds'].values():
        if not re.fullmatch(r'[a-f0-9]{64}', fund.get('sha256', '')):
            raise ValueError('Missing original issuer document hash')
    seen = set()
    for row in data['rows']:
        if row['code'] in seen:
            raise ValueError('Duplicate ETF review company')
        seen.add(row['code'])
        if row['status'] == 'verified':
            h = row['holding']
            valid_holding(h, row['symbol'], row['etf'])
            if h['etf'] not in data['funds']:
                raise ValueError('ETF absent from reviewed funds')
            fund = data['funds'][h['etf']]
            if h['verified_on'] != data['reviewed_on'] or any(h[key] != fund[field] for key, field in [('etf_name', 'name'), ('theme', 'theme'), ('source', 'source'), ('as_of', 'as_of')]):
                raise ValueError('ETF holding differs from issuer fund evidence')
            if (reviewed_on - date.fromisoformat(h['as_of'])).days > 30:
                raise ValueError('ETF holding was stale at research time')
        elif row['status'] != 'unverified' or row.get('etf') or row.get('holding') is not None:
            raise ValueError('Unverified company cannot have an ETF assignment')
    return data


def valid_holding(h: dict, symbol: str, etf: str) -> None:
    for key in ['etf_name', 'theme', 'holding_name', 'identifier']:
        if not isinstance(h.get(key), str) or not h[key].strip():
            raise ValueError('Incomplete ETF holding identity')
    source = urlparse(h['source'])
    if source.scheme != 'https' or source.hostname not in ISSUER_HOSTS or source.username or source.password:
        raise ValueError('ETF evidence must be an official issuer URL')
    as_of, verified = date.fromisoformat(h['as_of']), date.fromisoformat(h['verified_on'])
    if as_of > verified or h['etf'] != etf or h['holding_symbol'] != symbol or h.get('position_type') != 'direct_equity':
        raise ValueError('ETF holding identity/date/type mismatch')
    if any(isinstance(h.get(key), bool) or not isinstance(h.get(key), (int, float)) or not math.isfinite(h[key]) or h[key] <= 0 for key in ['shares', 'weight_pct']):
        raise ValueError('ETF evidence requires positive shares and weight')
    if h['weight_pct'] > 100:
        raise ValueError('Invalid ETF equity weight')


def sector_etf_holding(code: str, symbol: str, etf: str) -> dict | None:
    if not etf:
        return None
    row = next((row for row in load_sector_etf_review()['rows'] if row['code'] == code), None)
    if not row or row['status'] != 'verified' or row['symbol'] != symbol or row['etf'] != etf:
        raise ValueError(f'No matching issuer ETF holding evidence: {code}/{etf}')
    valid_holding(row['holding'], symbol, etf)
    return dict(row['holding'])


def validate_sector_etf_assignments(items: list) -> dict:
    review = load_sector_etf_review()
    companies = {item.code: item for item in items if item.asset_type == 'stock' and (item.watchlist == 'original' or item.tier)}
    records = {row['code']: row for row in review['rows']}
    if companies.keys() != records.keys():
        raise ValueError('ETF holdings research scope differs from visible company list')
    for code, item in companies.items():
        row = records[code]
        if item.symbol != row['symbol'] or item.sector_etf != row['etf']:
            raise ValueError(f'ETF assignment differs from research evidence: {code}')
        if row['status'] == 'verified':
            sector_etf_holding(code, item.symbol, item.sector_etf)
    return {'companies': len(records), 'verified': sum(row['status'] == 'verified' for row in records.values()), 'unverified': sum(row['status'] == 'unverified' for row in records.values())}
