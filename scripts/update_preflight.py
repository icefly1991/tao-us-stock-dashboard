"""Skip only a verified publication of this revision and completed session."""
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from data_pipeline.market_calendar import latest_closed_session

BASE = "https://icefly1991.github.io/tao-us-stock-dashboard/data/"


def read_published(name):
    request = Request(BASE + name, headers={"Cache-Control": "no-cache"})
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def publication_current(target, revision, marker, dashboard):
    return bool(revision and marker.get("revision") == revision
                and marker.get("data_date") == target
                and dashboard.get("data_date") == target)


def main():
    target = latest_closed_session()
    needed = True
    if os.environ.get("GITHUB_EVENT_NAME") == "schedule":
        try:
            needed = not publication_current(target, os.environ.get("GITHUB_SHA"),
                                             read_published("update-state.json"),
                                             read_published("dashboard.json"))
        except Exception as error:
            # A missing marker/network failure must never suppress an update.
            print(f"Publication check unavailable ({type(error).__name__}); attempting update.")
    print(f"Target completed session: {target}; update needed: {needed}")
    if os.environ.get("GITHUB_OUTPUT"):
        with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as stream:
            stream.write(f"target_date={target}\nneeded={str(needed).lower()}\n")


if __name__ == "__main__":
    main()
