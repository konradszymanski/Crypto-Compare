# Crypto-Compare

Crypto-Compare is a small, static cryptocurrency dashboard. It lets you compare current market data and explore Bitcoin halving cycles.

## Pages

- **Compare coins** (`index.html`): search for assets and compare live CoinGecko market data.
- **Bitcoin cycles** (`cycles.html`): compare BTC and ETH returns at the same number of days since each Bitcoin halving. Historical lines begin at the first available daily price on or after a halving. ETH history is naturally absent from the 2012 cycle.

The comparison page and cycle chart use CoinGecko's public API. The cycle chart falls back to Binance's public BTC/USDT and ETH/USDT daily candles when CoinGecko is unavailable or rate limited. Provider availability and request limits can affect data loading; prices are daily values and may lag.

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
- `styles.css` — page and table presentation
- `docs/ARCHITECTURE.md` — current design and boundaries
- `CONTRIBUTING.md` — workflow for changes
- `ROADMAP.md` — staged improvement ideas
- `SECURITY.md` — security reporting and data handling notes
- `tests/` — focused state and formatting tests using Node's built-in test runner

## Current limitations

- Market values are denominated in USD.
- Data freshness and availability depend on third-party providers.
- The app is a static client-side page with no backend or persistence.

See [ROADMAP.md](ROADMAP.md) for possible next steps.

