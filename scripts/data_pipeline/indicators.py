from __future__ import annotations

from typing import Any
from statistics import median
import math

import pandas as pd


def calculate_scenario_value(model: str, inputs: dict[str, Any]) -> float:
    """CR-029: explicit researched assumptions, millions of USD and shares."""
    if not isinstance(inputs, dict):
        raise ValueError("Scenario inputs must be an object")
    def number(key: str, *, minimum: float | None = 0, positive: bool = False) -> float:
        value = inputs.get(key)
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f"Invalid scenario input: {key}")
        if (minimum is not None and value < minimum) or (positive and value <= 0):
            raise ValueError(f"Scenario input out of range: {key}")
        return float(value)

    if model in {"enterprise_dcf", "equity_dcf"}:
        flow_key = "fcfe" if model == "equity_dcf" else "fcff"
        asset_key = "excess_equity_assets" if model == "equity_dcf" else "cash_and_nonoperating_assets"
        claims_key = "additional_common_claims" if model == "equity_dcf" else "debt_and_other_claims"
        expected = {flow_key, "discount_rate", "terminal_growth", asset_key, claims_key, "diluted_shares"}
        if set(inputs) != expected:
            raise ValueError("DCF input fields must match the documented model")
        flows = inputs[flow_key]
        if not isinstance(flows, list) or not 1 <= len(flows) <= 10 or any(
            isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) for value in flows
        ):
            raise ValueError("DCF requires 1–10 finite annual cash-flow forecasts")
        rate = number("discount_rate", positive=True)
        growth = number("terminal_growth", minimum=None)
        if not -1 < growth < rate <= 1 or flows[-1] <= 0:
            raise ValueError("DCF needs positive terminal cash flow and -1 < growth < discount rate <= 1")
        terminal = flows[-1] * (1 + growth) / (rate - growth)
        enterprise = sum(flow / (1 + rate) ** year for year, flow in enumerate(flows, 1)) + terminal / (1 + rate) ** len(flows)
        equity = enterprise + number(asset_key) - number(claims_key)
        value = max(equity, 0) / number("diluted_shares", positive=True)
    elif model == "asset_recovery":
        expected = {"recoverable_assets", "senior_claims", "recovery_costs", "current_common_shares", "existing_common_entitlement", "years_to_recovery", "discount_rate"}
        if set(inputs) != expected:
            raise ValueError("Recovery input fields must match the documented model")
        rate = number("discount_rate", positive=True)
        years = number("years_to_recovery")
        if rate > 1 or years > 10:
            raise ValueError("Recovery discount rate or duration out of range")
        residual = max(number("recoverable_assets") - number("senior_claims") - number("recovery_costs"), 0)
        entitlement = number("existing_common_entitlement")
        if entitlement > 1:
            raise ValueError("Existing common entitlement must be between 0 and 1")
        value = residual * entitlement / (1 + rate) ** years / number("current_common_shares", positive=True)
    else:
        raise ValueError(f"Unsupported scenario model: {model}")
    if not math.isfinite(value):
        raise ValueError("Nonfinite scenario value")
    return round(value, 4)


def wilder_rsi(closes: list[float], period: int = 14) -> list[float | None]:
    """Seed with the first period changes, then use Wilder's recursive average."""
    values: list[float | None] = []
    previous = None
    gains, losses = [], []
    average_gain = average_loss = None
    for close in closes:
        if not math.isfinite(close) or close <= 0:
            previous = average_gain = average_loss = None
            gains, losses = [], []
            values.append(None)
            continue
        if previous is None:
            previous = close
            values.append(None)
            continue
        change = close - previous
        previous = close
        gain, loss = max(change, 0), max(-change, 0)
        if average_gain is None:
            gains.append(gain)
            losses.append(loss)
            if len(gains) < period:
                values.append(None)
                continue
            average_gain, average_loss = sum(gains) / period, sum(losses) / period
        else:
            average_gain = (average_gain * (period - 1) + gain) / period
            average_loss = (average_loss * (period - 1) + loss) / period
        value = (50.0 if average_gain == average_loss == 0 else 100.0 if average_loss == 0
                 else 100 - 100 / (1 + average_gain / average_loss))
        values.append(value)
    return values


