# Repository instructions for AI contributors

Before changing this repository, read these files in order:

1. `PROJECT_RULES.md`
2. `docs/REQUIREMENTS.md`
3. `docs/DECISIONS.md`
4. `docs/CHANGE_REQUESTS.md`
5. `docs/METRIC_DEFINITIONS.md` when data or metrics are involved

Every functional change must reference an existing requirement ID or add a new requirement with acceptance criteria. Do not change an accepted metric formula, window, adjustment meaning, missing-value rule, deployment schedule, or JSON contract without first adding and accepting a Change Request.

Keep metric calculations in `scripts/data_pipeline/indicators.py`; the React application should display and sort the generated values, not reimplement financial formulas.

Before declaring work complete, run:

```text
python -m unittest discover -s tests -v
npm run lint
npm run build
```

For data-layer or dependency changes, also run `python scripts/generate_dashboard.py` against real yfinance data and report any upstream rate-limit or symbol failures honestly.

Update `docs/CHANGELOG.md` for user-visible, data, deployment, or documentation-governance changes. Final handoff must list changed files, requirement IDs, validation results, data-contract impact, and unresolved risks.
