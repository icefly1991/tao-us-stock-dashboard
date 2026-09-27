"""Pure membership merge used during manual pool maintenance, never by daily jobs."""
from __future__ import annotations

def merge_symbols(lists: list[list[str]], active_symbols: set[str]) -> tuple[list[str], list[str]]:
    unique: dict[str, str] = {}
    for symbols in lists:
        for full in symbols:
            exchange, separator, code = full.partition(':')
            if not separator or exchange not in {'NASDAQ', 'NYSE', 'AMEX'} or not code:
                raise ValueError(f'Unsupported TradingView symbol: {full}')
            if code in unique and unique[code] != full:
                raise ValueError(f'Ambiguous exchange identity: {code}')
            unique[code] = full
    removed = [full for code, full in unique.items() if code in active_symbols]
    remaining = [full for code, full in unique.items() if code not in active_symbols]
    return remaining, removed