def build_rsi_metrics(frame: pd.DataFrame) -> dict[str, Any]:
    ordered = frame.sort_values("trade_date").drop_duplicates("trade_date", keep="last")
    dates = [str(date).replace("-", "")[:8] for date in ordered["trade_date"]]
    values = wilder_rsi(pd.to_numeric(ordered["close"], errors="coerce").tolist())
    latest = values[-1] if values else None
    sample = [(date, value) for date, value in zip(dates, values)
              if dates and date[:4] == dates[-1][:4] and value is not None]
    # Percentiles use unrounded RSI; display/state use the same one-decimal value.
    value = round(latest, 1) if latest is not None else None
    percentile = None
    if latest is not None and len(sample) >= 20:
        equal = sum(math.isclose(item, latest, rel_tol=0, abs_tol=1e-10) for _, item in sample)
        below = sum(item < latest and not math.isclose(item, latest, rel_tol=0, abs_tol=1e-10) for _, item in sample)
        percentile = round(100 * (below + .5 * equal) / len(sample), 1)
    def iso(date: str) -> str:
        return f"{date[:4]}-{date[4:6]}-{date[6:8]}"
    return {"period": 14, "value": value, "percentile_ytd": percentile,
            "state": "unavailable" if value is None else "oversold" if value <= 30 else "overbought" if value >= 70 else "neutral",
            "percentile_state": "unavailable" if latest is None else "insufficient" if percentile is None else
                                "low" if percentile <= 10 else "high" if percentile >= 90 else "normal",
            "sample_count": len(sample), "sample_start": iso(sample[0][0]) if sample else None,
            "sample_end": iso(sample[-1][0]) if sample else None, "as_of": iso(dates[-1]) if dates else None}


def build_long_range_metrics(bars: list[dict[str, Any]]) -> dict[str, Any]:
    if not bars:
        return {"long_bars": [], "exclusion_reasons": []}
    cutoff = pd.Timestamp(bars[-1]["time"]) - pd.DateOffset(years=4)
    history = [bar for bar in bars if pd.Timestamp(bar["time"]) >= cutoff]
    year = bars[-252:]
    low, high = min(bar["low"] for bar in history), max(bar["high"] for bar in history)
    close = bars[-1]["close"]
    position = (close - low) / (high - low) * 100 if high > low else None
    annual = (close / bars[-253]["close"] - 1) * 100 if len(bars) >= 253 else None
    rebound = (close / min(bar["low"] for bar in year) - 1) * 100
    reasons = []
    if position is not None and position >= 80:
        reasons.append("长期区间位置≥80%")
    if annual is not None and annual >= 100:
        reasons.append("近一年涨幅≥100%")
    if rebound >= 200:
        reasons.append("较近一年低点上涨≥200%")
    # A few sessions' tolerance covers weekends/holidays at the four-year boundary.
    complete = pd.Timestamp(bars[0]["time"]) <= cutoff + pd.Timedelta(days=7)
    points = sorted(set(range(0, len(history), 5)) | {len(history) - 1})
    return {"long_position_pct": round(position, 2) if position is not None else None,
            "year_return_pct": round(annual, 2) if annual is not None else None,
            "year_low_gain_pct": round(rebound, 2), "long_low": low, "long_high": high,
            "long_start": history[0]["time"], "long_end": history[-1]["time"],
            "long_history_days": len(history), "long_history_complete": complete,
            "year_history_days": len(year),
            "long_bars": [{"time": history[i]["time"], "close": history[i]["close"]} for i in points],
            "exclusion_reasons": reasons}


def summarize_box_cycles(bars: list[dict[str, Any]], trips: list[dict[str, Any]],
                         events: list[dict[str, Any]]) -> dict[str, Any]:
    """Three alternating legs per round; adjacent rounds share only an endpoint."""
    rounds = []
    for i in range(0, len(trips) - 2, 3):
        legs = trips[i:i + 3]
        indices = [legs[0]["start_index"], *[leg["end_index"] for leg in legs]]
        if any(legs[j]["end_index"] != legs[j + 1]["start_index"] or
               legs[j]["direction"] == legs[j + 1]["direction"] for j in range(2)):
            raise ValueError("A round requires three continuous alternating legs")
        sides = (["low", "high", "low", "high"] if legs[0]["direction"] == "up"
                 else ["high", "low", "high", "low"])
        turns = [{"side": side, "time": bars[index]["time"], "index": index}
                 for side, index in zip(sides, indices)]
        begin, finish = indices[0], indices[-1]
        rounds.append({"start": bars[begin]["time"], "end": bars[finish]["time"], "turns": turns,
                       "start_index": begin, "end_index": finish,
                       "calendar_days": (pd.Timestamp(bars[finish]["time"]) - pd.Timestamp(bars[begin]["time"])).days,
                       "trading_days": finish - begin})
    consumed = len(rounds) * 3
    pending_start = events[consumed]["index"] if events else None
    pending_legs = len(trips) - consumed
    pending_days = ((pd.Timestamp(bars[-1]["time"]) - pd.Timestamp(bars[pending_start]["time"])).days
                    if pending_start is not None else None)
    average = sum(item["calendar_days"] for item in rounds) / len(rounds) if rounds else None
    # Only the completed-round arithmetic mean decides speed, never pending/latest time.
    speed = "slow" if average is not None and average > 120 else "qualified" if average is not None else "unknown"
    return {"rounds": rounds, "round_count": len(rounds), "cycle_days": round(average, 2) if average is not None else None,
            "latest_cycle_days": rounds[-1]["calendar_days"] if rounds else None,
            "pending_days": pending_days, "pending_completed_legs": pending_legs,
            "pending_start": bars[pending_start]["time"] if pending_start is not None else None,
            "pending_phase": ("awaiting_high" if events[-1]["side"] == "low" else "awaiting_low") if events else None,
            "speed_band": speed, "maturity": "verified" if rounds else "unconfirmed"}


