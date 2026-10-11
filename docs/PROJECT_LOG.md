# Project Progress Log

This log gives a concise record of shipped work, current in-flight changes, and the release process. Git history is the source of truth for code changes; GitHub Issues track actionable work; this file summarizes the project state at each release.

## Product decisions — 2026-10-11

- Prioritize historical halving-cycle and macro-event research.
- Keep the event experience curated and source-linked; price comparisons provide historical context and do not claim causation.
- Keep the app free and static, relying on public data and browser-side caching without client-side API secrets.
- Keep the product research-focused; a personal portfolio tracker is out of scope.

## Current state — 2026-10-11

- **Production:** GitHub Pages deploys from `master` after the verification job succeeds.
- **Latest product release:** [`455118f`](https://github.com/konradszymanski/Crypto-Compare/commit/455118f23b0a9bc50ddb388ef9211399d8cd9a0c) — deterministic Playwright browser checks and CI integration, merged via [PR #12](https://github.com/konradszymanski/Crypto-Compare/pull/12).
- **Latest CI:** [PR verification](https://github.com/konradszymanski/Crypto-Compare/actions/runs/38136023098) and [production verification](https://github.com/konradszymanski/Crypto-Compare/actions/runs/38136104989) succeeded; [GitHub Pages deployment](https://github.com/konradszymanski/Crypto-Compare/actions/runs/38136104796) succeeded.
- **Current user-facing pages:** compare coins, Bitcoin cycles, market overview, and Events & Bitcoin.
- **Open GitHub work:** [#2 persist selected coins](https://github.com/konradszymanski/Crypto-Compare/issues/2). Issues #1, #3, and #4 are closed after their implementations and deployments were verified.

## Verified milestone — browser regression checks

- Added four Chromium scenarios for accessible, keyboard-operated search; duplicate prevention and removal; popular-coin fallback after a mocked 429; retry messaging after market-data rate limiting; and responsive desktop/mobile comparison rendering.
- All CoinGecko requests and external icons/fonts are mocked or blocked in tests, so CI is deterministic and uses no provider quota.
- PR #12 passed CI, merged to `master`, and its Pages deployment succeeded. Issue #4 is closed.

## Verified milestones

| Commit | Delivered |
| --- | --- |
| `81017fe` | Bitcoin halving-cycle comparison and resilient coin search |
| `738308e` | Ranked coin search results by exact ticker and market capitalization |
| `5fe0736` | Market overview and sourced event research pages |
| `c7b865b` | Selectable comparison currency, currency tests, and project progress log |
| `e1d7ec8` | Per-coin data freshness, safe refresh action, and refresh tests |
| `455118f` | Deterministic Chromium browser checks and CI integration |

## CI and release flow

Workflow: [`.github/workflows/pages.yml`](../.github/workflows/pages.yml), **Verify and deploy GitHub Pages**.

1. A pull request targeting `master`, a push to `master`, or a manual workflow dispatch starts verification.
2. Verification runs on Ubuntu with Node.js 20, installs locked development dependencies, checks JavaScript syntax for the application modules, runs the unit tests, installs Chromium, and runs deterministic Playwright browser tests.
3. The deploy job runs only after verification on a push to `master`. It configures GitHub Pages, uploads the static site, and deploys it with the `github-pages` environment.
4. Workflow permissions are read-only for verification; deployment receives only `pages: write` and `id-token: write` in addition to content read access.
5. After merging, confirm both the verification and Pages deployment runs succeed before treating the change as live.

Browser checks validate key accessibility semantics and the desktop/mobile comparison experience. CoinGecko and Binance are external services, so CI uses deterministic fixtures and does not make live market-data requests.

## Working agreement

- Keep each pull request focused and link the related GitHub Issue when there is one.
- Update `ROADMAP.md` when a planned capability ships; update this log with the release commit and CI/deployment result.
- Keep secrets out of the static client application. Treat provider limits and outages as normal failure cases.
- Keep unit tests on Node's built-in runner; use Playwright for behavior that requires a real browser and viewport layout.



