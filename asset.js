const API = 'https://api.coingecko.com/api/v3';
const id = new URLSearchParams(window.location.search).get('id') || '';
const safeId = /^[a-z0-9-]+$/i.test(id) ? id : '';
const cacheKey = `crypto-compare-asset-${safeId}-v1`;
const cacheTtl = 30 * 60 * 1000;
const status = document.getElementById('asset-status');
const refreshButton = document.getElementById('refresh-asset');
let chart;
let loading = false;

function compactCurrency(value) {
    return Number.isFinite(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumSignificantDigits: 4 }).format(value) : 'Unavailable';
}

function priceCurrency(value) {
    return Number.isFinite(value) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 8 }).format(value) : 'Unavailable';
}

function number(value) {
    return Number.isFinite(value) ? new Intl.NumberFormat('en-US', { maximumSignificantDigits: 7 }).format(value) : 'Unavailable';
}

function percentage(value) {
    return Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : 'Unavailable';
}

function readCache() {
    try {
        const value = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
        return value && Array.isArray(value.history?.prices) && value.details ? value : null;
    } catch {
        return null;
    }
}

function saveCache(value) {
    try {
        sessionStorage.setItem(cacheKey, JSON.stringify(value));
    } catch {
        // Keep the page usable when session storage is full or disabled.
    }
}

function renderDetails(coin) {
    const market = coin.market_data || {};
    document.title = `${coin.name || id} research · Crypto-Compare`;
    document.getElementById('asset-title').textContent = `${coin.name || id} (${String(coin.symbol || '').toUpperCase()})`;
    document.getElementById('asset-intro').textContent = coin.description?.en
        ? `${coin.name} market profile and price history. ${coin.description.en.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)}${coin.description.en.length > 200 ? '…' : ''}`
        : `Market profile and available price history for ${coin.name || id}.`;
    document.getElementById('asset-price').textContent = priceCurrency(market.current_price?.usd);
    document.getElementById('asset-market-cap').textContent = compactCurrency(market.market_cap?.usd);
    document.getElementById('asset-rank').textContent = Number.isFinite(market.market_cap_rank) ? `Market cap rank #${market.market_cap_rank}` : 'Market cap rank unavailable';
    document.getElementById('asset-volume').textContent = compactCurrency(market.total_volume?.usd);
    document.getElementById('asset-supply').textContent = number(market.circulating_supply);
    document.getElementById('asset-max-supply').textContent = `Maximum supply: ${number(market.max_supply)}`;
    document.getElementById('asset-ath').textContent = priceCurrency(market.ath?.usd);
    document.getElementById('asset-ath-distance').textContent = `Distance from ATH: ${percentage(market.ath_change_percentage?.usd)}`;
    document.getElementById('asset-atl').textContent = priceCurrency(market.atl?.usd);
    document.getElementById('asset-atl-date').textContent = market.atl_date?.usd ? `Recorded ${new Date(market.atl_date.usd).toLocaleDateString()}` : 'Date unavailable';
}

async function renderChart(prices, stale = false) {
    const valid = prices.filter(point => Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]));
    if (!valid.length) throw new Error('No usable daily price observations were returned.');
    const { echarts } = await import('./chart-kit.js');
    const element = document.getElementById('asset-chart');
    chart?.dispose();
    chart = echarts.init(element);
    chart.setOption({
        animation: false,
        grid: { left: 72, right: 28, top: 24, bottom: 58 },
        tooltip: {
            trigger: 'axis',
            valueFormatter: value => priceCurrency(value),
            axisPointer: { type: 'line' }
        },
        xAxis: {
            type: 'time',
            axisLabel: { color: '#b7c9c6' },
            axisLine: { lineStyle: { color: '#496668' } },
            splitLine: { show: false }
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisLabel: { color: '#b7c9c6', formatter: value => priceCurrency(value) },
            splitLine: { lineStyle: { color: 'rgba(175,194,191,0.12)' } }
        },
        series: [{
            name: 'Daily price',
            type: 'line',
            showSymbol: false,
            smooth: false,
            data: valid,
            lineStyle: { color: '#68d1c2', width: 2 },
            areaStyle: { color: 'rgba(104,209,194,0.12)' }
        }]
    });
    const start = new Date(valid[0][0]).toLocaleDateString();
    const end = new Date(valid[valid.length - 1][0]).toLocaleDateString();
    document.getElementById('asset-chart-summary').textContent = `${stale ? 'Showing cached data. ' : ''}${valid.length} daily price observations from ${start} to ${end}. Source: CoinGecko. No other provider is mixed into this series.`;
}

