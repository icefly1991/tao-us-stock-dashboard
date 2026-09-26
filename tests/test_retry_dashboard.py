import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from retry_dashboard import run_with_retries


class RetryDashboardTests(unittest.TestCase):
    def exercise(self, codes):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {}, clear=True), \
                patch("retry_dashboard.subprocess.run") as process, patch("retry_dashboard.time.sleep") as sleep:
            root = Path(folder)
            destination = root / ".cache" / "pipeline-diagnostics"
            destination.mkdir(parents=True)
            sequence = iter(codes)

            def execute(*args, **kwargs):
                code = next(sequence)
                (destination / "report.json").write_text(str(code))
                return Mock(returncode=code)

            process.side_effect = execute
            result = run_with_retries(attempts=3, delay_seconds=1800, root=root)
            archived = sorted(p.read_text() for p in destination.glob("attempt-*/report.json"))
            return result, process.call_count, sleep.call_count, archived

    def test_immediate_success(self):
        self.assertEqual(self.exercise([0]), (0, 1, 0, ["0"]))

    def test_recovers_and_keeps_failed_evidence(self):
        self.assertEqual(self.exercise([75, 0]), (0, 2, 1, ["0", "75"]))

    def test_exhaustion_remains_failure(self):
        self.assertEqual(self.exercise([75, 75, 75]), (75, 3, 2, ["75"] * 3))

    def test_other_errors_are_not_retried(self):
        self.assertEqual(self.exercise([1]), (1, 1, 0, ["1"]))

    def test_error_after_missing_prices_stops(self):
        self.assertEqual(self.exercise([75, 1]), (1, 2, 1, ["1", "75"]))
