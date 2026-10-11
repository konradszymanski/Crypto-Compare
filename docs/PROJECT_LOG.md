# Project Progress Log

This log gives a concise record of shipped work, current in-flight changes, and the release process. Git history is the source of truth for code changes; GitHub Issues track actionable work; this file summarizes the project state at each release.

## Product decisions — 2026-10-11

- Prioritize historical halving-cycle and macro-event research.
- Keep the event experience curated and source-linked; price comparisons provide historical context and do not claim causation.
- Keep the app free and static, relying on public data and browser-side caching without client-side API secrets.
- Keep the product research-focused; a personal portfolio tracker is out of scope.

## Current state — 2026-10-11

- **Production:** GitHub Pages deploys from `master` after the verification job succeeds.
- **Latest production commit:** [`c7b865b`](https://github.com/konradszymanski/Crypto-Compare/commit/c7b865bf8d61b70f2c7093f4b1ddfd079b6c4373) — selectable comparison currency and project progress log, merged via [PR #9](https://github.com/konradszymanski/Crypto-Compare/pull/9).
- **Latest CI:** [PR verification](https://github.com/konradszymanski/Crypto-Compare/actions/runs/38130592208) and [production verification](https://github.com/konradszymanski/Crypto-Compare/actions/runs/38130636952) succeeded; [GitHub Pages deployment](https://github.com/konradszymanski/Crypto-Compare/actions/runs/38130636735) succeeded.
- **Current user-facing pages:** compare coins, Bitcoin cycles, market overview, and Events & Bitcoin.
- **Open GitHub work:** [#2 persist selected coins](https://github.com/konradszymanski/Crypto-Compare/issues/2), [#3 data freshness and refresh](https://github.com/konradszymanski/Crypto-Compare/issues/3), [#4 browser accessibility and responsive checks](https://github.com/konradszymanski/Crypto-Compare/issues/4). Issue #1 was closed after its implementation and production deployment were verified.

## Verified milestones

| Commit | Delivered |
| --- | --- |
| `81017fe` | Bitcoin halving-cycle comparison and resilient coin search |
| `738308e` | Ranked coin search results by exact ticker and market capitalization |
| `5fe0736` | Market overview and sourced event research pages |
| `c7b865b` | Selectable comparison currency, currency tests, and project progress log |

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

