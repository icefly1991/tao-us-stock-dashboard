# Daily update policy · CR-045 / OPS-009

Accepted 2026-10-15: user explicitly requested implementation of the first three
recommendations (earlier repeated schedules, target-session validation, faster
selective retries). This supersedes the daily timing/retry policies in ADR-005,
OPS-001 and OPS-004, while retaining the incomplete-price gate DATA-020.

## Scheduling

All cron times use America/New_York, including DST:

- Monday–Friday: 16:15, 16:30, 16:45, then every 15 minutes from 17:00 to 19:45.
- Monday–Friday 22:30 and Tuesday–Saturday 03:15: fallback attempts.
- Early-close days still first run at 16:15; no claim of 15-minute updates on
  these days. Exchange calendar determines the completed session correctly.
- These are attempted triggers, not a guaranteed availability deadline.

Before running checks/build, preflight determines the last completed NYSE
session using pandas_market_calendars (holidays, special closures, early closes,
weekends and DST). During trading hours the target remains the previous
completed session; manual/push runs publish completed daily bars, not intraday
bars. After midnight the previous day's close remains the target.

Scheduled runs skip only when BOTH published dashboard.data_date and the
separate update-state.json marker match the target, and the marker revision
matches GITHUB_SHA. A new code revision always builds. Push/manual runs always
build. Missing/corrupt/unreachable published metadata causes an update attempt,
never a silent skip. No repository commits or mutable repository state are
needed. The marker is deployed with the same Pages artifact, after generation.

## Freshness and retry

The target is fixed for a run and passed as DASHBOARD_TARGET_DATE; the download
end is the next day (exclusive), preventing next-session/premarket bars from
blocking a completed-session update. Original latest-price completeness checks
remain in effect on all returned bars. No fields are fabricated or repaired.

Before writing dashboard/history/boxes, the batch date must exactly match the
target. Stale batches exit 75 with expected/actual dates and retain the previous
publication. Individual ordinary missing-symbol errors remain visible, as in
the accepted baseline; an old per-symbol row cannot masquerade as current.
The existing 80% common-date rule and financial formulas are unchanged.

Scheduled jobs make ONE attempt: the next independent cron provides the
15-minute retry without a sleeping runner holding the Pages concurrency group.
Push/manual runs make up to THREE attempts, 10 minutes apart, only for exit 75.
Other errors remain fatal. Build timeout is 45 minutes. Attempts retain their
diagnostics artifact and summary. A failed scheduled attempt remains visibly
failed; fallback schedules may recover later.

Only full five-year raw histories with complete required latest prices at the
exact target are cached as JSON. Each retry downloads only uncached/incomplete/
stale symbols; cached data still passes normal checks and calculations. Cache
keys include revision, target and request window, and are saved even after a
failed data attempt. Damaged cache data is ignored and redownloaded. No cache
from a different target/revision is restored, so the next session refetches
history and corporate-action adjustments. Diagnostics for reused series may
show unknown HTTP evidence, since no fresh network request was made.

## Acceptance and limitations

Tests cover regular close, before close, after midnight, weekends, holidays,
early close, DST, revision-aware skipping, blocked stale exports, and selective
retry preserving complete prices. CI also runs existing Python, frontend and
browser checks, followed by real Yahoo generation and Pages deployment.

The desired normal-day availability is 20–40 minutes after close, conditional
on GitHub triggering and Yahoo supplying complete prices. No external scheduler
or paid feed was added. GitHub cron can still be late or dropped; all fallback
triggers depend on GitHub. NYSE is the common US-session calendar, not an
individual suspension/status service. Crypto remains excluded from stock-date
coverage. Manual research and list-review dates do not advance with market data.

## Verified rollout · 2026-10-15

Implemented and published at revision 1965278, [successful deployment](https://github.com/icefly1991/tao-us-stock-dashboard/actions/runs/38701439254).
166 Python, 4 Node and 90 Chromium checks, lint/build passed in CI. Real Yahoo
validation: 350 success/0 failures; 700 histories/0 errors; both box pools
100/234 processed with no errors. Published date 20261014, 350 rows per price
mode and matching revision marker were read back from the live site. A real
scheduled preflight against this revision returned needed=false. Target-session
histories were successfully saved to Actions cache. Local Edge had two navigation
load timeouts; the unchanged full cloud browser suite passed all 90 tests.
