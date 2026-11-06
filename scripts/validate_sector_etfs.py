"""Validate the manually reviewed ETF holdings snapshot without market requests."""
import json
from data_pipeline.config import load_watchlist, STOCK_LIST_FILE
from data_pipeline.sector_etf import validate_sector_etf_assignments

if __name__ == '__main__':
    counts = validate_sector_etf_assignments(load_watchlist(STOCK_LIST_FILE))
    print(json.dumps(counts))
