"""Last completed US regular session, including holidays and early closes."""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd
import pandas_market_calendars as mcal


def latest_closed_session(now: datetime | None = None) -> str:
    now = now or datetime.now(ZoneInfo("America/New_York"))
    if now.tzinfo is None:
        raise ValueError("Session clock must include a timezone")
    today = now.astimezone(ZoneInfo("America/New_York")).date()
    schedule = mcal.get_calendar("NYSE").schedule(
        start_date=today - timedelta(days=30), end_date=today)
    closed = schedule.loc[schedule["market_close"] <= pd.Timestamp(now)]
    if closed.empty:
        raise RuntimeError("No completed market session in calendar window")
    return closed.index[-1].strftime("%Y%m%d")