def analyze_box_window(bars: list[dict[str, Any]], window_days: int) -> dict[str, Any]:
    """Retrospective full-window shape recognition; not a historical trading signal."""
    start = len(bars) - window_days
    prices = pd.Series([float(bar["close"]) for bar in bars])
    window = prices.iloc[start:]
    low, high = float(window.quantile(.1)), float(window.quantile(.9))
    base = {"window_days": window_days, "window_start_index": start,
            "window_start": bars[start]["time"], "window_end": bars[-1]["time"],
            "recognition_method": "retrospective_full_window"}
    span = high - low
    if low <= 0 or span <= 0:
        return {**base, "status": "insufficient", "reason": "无法识别有效价格区间",
                "passed_count": 0, "trips": [], "rounds": [], "round_count": 0, "maturity": "unconfirmed"}
    bottom, top = low + .2 * span, low + .8 * span
    events, trips = [], []
    side, anchor = None, None
    for i in range(start, len(bars)):
        price = float(prices.iloc[i])
        new_side = "low" if price <= bottom else "high" if price >= top else None
        if new_side is None or new_side == side:
            continue
        if side is not None:
            trips.append({"direction": "up" if side == "low" else "down",
                          "start": bars[anchor]["time"], "end": bars[i]["time"],
                          "start_index": anchor, "end_index": i, "days": i - anchor,
                          "return_pct": rounded_percent_change(price, float(prices.iloc[anchor]))})
        events.append({"side": new_side, "index": i})
        side, anchor = new_side, i
    cycles = summarize_box_cycles(bars, trips, events)
    upward = [trip["days"] for trip in trips if trip["direction"] == "up"]
    downward = [trip["days"] for trip in trips if trip["direction"] == "down"]
    observation = window
    occupancy = float(observation.between(low, high).mean() * 100)
    half = len(observation) // 2
    drift = float((observation.iloc[half:].mean() - observation.iloc[:half].mean()) / span * 100)
    width = (high / low - 1) * 100
    position = (float(prices.iloc[-1]) - low) / span * 100
    third_progress = None
    if not cycles["round_count"] and len(trips) == 2:
        # A third leg must move at least halfway between the two touch-zone thresholds.
        third_progress = ((float(prices.iloc[-1]) - bottom) / (top - bottom) * 100
                          if events[-1]["side"] == "low" else
                          (top - float(prices.iloc[-1])) / (top - bottom) * 100)
        third_progress = max(0.0, min(100.0, third_progress))
    near_round = third_progress is not None and third_progress >= 50 - 1e-9
    checks = {"width": width >= 20 - 1e-9, "repeat": cycles["round_count"] >= 1,
              "speed": cycles["speed_band"] == "qualified",
              "stable": abs(drift) <= 50}
    if bool((prices.iloc[-3:] < low).all()):
        status, reason = "broken", "连续3日收盘低于下沿"
    elif bool((prices.iloc[-3:] > high).all()):
        status, reason = "breakout", "连续3日收盘高于上沿"
    elif not 0 <= position <= 100:
        status, reason = "outside", "最新收盘越界，等待确认"
    elif cycles["speed_band"] == "slow":
        status, reason = "slow", "已完成轮次的平均周期超过120个自然日"
    elif all(checks.values()):
        status, reason = "match", "已完成至少一轮三个交替单程，平均周期≤120自然日、箱体幅度≥20%"
    elif checks["width"] and checks["stable"] and near_round:
        status, reason = "watch", "已完成两个交替单程，第三单程推进至少一半；尚无完整一轮，平均周期未知"
    else:
        labels = {"width": "箱体幅度不足20%", "repeat": "尚未完成一轮三个交替单程",
                  "speed": "暂无已完成轮次的平均周期", "stable": "价格中枢漂移过大"}
        reason = "；".join(labels[key] for key, passed in checks.items() if not passed)
        if not cycles["round_count"] and not near_round:
            reason += "；往返证据不足，单向或仅山峰/谷底结构不列候选"
        status = "rejected"
    return {**base, **cycles, "status": status, "reason": reason,
            "low": round(low, 4), "high": round(high, 4), "width_pct": round(width, 2),
            "third_leg_progress_pct": round(third_progress, 2) if third_progress is not None else None,
            "inner_space_pct": round((top / bottom - 1) * 100, 2),
            "position_pct": round(position, 2), "occupancy_pct": round(occupancy, 2),
            "drift_pct": round(drift, 2), "up_days": median(upward) if upward else None,
            "down_days": median(downward) if downward else None,
            "up_count": len(upward), "down_count": len(downward), "trips": trips,
            "checks": checks, "passed_count": sum(checks.values()),
            "efficiency": round(width / cycles["cycle_days"], 4) if cycles["cycle_days"] else None}


