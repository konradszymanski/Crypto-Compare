# Project Progress Log

This log gives a concise record of shipped work, current in-flight changes, and the release process. Git history is the source of truth for code changes; GitHub Issues track actionable work; this file summarizes the project state at each release.

## Product decisions — 2026-10-11

- Prioritize historical halving-cycle and macro-event research.
- Keep the event experience curated and source-linked; price comparisons provide historical context and do not claim causation.
- Keep the app free and static, relying on public data and browser-side caching without client-side API secrets.
- Keep the product research-focused; a personal portfolio tracker is out of scope.

## Current state — 2026-10-11

- **Production:** GitHub Pages deploys from `master` after the verification job succeeds.
- **Latest product release:** [`e1d7ec8`](https://github.com/konradszymanski/Crypto-Compare/commit/e1d7ec86ff43b511f4978d4ec583ff9330401c0a) — per-coin data freshness and safe refresh, merged via [PR #11](https://github.com/konradszymanski/Crypto-Compare/pull/11).
- **Latest CI:** [PR verification](https://github.com/konradszymanski/Crypto-Compare/actions/runs/38132186081) and [production verification](https://github.com/konradszymanski/Crypto-Compare/actions/runs/38132228218) succeeded; [GitHub Pages deployment](https://github.com/konradszymanski/Crypto-Compare/actions/runs/38132227677) succeeded.
- **Current user-facing pages:** compare coins, Bitcoin cycles, market overview, and Events & Bitcoin.
- **Open GitHub work:** [#2 persist selected coins](https://github.com/konradszymanski/Crypto-Compare/issues/2), [#4 browser accessibility and responsive checks](https://github.com/konradszymanski/Crypto-Compare/issues/4). Issues #1 and #3 were closed after their implementations and production deployments were verified.

## In progress — browser regression checks

- Add Playwright coverage for accessible search controls, keyboard selection, duplicate prevention, remove behavior, CoinGecko rate-limit fallback, retry messaging, and desktop/mobile comparison layouts.
- Mock provider responses in browser tests so checks are deterministic and consume no live API quota.
- Extend the Pages verification workflow to install Chromium and run the browser suite alongside existing unit tests.
- Issue #4 can be closed after the pull request passes CI and the checks are merged.

## Verified milestones

| Commit | Delivered |
| --- | --- |
| `81017fe` | Bitcoin halving-cycle comparison and resilient coin search |
| `738308e` | Ranked coin search results by exact ticker and market capitalization |
| `5fe0736` | Market overview and sourced event research pages |
| `c7b865b` | Selectable comparison currency, currency tests, and project progress log |
| `e1d7ec8` | Per-coin data freshness, safe refresh action, and refresh tests |

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



