# Project Progress Log

This log gives a concise record of shipped work, current in-flight changes, and the release process. Git history is the source of truth for code changes; GitHub Issues track actionable work; this file summarizes the project state at each release.

## Product decisions — 2026-10-11

- Prioritize historical halving-cycle and macro-event research.
- Keep the event experience curated and source-linked; price comparisons provide historical context and do not claim causation.
- Keep the app free and static, relying on public data and browser-side caching without client-side API secrets.
- Keep the product research-focused; a personal portfolio tracker is out of scope.

## Current state — 2026-10-11

- **Production:** GitHub Pages deploys from `master` after verification succeeds.
- **Latest product release:** [`7a2d536`](https://github.com/konradszymanski/Crypto-Compare/commit/7a2d5364187d1602df6156afe22be11029fdc376) — Vite production build, deferred ECharts charts, on-demand cycle history, and updated project documentation, merged via [PR #13](https://github.com/konradszymanski/Crypto-Compare/pull/13).
- **Latest CI and deployment:** [workflow run #21](https://github.com/konradszymanski/Crypto-Compare/actions/runs/38160702955) passed production build, syntax checks, unit tests, Chromium browser tests, and GitHub Pages deployment.
- **Current user-facing pages:** compare coins, Bitcoin cycles, market overview, and Events & Bitcoin.
- **Open GitHub work:** [#2 persist selected coins](https://github.com/konradszymanski/Crypto-Compare/issues/2). Issues #1, #3, and #4 are closed after their implementations and deployments were verified.

## Data roadmap — 2026-10-11

- Added a staged API/product plan in [`DATA_PLAN.md`](DATA_PLAN.md), covering Market Pulse, asset research, public treasuries and macro context, and optional market-structure views.
- Added implementation constraints to [`ROADMAP.md`](../ROADMAP.md): no client-side secrets, disclose data source and coverage, cache and load on demand, and mock providers in CI.
- CoinGecko Demo historical chart coverage is documented as limited to the past 365 days in the current endpoint reference. Full BTC cycle research therefore continues to require an explicitly labeled long-history source such as the existing Binance daily-candle fallback.
- Market Pulse is the next proposed product feature; endpoint access and quotas must be confirmed against the current CoinGecko plan before implementation.

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
2. Verification runs on Ubuntu with Node.js 22, installs locked dependencies, builds the four-page site, checks core and test JavaScript syntax, runs the unit tests, installs Chromium, and runs deterministic Playwright browser tests against `dist/`.
3. The deploy job runs only after verification on a push to `master`. It rebuilds `dist/`, configures GitHub Pages, uploads that output, and deploys it with the `github-pages` environment.
4. Workflow permissions are read-only for verification; deployment receives only `pages: write` and `id-token: write` in addition to content read access.
5. After merging, confirm both the verification and Pages deployment runs succeed before treating the change as live.

Browser checks validate key accessibility semantics and the desktop/mobile comparison experience. CoinGecko and Binance are external services, so CI uses deterministic fixtures and does not make live market-data requests.

## Working agreement

- Keep each pull request focused and link the related GitHub Issue when there is one.
- Update `ROADMAP.md` when a planned capability ships; update this log with the release commit and CI/deployment result.
- Keep secrets out of the static client application. Treat provider limits and outages as normal failure cases.
- Keep unit tests on Node's built-in runner; use Playwright for behavior that requires a real browser and viewport layout.



