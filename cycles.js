import './cycle-core.js';
import './macro-core.js';

const core = window.BitcoinCycleCore;
const dateInput = document.getElementById('compare-date');
const statusNode = document.getElementById('cycle-status');
const dataInfo = document.getElementById('cycle-data-info');
const chartElement = document.getElementById('cycle-chart');
let chart;
let macroChart;
let macroDataPromise;
let echartsPromise;
const tableBody = document.getElementById('cycle-rows');
const cards = document.getElementById('cycle-cards');
const coinGeckoCache = new Map();
const binanceCache = new Map();
const cycleColors = ['#70d6c5', '#ffbd69', '#a9a0ff', '#ff8f9c'];
const assetLabels = { bitcoin: 'BTC', ethereum: 'ETH' };
const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const DAY_MS = core.DAY_MS;
const BINANCE_BASE = 'https://data-api.binance.vision/api/v3/klines';
const BINANCE_START = core.HALVINGS[2].date;
const DATA_CACHE_TTL = 6 * 60 * 60 * 1000;
const COINGECKO_COOLDOWN_KEY = 'crypto-cycle-coingecko-cooldown-v1';
let requestRevision = 0;

function loadEcharts() {
    if (!echartsPromise) echartsPromise = import('./chart-kit.js').then(module => module.echarts);
    return echartsPromise;
}


function loadMacroData() {
    if (!macroDataPromise) {
        macroDataPromise = fetch('./data/macro-monthly.json')
            .then(response => {
                if (!response.ok) throw new Error(`Macro snapshot returned HTTP ${response.status}.`);
                return response.json();
            })
            .then(payload => {
                if (payload?.schemaVersion !== 1 || !Array.isArray(payload.observations) || !payload.observations.length) {
                    throw new Error('The macro snapshot is missing valid monthly observations.');
                }
                return payload;
            })
            .catch(error => { macroDataPromise = null; throw error; });
    }
    return macroDataPromise;
}

function selectedAssets() {
    return [...document.querySelectorAll('input[name="asset"]:checked')].map(input => input.value);
}

function makeHttpError(response, provider) {
    const error = new Error(`${provider} returned HTTP ${response.status}.`);
    error.status = response.status;
    const retryAfter = Number(response.headers.get('Retry-After'));
    if (response.status === 429) error.retryAfterMs = retryAfter > 0 ? retryAfter * 1000 : 60_000;
    return error;
}

function errorSummary(error) {
    if (error.status) return `HTTP ${error.status}`;
    return 'network or browser access error';
}

function readCoinGeckoCache(asset) {
    try {
        const stored = JSON.parse(sessionStorage.getItem(`crypto-cycle-coingecko-${asset}-v1`) || 'null');
        if (Array.isArray(stored?.prices) && stored.prices.length && Date.now() - stored.savedAt < DATA_CACHE_TTL) return stored.prices;
    } catch {
        // The page continues without browser storage.
    }
    return null;
}

async function fetchCoinGeckoAsset(asset) {
    if (coinGeckoCache.has(asset)) return coinGeckoCache.get(asset);
    const cached = readCoinGeckoCache(asset);
    if (cached) {
        const promise = Promise.resolve(cached);
        coinGeckoCache.set(asset, promise);
        return promise;
    }
    const promise = fetch(`https://api.coingecko.com/api/v3/coins/${asset}/market_chart?vs_currency=usd&days=max`)
        .then(async response => {
            if (!response.ok) throw makeHttpError(response, 'CoinGecko');
            const payload = await response.json();
            if (!Array.isArray(payload.prices) || !payload.prices.length) throw new Error(`Price history is unavailable for ${asset}.`);
            try { sessionStorage.setItem(`crypto-cycle-coingecko-${asset}-v1`, JSON.stringify({ savedAt: Date.now(), prices: payload.prices })); } catch { /* Keep the response in memory. */ }
            return payload.prices;
        }).catch(error => {
            coinGeckoCache.delete(asset);
            throw error;
        });
    coinGeckoCache.set(asset, promise);
    return promise;
}

