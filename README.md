# Crypto-Compare

Crypto-Compare is a static cryptocurrency research dashboard. Compare live market snapshots, inspect BTC and ETH halving cycles, and explore Bitcoin price windows around sourced world and crypto events.

## Pages

- **Compare coins** (`index.html`): search for assets and compare live CoinGecko market data.
- **Bitcoin cycles** (`cycles.html`): compare BTC and ETH returns at the same number of days since each Bitcoin halving. Historical lines begin at the first available daily price on or after a halving. ETH history is naturally absent from the 2012 cycle.
- **Market overview** (`market.html`): view global market capitalization, trading volume, BTC/ETH market share, top assets, and distance from all-time highs.
- **Events & Bitcoin** (`events.html`): review a sourced timeline and compare BTC returns in a 30-day-before/30-day-after window.

The comparison page and research charts use CoinGecko's public API. Historical charts fall back to Binance public daily spot candles when CoinGecko is unavailable or rate limited. Provider availability and request limits can affect data loading; prices are daily values and may lag. The market and event pages cache responses in the browser when storage is available.

The event list is a curated set of linked historical milestones. Event windows show price timing for research; they do not establish causation. Bitcoin has no reliable market price history from its 2009 creation, and public providers cover different date ranges. The app reports its actual provider and date coverage.

Coin search uses the top 500 assets by market capitalization, puts exact ticker matches first, and falls back to a cached list or a short list of popular coins when CoinGecko is unavailable.

Search for coins and add them as columns to compare price, market data, supply, and all-time high and low values.

**Live demo:** [konradszymanski.github.io/Crypto-Compare](https://konradszymanski.github.io/Crypto-Compare/)

## Run locally

This is a static HTML, CSS, and JavaScript project with no build step or package installation. Open `index.html` in a browser, or serve the repository with any static file server. Searching and loading market data require an internet connection and availability of the data providers.

## Run checks

Use Node.js 18 or newer to run the built-in unit tests. No packages need to be installed:

```sh
node --test tests/comparison-core.test.js
```

## Project map

- `index.html` — page structure and comparison table
- `script.js` — CoinGecko requests, search, and responsive rendering
- `comparison-core.js` — selected coin state and market value formatting
- `market.html` / `market.js` — cached global snapshot and top asset view
- `events.html` / `events.js` — sourced event timeline and BTC window comparison
- `event-core.js` — event-window date and return calculations
- `styles.css` — page and table presentation
- `docs/ARCHITECTURE.md` — current design and boundaries
- `CONTRIBUTING.md` — workflow for changes
- `ROADMAP.md` — staged improvement ideas
- `SECURITY.md` — security reporting and data handling notes
- `tests/` — focused state and formatting tests using Node's built-in test runner

## Current limitations

- Market values are denominated in USD.
- Data freshness and availability depend on third-party providers.
- The app is static and has no backend; browser caches are optional and local to the device.
- The macro timeline is curated and intentionally small, not a comprehensive news feed.

See [ROADMAP.md](ROADMAP.md) for possible next steps.

