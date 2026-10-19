# Project Progress Log

This log gives a concise record of shipped work, current in-flight changes, and the release process. Git history is the source of truth for code changes; GitHub Issues track actionable work; this file summarizes the project state at each release.

## Product decisions — 2026-10-11

- Prioritize historical halving-cycle and macro-event research.
- Keep the event experience curated and source-linked; price comparisons provide historical context and do not claim causation.
- Keep the app free and static, relying on public data and browser-side caching without client-side API secrets.
- Keep the product research-focused; a personal portfolio tracker is out of scope.

## Current state — 2026-10-19

- **Production:** GitHub Pages deploys from `master` after verification succeeds.
- **Latest product release:** [PR #45](https://github.com/konradszymanski/Crypto-Compare/pull/45) — public DEX activity research; merged as [`b6bc2a4`](https://github.com/konradszymanski/Crypto-Compare/commit/b6bc2a4988a1bbf05e53b648a74892859e99d54e).
- **Latest CI and deployment:** PR #45 verification [run #82](https://github.com/konradszymanski/Crypto-Compare/actions/runs/39312450653) passed build, syntax, unit, and browser checks. Master verification [run #83](https://github.com/konradszymanski/Crypto-Compare/actions/runs/39312592440) and Pages deployment [run #33](https://github.com/konradszymanski/Crypto-Compare/actions/runs/39312591753) succeeded.
- **Project docs:** README, architecture, roadmap, data plan, and this progress log document the current product and static-site constraints.
- **Current user-facing pages:** compare coins, Bitcoin cycles, Market Pulse, Asset research, Events & Bitcoin, Bitcoin treasuries, and DEX activity.
- **Open GitHub work:** none. Issue [#44 DEX activity research](https://github.com/konradszymanski/Crypto-Compare/issues/44) closed via PR #45. Issue #40 closed via PR #41; issues #22 and #38 were closed after their implementations, while #2, #17, #19, #1, #3, and #4 were closed in earlier releases.

### Shipped — Market Pulse

- Expand the existing market overview with market participation across the top 100 assets, 24-hour/7-day/30-day returns for the top 20, and 7-day leaders/laggards.
- Use the existing global and market-list requests, browser cache, and stale-data handling. Keep authenticated category/trending endpoints deferred until the static site has a safe server-side or scheduled-snapshot data path.
- [PR #15](https://github.com/konradszymanski/Crypto-Compare/pull/15) merged as [`b7b041f`](https://github.com/konradszymanski/Crypto-Compare/commit/b7b041f5a7e6981b03398cb97dc8dc36cdae056b); workflow #26 passed and deployed.

### Shipped — saved comparison

- Persist selected coin IDs and non-price display metadata in local browser storage; refresh prices from CoinGecko on return.
- Provide a clear-comparison action and retain saved selections when storage or provider requests fail.
- [PR #16](https://github.com/konradszymanski/Crypto-Compare/pull/16) merged as [`f6e2c8d`](https://github.com/konradszymanski/Crypto-Compare/commit/f6e2c8d07f9820235d639a4f0dbbecc87de1ffa2); issue #2 is closed. Verification #28 and Pages deployment #15 succeeded.
### Shipped — asset research

- Add CoinGecko fundamentals and a daily USD price chart for linked Market Pulse assets; show source, actual date coverage, and cache freshness.
- Keep long Bitcoin cycle history on its separately disclosed source, with no silent provider joins.
- [PR #18](https://github.com/konradszymanski/Crypto-Compare/pull/18) merged as [`13226f7`](https://github.com/konradszymanski/Crypto-Compare/commit/13226f72b24f4321cdc56d3926fabeb6cdbbc2bb); verification #31 and Pages deployment #16 succeeded, and issue #17 is closed.

### Shipped — macro event timeline

- Add March 2020, June 2022, and March 2023 Federal Reserve milestones with primary-source links and non-causal context.
- [PR #20](https://github.com/konradszymanski/Crypto-Compare/pull/20) merged as [`000b9db`](https://github.com/konradszymanski/Crypto-Compare/commit/000b9db85d2634d4c3bfb447dc973302b05647e5); verification #33 and Pages deployment #17 succeeded, and issue #19 is closed.

## Data roadmap — 2026-10-11

- Added a staged API/product plan in [`DATA_PLAN.md`](DATA_PLAN.md), covering Market Pulse, asset research, public treasuries and macro context, and optional market-structure views.
- Added implementation constraints to [`ROADMAP.md`](../ROADMAP.md): no client-side secrets, disclose data source and coverage, cache and load on demand, and mock providers in CI.
- CoinGecko Demo historical chart coverage is documented as limited to the past 365 days in the current endpoint reference. Full BTC cycle research therefore continues to require an explicitly labeled long-history source such as the existing Binance daily-candle fallback.
- Market Pulse shipped in PR #15. Saved comparison shipped in PR #16. Asset research shipped in PR #18. The curated Fed event timeline shipped in PR #20; subsequent roadmap work added the FRED macro snapshot and Bitcoin treasury research.


### Shipped — historical macro context

- Add a monthly Bitcoin price and U.S. macro chart to the Bitcoin cycle explorer, with separate price and percentage panels.
- Version FRED effective federal funds and CPI year-over-year data in the repository. Show independent observation months and describe the time relationship without implying causation.
- Refresh public FRED CSV snapshots through a monthly GitHub Actions pull request. No API key is shipped to the static site.
- Tracked by [issue #22](https://github.com/konradszymanski/Crypto-Compare/issues/22).

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





## Comparison sorting — 2026-10-12

- Added local sorting of compared assets by numeric market metrics, with rank ascending by default and descending defaults for other metrics.
- Kept missing values at the bottom in both directions and ties in their original selection order.
- Applied the same sort to the desktop table and mobile cards without issuing another market-data request.
- Tracked by [issue #29](https://github.com/konradszymanski/Crypto-Compare/issues/29); pull request closes the issue.


## Clearer comparison values — 2026-10-12

- Positive percentage changes include an explicit plus sign; negative changes retain their minus sign and use restrained red styling. Sign text keeps direction understandable without color.
- Missing circulating, total, and maximum supply values display “Not reported”; other unavailable values retain the dash.
- Tracked by [issue #31](https://github.com/konradszymanski/Crypto-Compare/issues/31); pull request closes the issue.


## Search accessibility — 2026-10-13

- Added a dedicated polite live region for search progress, result counts, empty results, and active keyboard option positions.
- Added visible keyboard instructions; kept the result list itself out of live announcements to reduce duplicate announcements.
- Updated the existing browser scenario to check result-count and active-option announcements.
- Tracked by [issue #33](https://github.com/konradszymanski/Crypto-Compare/issues/33); pull request closes the issue.


## Shared provider request handling — 2026-10-13

- Added shared browser-side CoinGecko JSON request handling for comparison search and market data.
- The client de-duplicates identical in-flight requests, applies a 15-second timeout, normalizes HTTP/JSON/network errors, and honors Retry-After (including HTTP-date values) with an origin-level cooldown after HTTP 429.
- Existing cached coin-list fallback and page freshness behaviors remain in place; other research pages are deferred until their separate cache behavior is validated.
- Tracked by [issue #34](https://github.com/konradszymanski/Crypto-Compare/issues/34); pull request closes the issue.


## Shared provider cache rollout — 2026-10-13

- Added opt-in per-request session caching with explicit cache keys and TTLs, source labels, and cache timestamps; forced refresh bypasses fresh entries.
- Migrated Market Pulse (five minutes) and asset profile/history (30 minutes), retaining their page-level snapshots and stale-on-refresh-failure behavior.
- Added deterministic tests for cache freshness, forced refresh, in-flight de-duplication, and HTTP 429 Retry-After cooldown.
- Tracked by [issue #34](https://github.com/konradszymanski/Crypto-Compare/issues/34); this PR completes the remaining rollout.


## In review — asset research context — 2026-10-13

- Add CoinGecko category tags and a current circulating-to-maximum supply ratio to asset research.
- Allow one-year price, market-cap, and volume history to be explored from the existing history response.
- Report the latest Bitcoin-halving comparison only when a valid post-halving baseline exists in the asset history. If it does not, show the date-coverage gap and link to the established BTC/ETH cycle page.
- Historical circulating-supply charts are deferred: the provider documents those endpoints as plan-restricted. Do not treat market-cap divided by price as official supply history.
- Tracked by [issue #38](https://github.com/konradszymanski/Crypto-Compare/issues/38), closed by PR #39.


## Bitcoin treasury research — 2026-10-14

- Added a Bitcoin treasury page with the source snapshot date, reported BTC holdings, estimated USD values, entity type/country filters, and a top-holdings visualization.
- The initial checked-in snapshot shows the leading 20 entities from CoinGecko's public treasury page and identifies itself as partial. Weekly/manual refresh uses CoinGecko Demo API from a GitHub Actions secret and opens a reviewable pull request; a missing secret skips the refresh while preserving the existing public snapshot.
- No key is included in the static site. The page explains that government holdings may include seized assets and that the figures do not establish intent or predict returns.
- Tracked by [issue #40](https://github.com/konradszymanski/Crypto-Compare/issues/40).


### Shipped — DEX activity research

- Added an on-demand GeckoTerminal trending-pools page with all-network and network-specific views. It reports pool-level liquidity, 24-hour volume, price movement, and buys/sells when available, with one-minute session caching and stale-data messaging.
- Documented partial venue coverage and the low, variable public API limit. CoinGecko derivatives/open-interest data remains deferred because the exchange endpoint requires a Pro API key and the static browser must not contain credentials.
- Issue #44 closed by [PR #45](https://github.com/konradszymanski/Crypto-Compare/pull/45), merged as [`b6bc2a4`](https://github.com/konradszymanski/Crypto-Compare/commit/b6bc2a4988a1bbf05e53b648a74892859e99d54e). PR verification #82, master verification #83, and Pages deployment #33 all succeeded.