async function fetchBinanceAsset(asset) {
    if (binanceCache.has(asset)) return binanceCache.get(asset);
    const storedKey = `crypto-cycle-binance-${asset}-v1`;
    try {
        const stored = JSON.parse(sessionStorage.getItem(storedKey) || 'null');
        if (Array.isArray(stored?.prices) && Date.now() - stored.savedAt < DATA_CACHE_TTL) return stored.prices;
    } catch {
        // Continue with a network request when storage is unavailable.
    }

    const symbol = asset === 'bitcoin' ? 'BTCUSDT' : 'ETHUSDT';
    const startTime = Date.parse(`${BINANCE_START}T00:00:00.000Z`);
    const lastCompleteDay = Math.floor(Date.now() / DAY_MS) * DAY_MS - 1;
    const promise = (async () => {
        const prices = [];
        let cursor = startTime;
        for (let page = 0; page < 10 && cursor <= lastCompleteDay; page += 1) {
            const url = new URL(BINANCE_BASE);
            url.search = new URLSearchParams({ symbol, interval: '1d', startTime: String(cursor), endTime: String(lastCompleteDay), limit: '1000' });
            const response = await fetch(url);
            if (!response.ok) throw makeHttpError(response, 'Binance public market data');
            const rows = await response.json();
            if (!Array.isArray(rows)) throw new Error('Binance returned an invalid candle history.');
            if (!rows.length) break;
            rows.forEach(row => prices.push([Number(row[0]), Number(row[4])]));
            const nextCursor = Number(rows[rows.length - 1][0]) + DAY_MS;
            if (nextCursor <= cursor || rows.length < 1000) break;
            cursor = nextCursor;
        }
        if (!prices.length) throw new Error(`Binance has no daily ${symbol} candles for the requested cycles.`);
        try { sessionStorage.setItem(storedKey, JSON.stringify({ savedAt: Date.now(), prices })); } catch { /* memory cache remains available */ }
        return prices;
    })().catch(error => {
        binanceCache.delete(asset);
        throw error;
    });
    binanceCache.set(asset, promise);
    return promise;
}

async function loadPriceSets(assets) {
    const sessionPrices = Object.fromEntries(assets.map(asset => [asset, readCoinGeckoCache(asset)]));
    if (assets.every(asset => sessionPrices[asset])) {
        return { priceSets: sessionPrices, provider: 'CoinGecko · USD (saved in this tab)', fallbackReason: 'Reused saved history for up to six hours.' };
    }
    let coinGeckoError;
    let cooldownUntil = 0;
    try { cooldownUntil = Number(sessionStorage.getItem(COINGECKO_COOLDOWN_KEY)) || 0; } catch { /* optional browser storage */ }
    if (cooldownUntil > Date.now()) {
        coinGeckoError = new Error('CoinGecko is in a short rate-limit cooldown.');
        coinGeckoError.status = 429;
        coinGeckoError.retryAfterMs = cooldownUntil - Date.now();
    } else {
        try {
            const entries = await Promise.all(assets.map(async asset => [asset, await fetchCoinGeckoAsset(asset)]));
            return { priceSets: Object.fromEntries(entries), provider: 'CoinGecko · USD', fallbackReason: '' };
        } catch (error) {
            coinGeckoError = error;
            if (error.status === 429) {
                try { sessionStorage.setItem(COINGECKO_COOLDOWN_KEY, String(Date.now() + (error.retryAfterMs || 60_000))); } catch { /* optional browser storage */ }
            }
        }
    }

    try {
        const entries = await Promise.all(assets.map(async asset => [asset, await fetchBinanceAsset(asset)]));
        const fallbackReason = coinGeckoError.status === 429
            ? `CoinGecko HTTP 429; using Binance while the rate limit cools down (~${Math.max(1, Math.ceil((coinGeckoError.retryAfterMs || 60_000) / 1000))}s).`
            : `CoinGecko ${errorSummary(coinGeckoError)}; using Binance as a fallback.`;
        return {
            priceSets: Object.fromEntries(entries),
            provider: 'Binance Spot · USDT pairs',
            fallbackReason
        };
    } catch (binanceError) {
        const error = new Error(`CoinGecko ${errorSummary(coinGeckoError)} and Binance ${errorSummary(binanceError)}. Check provider access and retry later.`);
        error.coinGeckoError = coinGeckoError;
        error.binanceError = binanceError;
        throw error;
    }
}

function formatReturn(value) {
    return value == null ? '—' : `${value >= 0 ? '+' : ''}${formatter.format(value)}%`;
}

function nearestReturn(values, day) {
    let found = null;
    values.forEach(point => { if (point.day <= day) found = point; });
    return found ? found.returnPct : null;
}

