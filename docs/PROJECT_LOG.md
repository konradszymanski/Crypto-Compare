# Project Progress Log

This log gives a concise record of shipped work, current in-flight changes, and the release process. Git history is the source of truth for code changes; GitHub Issues track actionable work; this file summarizes the project state at each release.

## Current state — 2026-10-11

- **Production:** GitHub Pages deploys from `master` after the verification job succeeds.
- **Latest production commit:** `5fe0736` — market overview and sourced event research pages. Its verification and Pages deployment runs completed successfully.
- **In flight in this change:** selectable comparison currency (USD, EUR, GBP, JPY, CAD, AUD), transactional refresh of the selected coins, and currency-format/request tests. This becomes shipped once its pull request is merged and the `master` deployment succeeds.
- **Current user-facing pages:** compare coins, Bitcoin cycles, market overview, and Events & Bitcoin.
- **Open GitHub work:** [#1 display currency](https://github.com/konradszymanski/Crypto-Compare/issues/1), [#2 persist selected coins](https://github.com/konradszymanski/Crypto-Compare/issues/2), [#3 data freshness and refresh](https://github.com/konradszymanski/Crypto-Compare/issues/3), [#4 browser accessibility and responsive checks](https://github.com/konradszymanski/Crypto-Compare/issues/4). Close an issue when its acceptance criteria are shipped and the release is verified.

## Verified milestones

| Commit | Delivered |
| --- | --- |
| `81017fe` | Bitcoin halving-cycle comparison and resilient coin search |
| `738308e` | Ranked coin search results by exact ticker and market capitalization |
| `5fe0736` | Market overview and sourced event research pages |

## CI and release flow

Workflow: [`.github/workflows/pages.yml`](../.github/workflows/pages.yml), **Verify and deploy GitHub Pages**.

1. A pull request targeting `master`, a push to `master`, or a manual workflow dispatch starts verification.
2. Verification runs on Ubuntu with Node.js 18, checks JavaScript syntax for the application modules, and runs `node --test tests/comparison-core.test.js`.
3. The deploy job runs only after verification on a push to `master`. It configures GitHub Pages, uploads the static site, and deploys it with the `github-pages` environment.
4. Workflow permissions are read-only for verification; deployment receives only `pages: write` and `id-token: write` in addition to content read access.
5. After merging, confirm both the verification and Pages deployment runs succeed before treating the change as live.

The workflow does not yet run real-browser accessibility or responsive tests. That work is tracked in issue #4. CoinGecko and Binance are external services, so CI uses deterministic local unit tests and does not make live market-data requests.

## Working agreement

- Keep each pull request focused and link the related GitHub Issue when there is one.
- Update `ROADMAP.md` when a planned capability ships; update this log with the release commit and CI/deployment result.
- Keep secrets out of the static client application. Treat provider limits and outages as normal failure cases.
- Use the built-in test runner unless a documented need justifies adding dependencies.