def build_box_metrics(bars: list[dict[str, Any]]) -> dict[str, Any]:
    context = build_long_range_metrics(bars)
    year = bars[-252:]
    if len(year) < 60:
        return {**context, "status": "insufficient", "reason": "不足60个交易日",
                "bars": year, "windows": [], "trips": [], "rounds": [], "round_count": 0}
    windows = [analyze_box_window(year, size) for size in (60, 90, 120, 252) if size <= len(year)]
    eligible = [window for window in windows if window["status"] == "match"]
    if not eligible:
        eligible = [window for window in windows if window["status"] == "watch"]
    # Predetermined recency rule, not the window with the greatest historical efficiency.
    chosen = min(eligible, key=lambda window: window["window_days"]) if eligible else max(
        windows, key=lambda window: (window["passed_count"], -window["window_days"]))
    prior = [window for window in windows if window["window_days"] > chosen["window_days"]
             and window.get("low") is not None and chosen.get("low") is not None
             and window["low"] <= chosen["low"] and window["high"] >= chosen["high"]
             and (chosen["high"] - chosen["low"]) <= .8 * (window["high"] - window["low"])
             and len(window["trips"]) >= 2]
    reference = max(prior, key=lambda window: window["window_days"]) if prior else None
    for window in windows:
        window["shape_status"], window["shape_reason"] = window["status"], window["reason"]
        if context["exclusion_reasons"]:
            window["status"], window["reason"] = "excluded", "；".join(context["exclusion_reasons"])
    return {**context, **chosen, "bars": year, "short_year": len(year) < 252,
            "selected_window_days": chosen["window_days"], "windows": windows,
            "contracting": reference is not None and chosen["shape_status"] == "match",
            "prior_box": {key: reference[key] for key in ("window_days", "low", "high", "width_pct")} if reference else None,
            "selection_note": "优先已验证的最短窗口，其次接近一轮的待观察窗口；其余展示达标项最多的窗口。整段回顾识别，非事前信号"}

def build_volatility_metrics(frame: pd.DataFrame) -> dict[str, Any]:
    """Three-calendar-month arithmetic mean of daily true range / previous close."""
    ordered = frame.sort_values('trade_date').drop_duplicates('trade_date', keep='last')
    dates = pd.to_datetime(ordered['trade_date'], format='mixed')
    end = dates.iloc[-1]
    cutoff = end - pd.DateOffset(months=3)
    result = {'value': None, 'window_start': cutoff.strftime('%Y-%m-%d'),
              'window_end': end.strftime('%Y-%m-%d'), 'sample_count': int((dates > cutoff).sum()), 'status': 'insufficient'}
    if not (dates <= cutoff).any() or result['sample_count'] < 40:
        return result
    values = []
    for i in [i for i, timestamp in enumerate(dates) if timestamp > cutoff and i > 0]:
        current, previous = ordered.iloc[i], ordered.iloc[i - 1]
        high, low, close, prior = (float(v) for v in (current['high'], current['low'], current['close'], previous['close']))
        if not all(math.isfinite(v) and v > 0 for v in (high, low, close, prior)) or not low <= close <= high:
            return {**result, 'status': 'invalid'}
        values.append(max(high - low, abs(high - prior), abs(low - prior)) / prior * 100)
    if not values:
        return result
    return {**result, 'value': round(sum(values) / len(values), 2), 'sample_count': len(values), 'status': 'available'}


