# Architecture

## Current shape

Crypto-Compare is a free, static, research-focused multi-page app. Its core workflow is to compare current market data with Bitcoin halving cycles and a curated, source-linked historical event timeline. `index.html` owns the comparison page; `cycles.html`, `market.html`, and `events.html` provide historical cycle, current market, and event-context views. Shared colors and base layout live in `styles.css`, while each research page has a small script and styles. Pure calculations live in `comparison-core.js`, `cycle-core.js`, and `event-core.js` so they can be checked without a browser. Vite builds each HTML page into optimized static assets in `dist/`; there is still no backend. ECharts renders the interactive research charts and is loaded only when a chart needs to render. A personal portfolio tracker is outside the current product scope.

## Data flow

1. The search input loads CoinGecko's coin list and filters it in the browser.
2. Selecting a suggestion requests market data in the selected comparison currency. The top-500 search ranking remains USD-based.
3. The selected coin store rejects duplicate IDs and becomes the source of truth for both desktop table and mobile card rendering.
4. The app formats returned values, displays CoinGecko's per-coin `last_updated` timestamp in the user's locale, and displays absent values with an em dash.
5. A manual refresh requests all selected coins as one market-data update. Results are applied only if every selected ID is present and the selection did not change while the request was pending; otherwise existing values stay in place.
6. Market Pulse requests CoinGecko global metrics and the top 100 assets by market cap with 7-day and 30-day changes, then saves the snapshot in browser storage for five minutes. It derives equal-weighted advance/decline counts and 7-day leaders/laggards from that same sample; these are descriptive, not a market-wide index.
7. The cycle explorer reads a checked-in monthly FRED snapshot for CPI inflation and the effective federal funds rate; a scheduled workflow proposes refreshed snapshots through pull requests. The chart aligns the latest BTC daily close in each month with separately scaled monthly macro observations, and shows each series’ observation date.
8. The events page keeps event metadata and citations in a curated list. When an event is selected, it requests full BTC daily history, falls back from CoinGecko to Binance candles, and computes a normalized 60-day window in `event-core.js`.

CoinGecko and Binance are external dependencies. Network errors, API limits, missing market fields, and API changes should be treated as expected conditions and surfaced clearly to the user. Market Pulse avoids adding category/trending endpoint calls until an authenticated-data architecture is available; API keys must not be embedded in the static client. Comparison currency is selected from a fixed supported list and persisted locally when browser storage is available. A currency change is applied only after fresh data for every selected coin is returned. Browser caches are best-effort and are not durable user data. Event-window comparisons are descriptive and must not claim causal effects.

## Boundaries to preserve

- Keep API requests, comparison state, formatting, and DOM rendering in distinct small responsibilities as the app grows.
- Render API-provided text as text; do not treat remote values as trusted HTML.
- Keep user-facing currency and units explicit.
- Keep shared dependencies page-scoped through Vite's module graph and document any new runtime library.

## Extension points

As features are added, consider extracting small modules for API access, formatting, and comparison state. A feature should have a clear source of truth for selected coins and define how loading, errors, empty values, and duplicate selections behave. These are future directions, not requirements to add abstractions before they are needed.



## Shared provider requests

The comparison, Market Pulse, and asset research pages use data-client.js for CoinGecko JSON requests. It de-duplicates in-flight requests, applies a 15-second timeout, normalizes HTTP, JSON, network, and timeout failures, and honors Retry-After with an origin cooldown. Opt-in session caches use explicit TTLs (coin search: six hours; Market Pulse: five minutes; asset profile/history: 30 minutes) and expose source plus cache timestamp metadata. Manual refresh bypasses fresh entries. Pages retain their composite snapshots and stale-data fallback; cycle/event historical source selection stays page-specific.
