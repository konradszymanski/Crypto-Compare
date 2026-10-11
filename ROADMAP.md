# Roadmap

This roadmap records useful directions for future work. It is not a promise or a fixed release plan; feature proposals should be scoped around user needs.

## Product direction

- Focus on research tools that put crypto prices in historical-cycle and sourced macro-event context.
- Keep the app free and static, with no backend or client-side secrets; prefer public data and browser-side caching.
- Present curated, source-linked events as context for price movements, not as proof of causation.
- A personal portfolio tracker is outside the current product scope.

## Foundations

- [x] Document the project, data flow, contribution workflow, and security notes.
- [x] Make coin search independent of the current top-market results and handle common search failures.
- [x] Prevent duplicate comparison entries and let users remove selected coins.
- [x] Keep comparison readable on small screens and clarify displayed units.
- [x] Add automated browser checks for search behavior and responsive rendering.
- [x] Persist selected coin IDs locally, refresh current prices on return, and provide a clear-comparison action.
- [ ] Separate API access, formatting, and UI state when a feature makes the current single script difficult to maintain.

## Candidate features

- [x] Add a market overview with global capitalization, volume, BTC/ETH dominance, top assets, and ATH drawdown context.
- [x] Add a sourced historical event timeline with BTC price-window comparisons and clear non-causal framing.
- [x] Select a display currency and make the selected currency visible in the table.
- [ ] Add sortable fields and clearer formatting for percentages and missing supply values.
- [ ] Add keyboard navigation and richer screen-reader feedback for search suggestions.
- [x] Persist a user's selected coins locally, with a clear way to reset them.
- [x] Add data freshness indicators and a deliberate refresh action.
- [ ] Expand the reviewed, source-linked historical events catalogue and add macro context that can be served without introducing paid data or client-side secrets.
- [ ] Add asset research pages with category context, supply history, and cycle-aware performance comparisons.

## Data and API roadmap

The detailed endpoint inventory, data constraints, and implementation rules are in [`docs/DATA_PLAN.md`](docs/DATA_PLAN.md). The sequence below prioritizes decision context and keeps provider limits visible.

### Phase 1 — Market Pulse

- [x] Expand the existing Market Overview page into Market Pulse using global metrics, market breadth, and leading assets without creating a duplicate overview page.
- [x] Show BTC market dominance, top-100 market breadth, and 24-hour/7-day/30-day changes with freshness timestamps.
- [ ] Add categories and trending searches only after selecting an authenticated-data approach that keeps credentials out of the static client.
- [ ] Keep trending content clearly labeled as attention/interest, not investment quality or a recommendation.

### Phase 2 — Asset research pages

- [ ] Add a reusable asset-detail view for market rank, supply, volume, ATH/ATL, and available historical performance.
- [ ] Show the source and available date range for every historical series; avoid silently joining prices from different exchanges or providers.
- [ ] Preserve exchange-level long-history fallbacks for BTC where CoinGecko Demo history does not cover full cycles.

### Phase 3 — Holdings and macro context

- [ ] Evaluate public company/government treasury endpoints and add a sourced holdings view if Demo access and data coverage are adequate.
- [ ] Expand sourced macro context with reviewed public datasets and explicit release dates; prefer static, versioned data files for the GitHub Pages app.
- [ ] Keep events and macro observations descriptive and avoid causal or predictive claims.

### Phase 4 — Market structure (optional, after validation)

- [ ] Evaluate derivatives exchange/open-interest data and GeckoTerminal pool activity for a separate market-structure view.
- [ ] Confirm endpoint availability, plan requirements, freshness, and request costs before implementation.
- [ ] Label on-chain and derivatives indicators as partial, venue-specific observations; do not present them as buy/sell signals.

### Shared data foundations

- [ ] Extract a small provider client for request deduplication, timeout/error mapping, cache policy, and rate-limit backoff as these pages are added.
- [ ] Load data only when a page or user action needs it; use stale cached data with a visible timestamp when refresh fails.
- [ ] Never ship provider secrets in browser JavaScript. For authenticated data, choose a server-side proxy or a scheduled GitHub Actions data snapshot before adding the endpoint.
- [ ] Add deterministic fixtures for every new provider-backed feature; CI must not make live market-data calls.

## Product questions for later

- Which comparison fields matter most, and should users be able to choose them?
- Should users be able to share their comparison selections as a link?
- What browser support and accessibility target should guide UI work?