def build_metrics(frame: pd.DataFrame, year_start: str) -> dict[str, Any]:
    ordered = normalize_history(frame)
    latest = ordered.iloc[-1]
    previous = ordered.iloc[-2]
    close = float(latest["close"])
    current_year = ordered[ordered["trade_date"] >= year_start]

    ma250 = float(ordered["close"].tail(250).mean()) if len(ordered) >= 250 else None
    year_start_close = float(current_year.iloc[0]["close"]) if not current_year.empty else None

    high_52w: float | None = None
    low_52w: float | None = None
    if len(ordered) >= 252:
        range_52w = ordered.tail(252)
        high_52w = float(range_52w["high"].max())
        low_52w = float(range_52w["low"].min())

    return {
        "close": round(close, 4),
        "today_return_pct": rounded_percent_change(close, float(previous["close"])),
        "distance_ma250_pct": rounded_percent_change(close, ma250),
        "ytd_return_pct": rounded_percent_change(close, year_start_close),
        "distance_52w_high_pct": rounded_percent_change(close, high_52w),
        "distance_52w_low_pct": rounded_percent_change(close, low_52w),
        "position_52w_pct": rounded_range_position(close, low_52w, high_52w),
        "history_days": len(ordered),
        "rsi": build_rsi_metrics(ordered),
        "volatility_3m": build_volatility_metrics(ordered),
    }


def normalize_history(frame: pd.DataFrame) -> pd.DataFrame:
    if frame.empty:
        raise ValueError("No usable history returned by yfinance.")

    ordered = frame.copy()
    required = {"trade_date", "close", "high", "low"}
    missing = required.difference(ordered.columns)
    if missing:
        raise ValueError(f"Missing history columns: {', '.join(sorted(missing))}")

    ordered["trade_date"] = ordered["trade_date"].astype(str)
    for column in ("close", "high", "low"):
        ordered[column] = pd.to_numeric(ordered[column], errors="coerce")
    ordered = ordered.dropna(subset=["close", "high", "low"])
    ordered = ordered.sort_values("trade_date").drop_duplicates("trade_date", keep="last").reset_index(drop=True)

    if len(ordered) < 2:
        raise ValueError("At least two daily bars are required.")
    return ordered


def rounded_percent_change(current: float, base: float | None) -> float | None:
    if base is None or base == 0:
        return None
    return round((current / base - 1) * 100, 2)


def rounded_range_position(current: float, low: float | None, high: float | None) -> float | None:
    if low is None or high is None or high == low:
        return None
    return round((current - low) / (high - low) * 100, 2)


def merge_name_and_metrics(code: str, name: str, metrics: dict[str, Any]) -> dict[str, Any]:
    return {"code": code, "name": name, **metrics}


def build_history_metrics(frame: pd.DataFrame) -> dict[str, float | None]:
    """Actual available chart range; never presented as the strict 52-week metric."""
    high, low = float(frame["high"].max()), float(frame["low"].min())
    close = float(frame.iloc[-1]["close"])
    return {"high": round(high, 8), "low": round(low, 8), "close": round(close, 8),
            "distance_high_pct": rounded_percent_change(close, high),
            "position_pct": rounded_range_position(close, low, high)}


def build_rsi_history(frame: pd.DataFrame) -> dict[str, Any]:
    """Warm up on all available closes before clipping to two calendar years."""
    ordered = frame.sort_values("trade_date").drop_duplicates("trade_date", keep="last")
    dates = [pd.Timestamp(str(day)) for day in ordered["trade_date"]]
    values = wilder_rsi(pd.to_numeric(ordered["close"], errors="coerce").tolist())
    if not dates:
        return {"period": 14, "points": [], "complete": False, "requested_start": None}
    cutoff = dates[-1] - pd.DateOffset(years=2)
    valid = [(day, value) for day, value in zip(dates, values) if value is not None]
    return {"period": 14, "requested_start": cutoff.strftime("%Y-%m-%d"),
            "complete": bool(valid and valid[0][0] <= cutoff + pd.Timedelta(days=7)),
            "points": [{"time": day.strftime("%Y-%m-%d"), "value": round(value, 1)}
                       for day, value in valid if day >= cutoff]}


def calculate_scenario_gap(value: float, raw_close: float) -> float:
    """Percentage distance from the same-batch unadjusted close."""
    import math
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v) for v in (value, raw_close)) or value < 0 or raw_close <= 0:
        raise ValueError("Invalid scenario price or raw close")
    result = (value / raw_close - 1) * 100
    if not math.isfinite(result):
        raise ValueError("Nonfinite scenario comparison")
    return result