async function drawChart(cycles, assets) {
    const echarts = await loadEcharts();
    if (!chart) {
        chartElement.replaceChildren();
        chart = echarts.init(chartElement);
    }
    const series = [];
    cycles.forEach((cycle, index) => assets.forEach(asset => {
        const values = cycle.assets[asset]?.values || [];
        if (values.length) series.push({
            name: `${cycle.label} ${assetLabels[asset]}`,
            type: 'line',
            showSymbol: false,
            animation: false,
            data: values.map(point => [point.day, point.returnPct]),
            lineStyle: { color: cycleColors[index], width: asset === 'bitcoin' ? 2.6 : 2, type: asset === 'ethereum' ? 'dashed' : 'solid' },
            emphasis: { focus: 'series', lineStyle: { width: 4 } }
        });
    }));
    if (!series.length) {
        chart.clear();
        chart.setOption({ title: { text: 'No history available for the selected date.', left: 'center', top: 'middle', textStyle: { color: '#afc2bf', fontFamily: 'Urbanist, sans-serif', fontSize: 15, fontWeight: 'normal' } } });
        return;
    }
    const maxDay = Math.max(1, ...series.flatMap(line => line.data.map(point => point[0])));
    chart.setOption({
        animation: false,
        textStyle: { color: '#afc2bf', fontFamily: 'Urbanist, sans-serif' },
        grid: { left: 64, right: 22, top: 58, bottom: 92, containLabel: true },
        legend: { type: 'scroll', top: 8, textStyle: { color: '#afc2bf' }, pageTextStyle: { color: '#afc2bf' } },
        tooltip: { trigger: 'axis', confine: true, backgroundColor: '#183033', borderColor: 'rgba(175,194,191,.35)', textStyle: { color: '#f2f7f5', fontFamily: 'Urbanist, sans-serif' }, valueFormatter: value => `${formatter.format(value)}%` },
        xAxis: { type: 'value', name: 'Days since halving', nameLocation: 'middle', nameGap: 32, min: 0, max: maxDay, axisLabel: { color: '#afc2bf' }, axisLine: { lineStyle: { color: 'rgba(175,194,191,.35)' } }, splitLine: { lineStyle: { color: 'rgba(175,194,191,.1)' } } },
        yAxis: { type: 'value', name: 'Return', axisLabel: { color: '#afc2bf', formatter: value => `${formatter.format(value)}%` }, axisLine: { lineStyle: { color: 'rgba(175,194,191,.35)' } }, splitLine: { lineStyle: { color: 'rgba(175,194,191,.18)' } } },
        dataZoom: [{ type: 'inside', xAxisIndex: 0 }, { type: 'slider', xAxisIndex: 0, bottom: 12, height: 20, borderColor: 'rgba(175,194,191,.2)', fillerColor: 'rgba(112,214,197,.18)', textStyle: { color: '#afc2bf' } }],
        series
    }, true);
}


