# Crypto-Compare

Crypto-Compare is a static cryptocurrency research dashboard. Compare live market snapshots, inspect BTC and ETH halving cycles, and explore Bitcoin price windows around sourced world and crypto events.

## Pages

- **Compare coins** (`index.html`): search for assets and compare live CoinGecko market data.
- **Bitcoin cycles** (`cycles.html`): compare BTC and ETH returns at the same number of days since each Bitcoin halving. Historical lines begin at the first available daily price on or after a halving. ETH history is naturally absent from the 2012 cycle.
- **Market Pulse** (`market.html`): view global capitalization, trading volume, BTC/ETH market share, top-100 participation, 7-day leaders/laggards, and leading assets across 24-hour, 7-day, and 30-day periods.
- **Asset research** (`asset.html?id=bitcoin`): inspect an asset's categories, current supply context, market rank, ATH/ATL, and daily USD price, market-cap, or volume history. The page reports whether its available history includes the latest halving baseline.
- **Events & Bitcoin** (`events.html`): review a sourced timeline and compare BTC returns in a 30-day-before/30-day-after window.
- **Bitcoin treasuries** (`treasuries.html`): explore CoinGecko’s dated reported holdings by public companies and governments, with searchable, sortable records and an estimate of each holding’s share of Bitcoin’s 21M maximum supply.
- **DEX activity** (`structure.html`): inspect GeckoTerminal’s current trending pools by network, with reported liquidity, volume, price change, and transaction counts. This is a partial on-chain discovery feed, not a market-wide measure or signal.

The comparison page and research charts use CoinGecko's public API. Historical charts fall back to Binance public daily spot candles when CoinGecko is unavailable or rate limited. Provider availability and request limits can affect data loading; prices are daily values and may lag. The market and event pages cache responses in the browser when storage is available.

Treasury data is a dated CoinGecko snapshot. The starter file lists the 20 largest entities visible on the source page; a scheduled GitHub Actions workflow can refresh the full returned directory into a reviewable pull request when the repository secret `COINGECKO_DEMO_API_KEY` is configured. The key is used only by the workflow and is never shipped to the website. Government records may include seized holdings and do not necessarily represent policy reserves.

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
- `market.html` / `market.js` — cached global snapshot, market breadth, top asset and mover views
- `asset.html` / `asset.js` — on-demand asset fundamentals, category context, selectable price/market-cap/volume history, and halving-baseline coverage
- `events.html` / `events.js` — sourced event timeline and BTC window comparison
- `treasuries.html` / `treasuries.js` — dated Bitcoin treasury snapshot, entity filters, and holdings comparison
- `structure.html` / `structure.js` — on-demand GeckoTerminal pool activity with network filtering, browser caching, and coverage caveats
- `event-core.js` — event-window date and return calculations
- `styles.css` — page and table presentation
- `vite.config.js` — multi-page build and relative asset paths for GitHub Pages
- `cycles.js` / `events.js` — research page logic and interactive ECharts visualizations
- `chart-kit.js` — shared, deferred ECharts setup used by research pages
- `docs/ARCHITECTURE.md` — current design and boundaries
- `docs/PROJECT_LOG.md` — shipped milestones, active work, and CI/CD release flow
- `CONTRIBUTING.md` — workflow for changes
- `ROADMAP.md` — staged improvement ideas
- `docs/DATA_PLAN.md` — API endpoint candidates, coverage constraints, and staged data strategy
- `SECURITY.md` — security reporting and data handling notes
- `tests/` — state/formatting unit tests and deterministic Playwright browser checks
- `playwright.config.js` — browser test configuration and local static server

## Current limitations

- The comparison page supports USD, EUR, GBP, JPY, CAD, and AUD. Currency changes request fresh market data and are saved locally when browser storage is available. Market Pulse remains denominated in USD.
- Selected coin IDs and display metadata are saved locally in this browser. Current prices are fetched again on return; stored prices are never reused. Use **Clear comparison** to remove the saved selection. If browser storage is unavailable, the current session still works without persistence.
- Data freshness and availability depend on third-party providers.
- The app is static and has no backend; browser caches are optional and local to the device.
- Asset history uses only CoinGecko's returned daily observations for up to the available one-year window; the page does not join series from different sources. Historical circulating supply is not currently available through the selected free plan, so only current supply fields and the reported circulating-to-maximum ratio are shown.
- The treasury page’s initial snapshot shows the top 20 source-page entities, not the full 193-entity directory. Full refreshes require the optional `COINGECKO_DEMO_API_KEY` Actions secret; otherwise the checked-in snapshot remains available.
- The macro timeline is curated and intentionally small, not a comprehensive news feed.

See [ROADMAP.md](ROADMAP.md) for possible next steps.


