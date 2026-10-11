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

Search for coins and add them as columns to compare price, market data, supply, and all-time high and low values. Each asset includes CoinGecko's reported data update time, and the comparison can be refreshed on demand.

**Live demo:** [konradszymanski.github.io/Crypto-Compare](https://konradszymanski.github.io/Crypto-Compare/)

## Run locally

This is a static, multi-page Vite app hosted on GitHub Pages. Vite bundles page-specific JavaScript and CSS into optimized static files; the site still has no application server or backend. Use Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

Vite prints the local URL. Production output goes to `dist/` and can be previewed with `npm run build` followed by `npm run preview`.

## Run checks

Install the dependencies, then run the unit and browser checks:

```sh
npm ci
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests mock CoinGecko responses, so they do not depend on live API availability or consume provider quota. The Playwright suite runs Chromium at desktop width and checks a narrow mobile viewport.

## Project map

- `index.html` — page structure and comparison table
- `script.js` — CoinGecko requests, search, and responsive rendering
- `comparison-core.js` — selected coin state and market value formatting
- `market.html` / `market.js` — cached global snapshot and top asset view
- `events.html` / `events.js` — sourced event timeline and BTC window comparison
- `event-core.js` — event-window date and return calculations
- `styles.css` — page and table presentation
- `vite.config.js` — four-page build and relative asset paths for GitHub Pages
- `cycles.js` / `events.js` — research page logic and interactive ECharts visualizations
- `chart-kit.js` — shared, deferred ECharts setup used by research pages
- `docs/ARCHITECTURE.md` — current design and boundaries
- `docs/PROJECT_LOG.md` — shipped milestones, active work, and CI/CD release flow
- `CONTRIBUTING.md` — workflow for changes
- `ROADMAP.md` — staged improvement ideas
- `SECURITY.md` — security reporting and data handling notes
- `tests/` — state/formatting unit tests and deterministic Playwright browser checks
- `playwright.config.js` — browser test configuration and local static server

## Current limitations

- The comparison page supports USD, EUR, GBP, JPY, CAD, and AUD. Currency changes request fresh market data and are saved locally when browser storage is available. The market overview remains denominated in USD.
- Data freshness and availability depend on third-party providers.
- The app is static and has no backend; browser caches are optional and local to the device.
- The macro timeline is curated and intentionally small, not a comprehensive news feed.

See [ROADMAP.md](ROADMAP.md) for possible next steps.


