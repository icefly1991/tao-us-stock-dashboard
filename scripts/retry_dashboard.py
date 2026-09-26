"""Bounded retries for incomplete Yahoo daily prices; other failures stay fatal."""
from datetime import datetime, timezone
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]


def note(message):
    line = f"{datetime.now(timezone.utc).isoformat(timespec='seconds')} {message}"
    print(line, flush=True)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as stream:
            stream.write(f"\n{line}\n")


def run_with_retries(attempts=9, delay_seconds=1800, root=ROOT):
    diagnostics = root / ".cache" / "pipeline-diagnostics"
    for attempt in range(1, attempts + 1):
        note(f"行情尝试 {attempt}/{attempts}。仅最新日线缺价（exit 75）自动重试。")
        # A new interpreter/session on every attempt avoids reusing Yahoo responses.
        for name in ("report.json", "summary.md"):
            (diagnostics / name).unlink(missing_ok=True)
        result = subprocess.run([sys.executable, str(root / "scripts" / "generate_dashboard.py")], cwd=root)
        for name in ("report.json", "summary.md"):
            source = diagnostics / name
            if source.exists():
                archive = diagnostics / f"attempt-{attempt:02d}"
                archive.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, archive / name)
        if result.returncode == 0:
            note(f"第 {attempt} 次行情生成成功；继续检查、构建及部署。")
            return 0
        if result.returncode != 75:
            note(f"非缺价错误（exit {result.returncode}），停止自动重试，部署失败。")
            return result.returncode
        if attempt == attempts:
            note(f"{attempts} 次尝试后仍缺价；部署失败，保留旧线上数据。请查看逐次诊断。")
            return 75
        note(f"Yahoo 日线仍不完整；{delay_seconds // 60} 分钟后自动重试，暂不发布。")
        time.sleep(delay_seconds)
    raise ValueError("attempts must be positive")


if __name__ == "__main__":
    raise SystemExit(run_with_retries())
