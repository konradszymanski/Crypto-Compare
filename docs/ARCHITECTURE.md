# Architecture

## Current shape

Crypto-Compare is a static single-page app. `index.html` owns the page structure, `styles.css` owns presentation, and `script.js` handles CoinGecko requests and DOM rendering. `comparison-core.js` contains the selected coin store and value formatting so those behaviors can be checked without a browser. There is no package manager, bundler, backend, or persistence layer.

## Data flow

1. The search input loads CoinGecko's coin list and filters it in the browser.
2. Selecting a suggestion requests market data for that coin in USD.
3. The selected coin store rejects duplicate IDs and becomes the source of truth for both desktop table and mobile card rendering.
4. The app formats returned values and displays absent values with an em dash.

CoinGecko is an external dependency. Network errors, API limits, missing market fields, and API changes should be treated as expected conditions and surfaced clearly to the user.

## Boundaries to preserve

- Keep API requests, comparison state, formatting, and DOM rendering in distinct small responsibilities as the app grows.
- Render API-provided text as text; do not treat remote values as trusted HTML.
- Keep user-facing currency and units explicit.
- Avoid adding a build system or runtime dependency without a concrete need and documented setup.

## Extension points

As features are added, consider extracting small modules for API access, formatting, and comparison state. A feature should have a clear source of truth for selected coins and define how loading, errors, empty values, and duplicate selections behave. These are future directions, not requirements to add abstractions before they are needed.

