# Architecture

## Current shape

Crypto-Compare is a static multi-page app. `index.html` owns the comparison page; `cycles.html`, `market.html`, and `events.html` provide historical cycle, current market, and event-context views. Shared colors and base layout live in `styles.css`, while each research page has a small script and styles. Pure calculations live in `comparison-core.js`, `cycle-core.js`, and `event-core.js` so they can be checked without a browser. There is no package manager, bundler, or backend.

## Data flow

1. The search input loads CoinGecko's coin list and filters it in the browser.
2. Selecting a suggestion requests market data in the selected comparison currency. The top-500 search ranking remains USD-based.
3. The selected coin store rejects duplicate IDs and becomes the source of truth for both desktop table and mobile card rendering.
4. The app formats returned values and displays absent values with an em dash.
5. The market overview requests CoinGecko global metrics and the leading market assets, then saves the snapshot in browser storage for five minutes.
6. The events page keeps event metadata and citations in a curated list. When an event is selected, it requests full BTC daily history, falls back from CoinGecko to Binance candles, and computes a normalized 60-day window in `event-core.js`.

CoinGecko and Binance are external dependencies. Network errors, API limits, missing market fields, and API changes should be treated as expected conditions and surfaced clearly to the user. Comparison currency is selected from a fixed supported list and persisted locally when browser storage is available. A currency change is applied only after fresh data for every selected coin is returned. Browser caches are best-effort and are not durable user data. Event-window comparisons are descriptive and must not claim causal effects.

## Boundaries to preserve

- Keep API requests, comparison state, formatting, and DOM rendering in distinct small responsibilities as the app grows.
- Render API-provided text as text; do not treat remote values as trusted HTML.
- Keep user-facing currency and units explicit.
- Avoid adding a build system or runtime dependency without a concrete need and documented setup.

## Extension points

As features are added, consider extracting small modules for API access, formatting, and comparison state. A feature should have a clear source of truth for selected coins and define how loading, errors, empty values, and duplicate selections behave. These are future directions, not requirements to add abstractions before they are needed.