function setBusy(busy) {
    loading = busy;
    refreshButton.disabled = busy || !safeId;
    refreshButton.textContent = busy ? 'Loading…' : 'Refresh data';
}

async function load(force = false) {
    if (!safeId || loading) return;
    const cached = readCache();
    if (!force && cached && Date.now() - cached.savedAt < cacheTtl) {
        renderDetails(cached.details);
        await renderChart(cached.history.prices);
        document.getElementById('asset-freshness').textContent = `Cached from ${new Date(cached.savedAt).toLocaleString()}. Current prices and historical observations may be delayed.`;
        status.textContent = 'Showing a recent cached asset snapshot.';
        refreshButton.disabled = false;
        return;
    }
    setBusy(true);
    status.textContent = `Loading ${safeId} market profile and daily history…`;
    const coinUrl = `${API}/coins/${encodeURIComponent(safeId)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
    const historyUrl = `${API}/coins/${encodeURIComponent(safeId)}/market_chart?vs_currency=usd&days=365`;
    try {
        const responses = await Promise.all([fetch(coinUrl), fetch(historyUrl)]);
        const failed = responses.find(response => !response.ok);
        if (failed) {
            const error = new Error(`CoinGecko request failed (HTTP ${failed.status}).`);
            error.status = failed.status;
            throw error;
        }
        const [details, history] = await Promise.all(responses.map(response => response.json()));
        if (!details || typeof details !== 'object' || !Array.isArray(history?.prices)) throw new Error('CoinGecko returned incomplete asset data.');
        const snapshot = { details, history, savedAt: Date.now() };
        saveCache(snapshot);
        renderDetails(details);
        await renderChart(history.prices);
        const providerUpdated = details.last_updated ? new Date(details.last_updated).toLocaleString() : 'not reported';
        document.getElementById('asset-freshness').textContent = `CoinGecko asset data updated ${providerUpdated}. The daily history covers only the dates shown below; observations can lag.`;
        status.textContent = 'Asset research data loaded.';
    } catch (error) {
        if (cached) {
            renderDetails(cached.details);
            try {
                await renderChart(cached.history.prices, true);
            } catch (chartError) {
                document.getElementById('asset-chart-summary').textContent = chartError.message;
            }
            document.getElementById('asset-freshness').textContent = `Refresh failed. Showing saved data from ${new Date(cached.savedAt).toLocaleString()}.`;
            status.textContent = error.status === 429
                ? 'CoinGecko rate limited this request (HTTP 429). Showing the cached snapshot; retry shortly.'
                : `${error.message} Showing the cached snapshot.`;
        } else {
            status.textContent = error.status === 429
                ? 'CoinGecko rate limited this request (HTTP 429). Wait briefly, then use Refresh data to retry.'
                : `${error.message} You can retry when CoinGecko is available.`;
            document.getElementById('asset-chart-summary').textContent = 'No saved price history is available for this asset in this browser.';
        }
    } finally {
        setBusy(false);
    }
}

if (!safeId) {
    status.textContent = 'Choose an asset from Market Pulse to open its research page.';
} else {
    refreshButton.disabled = false;
    refreshButton.addEventListener('click', () => load(true));
    load();
}

window.addEventListener('resize', () => chart?.resize());
