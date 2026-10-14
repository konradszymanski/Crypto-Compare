# Data and API plan

This plan expands Crypto-Compare as a free, research-focused tool. It describes possible product work, not an investment recommendation or a commitment to add every endpoint. CoinGecko endpoint access, quotas, and historical coverage must be checked against the current plan before implementation.

## Current data sources

- **CoinGecko public API:** coin search, comparison market data, global market metrics, market overview assets, and attempted historical chart data.
- **Binance public market-data API:** daily candle fallback used for long BTC price history when CoinGecko does not provide the required range.
- **Curated project data:** source-linked historical events and explanatory copy maintained with the site.
- **FRED static macro snapshot:** monthly effective federal funds rate and CPI inflation year over year, refreshed by a scheduled GitHub Actions pull request; no API key or browser request is required.
- **Browser storage:** best-effort short-lived caches; data may be unavailable across browsers or devices.

The app is a static Vite site deployed to GitHub Pages. There is no server to protect an API key. CoinGecko's Demo documentation currently describes authenticated requests and restricts historical chart data to the past 365 days. Consequently, Demo history alone cannot power full Bitcoin-cycle comparisons. Keep the Binance series labeled with its source and date range, and do not silently splice it with another provider's prices.

## Proposed product sequence

### 1. Market Pulse

**Purpose:** expand the existing Market Overview (`market.html`) into a broader view of market conditions without creating a competing overview page or turning trending attention into an investment signal.

Potential CoinGecko inputs:

- `/global` for total market capitalization, total volume, BTC/ETH dominance, and market counts.
- `/coins/categories` for category capitalization, volume, and changes; pair it with the categories list when needed.
- `/coins/markets` for ranked leaders and configurable 24-hour, 7-day, 30-day, 200-day, and 1-year performance fields.
- `/search/trending` for assets receiving recent search attention.

Potential presentation: a global market snapshot, sector/category leaders and laggards, a market breadth summary, and a clearly separated trending panel. Each module should show its last-updated time and a plain-language explanation of what the data does and does not measure.

**First implementation slice:** extend the existing overview using its current global and market-list requests, increase the market-cap-ranked sample to 100, and derive top-100 advance/decline counts plus 7-day leaders and laggards. Do not add separate categories or trending requests to the unauthenticated static client: the current CoinGecko Demo references show API-key authentication for these endpoints. Revisit those panels only after choosing a proxy or scheduled snapshot approach that keeps credentials out of the browser and limits extra API calls.

### 2. Asset research pages

**Purpose:** bring basic fundamentals, market context, and the existing cycle/event research together for one asset.

Potential CoinGecko inputs:

- `/coins/{id}` for coin metadata and supported market data.
- `/coins/markets` for rank, price, capitalization, volume, circulating/total/max supply, ATH/ATL, drawdown, and multi-period returns.
- `/coins/{id}/market_chart` or `/market_chart/range` for price, market capitalization, and volume series.
- `/coins/{id}/ohlc` when candle-based charts are useful and available on the selected plan.

Show source, currency, observation time, and earliest/latest date with every chart. The coin profile includes category metadata; the market-chart response contains price, market-cap, and volume series that can be selected without an additional request. Display current circulating supply relative to the reported maximum only when both are valid. CoinGecko's circulating/total-supply chart endpoints are plan-restricted, so do not infer or label market-cap divided by price as historical circulating supply.\n\nTreat missing history as a data-coverage boundary rather than filling it with invented values. A since-halving return is valid only when the asset's price series includes an observation within seven days after the halving date. The current Demo market-history range may not include the April 2024 baseline; show that limitation and link to the separately sourced BTC/ETH cycle explorer. Keep BTC full-cycle analysis on a source with the required historical range; explain provider/exchange differences when comparing series.

**First shipped slice:** link the leading Market Pulse assets to a reusable profile showing rank, price, market cap, volume, circulating/max supply, ATH/ATL, and daily USD history over up to one year. History loads only after opening an asset, is cached for the browser session, and displays the returned date range. CoinGecko is the sole source for this page; BTC cycle research remains on its separately labeled long-history source.

### 3. Public treasuries and macro context

**Purpose:** give long-term context about public-entity holdings and sourced macro events.

The Bitcoin Treasuries page uses a dated static snapshot of CoinGecko’s reported public-company and government holdings. The checked-in starter snapshot displays the 20 leading entries from CoinGecko’s public treasury page. A weekly/manual GitHub Actions workflow can fetch the Demo public-treasury endpoints with `COINGECKO_DEMO_API_KEY`, write a new full snapshot, and open a reviewable pull request. The key is never copied into browser assets. The workflow skips cleanly when the secret is not configured; in that case the dated starter snapshot remains usable. The data shows reported holdings and estimated USD values, not every institutional wallet; government holdings may include seized assets rather than strategic reserves. API data is refreshed only through a reviewed snapshot, not requested by site visitors.

The Events & Bitcoin page uses a small, manually curated, source-linked timeline, now including Federal Reserve decisions from March 2020, June 2022, and March 2023. Bitcoin Cycles adds a versioned FRED snapshot of the effective federal funds rate and CPI inflation year over year. A monthly GitHub Actions workflow refreshes the public CSV inputs and opens a reviewable pull request. The site serves the checked-in snapshot without an API key or runtime macro request. If data collection requires a credential, use a scheduled server-side workflow to fetch and publish a public snapshot; do not place the credential in browser code. Record observation dates, release dates, units, and source URLs. Keep event and macro/price comparisons descriptive and explicitly non-causal.

### 4. Market structure exploration (optional)

Evaluate CoinGecko derivatives exchange data (including any available open-interest fields) and GeckoTerminal's new/trending pools only after confirming Demo availability, coverage, freshness, and request costs. Keep these in a distinct exploratory view. Label venue coverage and caveats, and avoid presenting them as universal market measures or trade signals.

## Static-site and reliability rules

- Never embed Demo/Pro API credentials in shipped JavaScript, HTML, source maps, or public build artifacts.
- If a key is needed, choose between a small server-side proxy and a scheduled GitHub Actions snapshot. The latter keeps the site static but makes the output a delayed public snapshot.
- Group related reads, deduplicate in-flight requests, cache responses where permitted, and avoid polling. Load data on page entry or explicit user action.
- On rate limits and provider failures, retain usable cached data where possible, display the source timestamp and explain when a refresh can be retried. Never claim to know remaining anonymous quota if the provider does not expose it.
- Keep source/provider and date-range metadata alongside historical series. Do not combine different feeds without showing the boundary and methodology.
- Mock providers in CI. Tests must be deterministic and must not consume live API quota.
- Add a dependency only when its maintenance, bundle size, accessibility, license, and static-hosting behavior are acceptable.

## Validation before each API feature

1. Check the current endpoint reference and Demo/Pro availability.
2. Confirm per-page caps, rate/credit behavior, update cadence, historical limits, and attribution requirements.
3. Test CORS and representative success, empty, malformed, rate-limit, and offline responses from the deployed browser context.
4. Decide cache duration and stale-data behavior before wiring the endpoint into UI.
5. Add the source and coverage caveats to the page and project docs.
