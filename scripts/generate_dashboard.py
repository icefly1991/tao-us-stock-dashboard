from __future__ import annotations

from data_pipeline.config import build_runtime_config
from data_pipeline.exporter import dashboard_exists, export_dashboard
from data_pipeline.summary import build_dashboard_payload
from data_pipeline.yfinance_client import YFinancePipelineClient
from generate_boxes import generate_boxes
from data_pipeline.diagnostics import write_diagnostics


class IncompleteLatestPricesError(RuntimeError):
    """Only this known upstream condition is eligible for automatic retry."""


def main() -> None:
    config = build_runtime_config()
    client = YFinancePipelineClient(config)
    result = client.build_adjustment_rows()
    try:
        write_diagnostics(config, result, client.session.evidence)
    except Exception as error:
        print(f"Diagnostics unavailable: {type(error).__name__}; see original data errors below.")
    valid_row_count = sum(len(rows) for rows in result.rows_by_adjustment.values())

    print(f"Latest data date: {result.latest_trade_date or 'unavailable'}")
    print(f"Successful stocks: {result.successful_stocks}")
    print(f"Failed stocks: {result.failed_stocks}")
    print(f"Suspended stocks: {sum(item.trading_status == 'suspended' for item in config.watchlist)}")
    print(f"Chart files: {sum(len(items) for items in result.histories.values())}")
    print(f"Chart errors: {len(result.history_errors)}")
    for error in result.errors:
        print(f"Data error: {error['code']}: {error['error']}")
    if result.incomplete_latest_errors:
        affected = sorted({error["code"] for error in result.incomplete_latest_errors})
        print(f"::error title=Latest daily prices incomplete::{len(affected)} symbols have incomplete latest-session prices: {', '.join(affected)}. See Data error lines for session, missing fields and last usable date. Deployment stopped; previous published data retained.")
        raise IncompleteLatestPricesError("Latest-session stock prices are incomplete; no dashboard/history/boxes files were written. Retry after Yahoo daily prices are complete.")
    for error in result.history_errors:
        print(f"Chart unavailable: {error['code']} {error['error']}")
    for adjustment, histories in result.histories.items():
        for code, history in histories.items():
            if history.get("skipped_dates"):
                print(f"Chart gaps: {code} {adjustment} {history['skipped_dates']}")

    if valid_row_count == 0:
        status = "Kept existing dashboard.json." if dashboard_exists(config.output_json_file) else "No dashboard.json written."
        print(status)
        print(f"Output file path: {config.output_json_file}")
        raise RuntimeError("No valid dashboard rows were generated; deployment stopped.")

    payload = build_dashboard_payload(
        result.rows_by_adjustment,
        result.errors,
        watchlist_total=len(config.watchlist),
        updated_at=config.updated_at,
        data_date=result.latest_trade_date,
        watchlist=config.watchlist,
    )
    for adjustment, histories in result.histories.items():
        for code, history in histories.items():
            export_dashboard(config.output_json_file.parent / "history" / adjustment / f"{code}.json", history)
    export_dashboard(config.output_json_file, payload)
    generate_boxes(config.output_json_file.parent)
    print(f"Output file path: {config.output_json_file}")


if __name__ == "__main__":
    try:
        main()
    except IncompleteLatestPricesError as error:
        print(error)
        raise SystemExit(75)