async function drawMacroChart(points, selectedDate, snapshot, priceProvider) {
    const macroCore = window.CryptoMacroCore;
    const echarts = await loadEcharts();
    if (!macroChart) {
        const element = document.getElementById('macro-chart');
        element.replaceChildren();
        macroChart = echarts.init(element);
    }
    const rows = macroCore.alignMonthlyData(snapshot.observations, points, selectedDate);
    if (!rows.length) {
        macroChart.clear();
        document.getElementById('macro-summary').textContent = 'No macro observations are available through the selected date.';
        return;
    }
    const months = rows.map(row => row.date);
    const fedRows = rows.filter(row => row.fedFundsPct != null);
    const cpiRows = rows.filter(row => row.cpiYoYPct != null);
    const latestFed = macroCore.latestValue(rows, 'fedFundsPct');
    const latestCpi = macroCore.latestValue(rows, 'cpiYoYPct');
    const btcMonths = rows.filter(row => row.btcPrice != null);
    const pct = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
    const dateRange = values => values.length ? `${values[0].date}–${values.at(-1).date}` : 'no observations';
    const btcCoverage = btcMonths.length
        ? `BTC closes: ${btcMonths[0].date}–${btcMonths.at(-1).date} (${priceProvider})`
        : priceProvider === 'pending' ? 'BTC price history loads when you select Update chart' : `BTC monthly prices unavailable (${priceProvider})`;
    const summaryParts = [
        `FRED snapshot generated ${snapshot.snapshotDate}`,
        latestFed ? `effective Fed funds: ${pct.format(latestFed.fedFundsPct)}% (${latestFed.date}; monthly; ${dateRange(fedRows)})` : '',
        latestCpi ? `CPI inflation: ${pct.format(latestCpi.cpiYoYPct)}% (${latestCpi.date}; year over year; ${dateRange(cpiRows)})` : '',
        btcCoverage
    ].filter(Boolean);
    document.getElementById('macro-summary').textContent = summaryParts.join(' · ');
    macroChart.setOption({
        animation: false,
        textStyle: { color: '#afc2bf', fontFamily: 'Urbanist, sans-serif' },
        grid: [
            { left: 68, right: 24, top: 54, height: '43%', containLabel: true },
            { left: 68, right: 24, top: '64%', height: '25%', containLabel: true }
        ],
        legend: { top: 8, textStyle: { color: '#afc2bf' } },
        tooltip: {
            trigger: 'axis', confine: true, backgroundColor: '#183033',
            borderColor: 'rgba(175,194,191,.35)',
            textStyle: { color: '#f2f7f5', fontFamily: 'Urbanist, sans-serif' },
            formatter(items) {
                const heading = items[0]?.axisValue || '';
                return [heading, ...items.map(item => {
                    const value = item.value == null ? 'No observation' :
                        item.seriesName === 'BTC monthly close' ? `${Number(item.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `${pct.format(item.value)}%`;
                    return `${item.marker} ${item.seriesName}: ${value}`;
                })].join('<br>');
            }
        },
        xAxis: [
            { type: 'category', data: months, boundaryGap: false, axisLabel: { show: false }, axisLine: { lineStyle: { color: 'rgba(175,194,191,.35)' } }, splitLine: { show: false } },
            { type: 'category', gridIndex: 1, data: months, boundaryGap: false, axisLabel: { color: '#afc2bf', rotate: 35, hideOverlap: true }, axisLine: { lineStyle: { color: 'rgba(175,194,191,.35)' } }, splitLine: { show: false } }
        ],
        yAxis: [
            { type: 'value', name: 'BTC · USD', axisLabel: { color: '#afc2bf', formatter: value => `${Number(value).toLocaleString()}` }, splitLine: { lineStyle: { color: 'rgba(175,194,191,.13)' } } },
            { type: 'value', gridIndex: 1, name: 'Percent', axisLabel: { color: '#afc2bf', formatter: value => `${pct.format(value)}%` }, splitLine: { lineStyle: { color: 'rgba(175,194,191,.13)' } } }
        ],
        dataZoom: [
            { type: 'inside', xAxisIndex: [0, 1] },
            { type: 'slider', xAxisIndex: [0, 1], bottom: 2, height: 18, borderColor: 'rgba(175,194,191,.2)', fillerColor: 'rgba(112,214,197,.18)', textStyle: { color: '#afc2bf' } }
        ],
        series: [
            { name: 'BTC monthly close', type: 'line', xAxisIndex: 0, yAxisIndex: 0, showSymbol: false, connectNulls: false, animation: false, lineStyle: { color: '#70d6c5', width: 2.5 }, data: rows.map(row => row.btcPrice) },
            { name: 'CPI inflation YoY', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, connectNulls: false, animation: false, lineStyle: { color: '#ffbd69', width: 2 }, data: rows.map(row => row.cpiYoYPct) },
            { name: 'Effective Fed funds rate', type: 'line', xAxisIndex: 1, yAxisIndex: 1, showSymbol: false, connectNulls: false, animation: false, lineStyle: { color: '#a9a0ff', width: 2 }, data: rows.map(row => row.fedFundsPct) }
        ]
    }, true);
}

function renderRows(cycles, assets) {
    tableBody.replaceChildren();
    cards.replaceChildren();
    cycles.forEach(cycle => {
        const row = document.createElement('tr');
        const btc = cycle.assets.bitcoin?.values || [];
        const eth = cycle.assets.ethereum?.values || [];
        const values = [cycle.label, cycle.date, `Day ${cycle.maxDay}`, formatReturn(assets.includes('bitcoin') ? nearestReturn(btc, cycle.maxDay) : null), formatReturn(assets.includes('ethereum') ? nearestReturn(eth, cycle.maxDay) : null)];
        values.forEach((value, index) => {
            const cell = document.createElement(index === 0 ? 'th' : 'td');
            if (index === 0) cell.scope = 'row';
            cell.textContent = value;
            row.appendChild(cell);
        });
        tableBody.appendChild(row);

        const card = document.createElement('article');
        card.className = 'coin-card cycle-card';
        const heading = document.createElement('h3'); heading.textContent = cycle.label;
        const details = document.createElement('p'); details.textContent = `${cycle.date} · Day ${cycle.maxDay} · BTC ${values[3]} · ETH ${values[4]}`;
        card.append(heading, details); cards.appendChild(card);
    });
}

function renderDataInfo(result, cycles, assets) {
    const allPoints = assets.flatMap(asset => core.normalizeSeries(result.priceSets[asset] || []));
    const latestDay = allPoints.length ? Math.max(...allPoints.map(point => point.day)) : null;
    const latestDate = latestDay == null ? 'unavailable' : new Date(latestDay * DAY_MS).toISOString().slice(0, 10);
    const coverage = assets.map(asset => {
        const covered = cycles.filter(cycle => (cycle.assets[asset]?.values || []).length);
        const count = core.normalizeSeries(result.priceSets[asset] || []).length;
        return `${assetLabels[asset]}: ${covered.length ? covered.map(cycle => cycle.label).join(', ') : 'no cycle coverage'} (${count.toLocaleString()} daily points)`;
    }).join(' · ');
    const sourceNote = result.provider.startsWith('Binance')
        ? 'Binance uses BTC/USDT and ETH/USDT daily spot candles; its fallback dataset begins with the 2020 halving, so older cycles are omitted.'
        : 'CoinGecko prices are quoted in USD. A cycle appears only when a daily baseline is available within seven days of its halving.';
    dataInfo.textContent = `${result.provider}. Latest daily point: ${latestDate}. ${coverage}. ${result.fallbackReason} ${sourceNote}`;
}

async function updateChart() {
    const revision = ++requestRevision;
    const assets = selectedAssets();
    if (!assets.length) { statusNode.textContent = 'Select Bitcoin, Ethereum, or both.'; return; }
    const selectedDate = dateInput.value;
    if (core.daysBetween(core.HALVINGS[core.HALVINGS.length - 1].date, selectedDate) < 0) {
        statusNode.textContent = 'Choose a date on or after the latest halving (20 April 2024).';
        return;
    }
    statusNode.textContent = 'Loading daily price history from CoinGecko; free Binance market data is the fallback…';
    dataInfo.textContent = 'Checking data sources and historical coverage…';
    document.getElementById('load-cycles').disabled = true;
    try {
        const priceAssets = [...new Set([...assets, 'bitcoin'])];
        const [result, , macroData] = await Promise.all([loadPriceSets(priceAssets), loadEcharts(), loadMacroData()]);
        if (revision !== requestRevision) return;
        const allCycles = core.buildCycleSeries(core.HALVINGS, result.priceSets, selectedDate, assets);
        const cycles = allCycles.filter(cycle => assets.some(asset => (cycle.assets[asset]?.values || []).length));
        await Promise.all([
            drawChart(cycles, assets),
            drawMacroChart(result.priceSets.bitcoin || [], selectedDate, macroData, result.provider)
        ]);
        renderRows(cycles, assets);
        renderDataInfo(result, cycles, assets);
        const elapsed = core.daysBetween(core.HALVINGS[core.HALVINGS.length - 1].date, selectedDate);
        statusNode.textContent = `${assets.map(asset => assetLabels[asset]).join(' and ')} through ${selectedDate} (day ${elapsed} of the current cycle). ${result.fallbackReason || 'Primary data source loaded successfully.'}`;
    } catch (error) {
        if (revision === requestRevision) {
            statusNode.textContent = `No chart data is available. ${error.message}`;
            dataInfo.textContent = 'The page tried CoinGecko USD history and Binance public USDT spot candles. Both sources failed, so there is no data to plot yet. Wait for the rate limit to clear, then select Update chart.';
            renderRows([], assets);
        }
        console.error(error);
    } finally {
        document.getElementById('load-cycles').disabled = false;
    }
}

let hasRequestedHistory = false;
const today = new Date().toISOString().slice(0, 10);
dateInput.min = core.HALVINGS[core.HALVINGS.length - 1].date;
dateInput.max = today;
dateInput.value = today;
document.getElementById('load-cycles').addEventListener('click', () => {
    hasRequestedHistory = true;
    updateChart();
});
function settingsChanged() {
    if (hasRequestedHistory) {
        updateChart();
    } else {
        statusNode.textContent = 'Settings updated. Select Update chart when you are ready to load historical prices.';
        loadMacroData()
            .then(snapshot => drawMacroChart([], dateInput.value, snapshot, 'pending'))
            .catch(error => {
                document.getElementById('macro-summary').textContent = `The static FRED snapshot could not be loaded. ${error.message}`;
            });
    }
}
dateInput.addEventListener('change', settingsChanged);
document.querySelectorAll('input[name="asset"]').forEach(input => input.addEventListener('change', settingsChanged));
window.addEventListener('resize', () => { chart?.resize(); macroChart?.resize(); });

loadMacroData()
    .then(snapshot => drawMacroChart([], dateInput.value, snapshot, 'pending'))
    .catch(error => {
        document.getElementById('macro-summary').textContent = `The static FRED snapshot could not be loaded. ${error.message}`;
    });
