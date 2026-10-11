const core = window.BitcoinCycleCore;
const dateInput = document.getElementById('compare-date');
const statusNode = document.getElementById('cycle-status');
const dataInfo = document.getElementById('cycle-data-info');
const canvas = document.getElementById('cycle-chart');
const tableBody = document.getElementById('cycle-rows');
const cards = document.getElementById('cycle-cards');
const legend = document.getElementById('cycle-legend');
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

function selectedAssets() {
    return [...document.querySelectorAll('input[name="asset"]:checked')].map(input => input.value);
}

function makeHttpError(response, provider) {
    const error = new Error(`${provider} returned HTTP ${response.status}.`);
    error.status = response.status;
    const retryAfter = Number(response.headers.get('Retry-After'));
    error.retryAfterMs = retryAfter > 0 ? retryAfter * 1000 : 60_000;
    return error;
}

function errorSummary(error) {
    if (error.status) return `HTTP ${error.status}`;
    return 'network or browser access error';
}

async function fetchCoinGeckoAsset(asset) {
    if (coinGeckoCache.has(asset)) return coinGeckoCache.get(asset);
    const promise = fetch(`https://api.coingecko.com/api/v3/coins/${asset}/market_chart?vs_currency=usd&days=max`)
        .then(async response => {
            if (!response.ok) throw makeHttpError(response, 'CoinGecko');
            const payload = await response.json();
            if (!Array.isArray(payload.prices)) throw new Error(`Price history is unavailable for ${asset}.`);
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
        const waitSeconds = Math.max(1, Math.ceil((coinGeckoError.retryAfterMs || 60_000) / 1000));
        return {
            priceSets: Object.fromEntries(entries),
            provider: 'Binance Spot · USDT pairs',
            fallbackReason: `CoinGecko ${errorSummary(coinGeckoError)}; using Binance while it cools down (~${waitSeconds}s).`
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

function drawChart(cycles, assets) {
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    const width = Math.max(320, rect.width);
    const height = 390;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    canvas.style.height = `${height}px`;
    const context = canvas.getContext('2d');
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);

    const series = [];
    cycles.forEach((cycle, index) => assets.forEach(asset => {
        const values = cycle.assets[asset]?.values || [];
        if (values.length) series.push({ cycle, index, asset, values });
    }));
    if (!series.length) {
        context.fillStyle = '#afc2bf';
        context.font = '15px Urbanist, sans-serif';
        context.fillText('No history available for the selected date.', 24, 42);
        return;
    }

    const maxDay = Math.max(1, ...series.map(line => line.values[line.values.length - 1].day));
    const allReturns = series.flatMap(line => line.values.map(point => point.returnPct));
    let minValue = Math.min(0, ...allReturns);
    let maxValue = Math.max(0, ...allReturns);
    if (minValue === maxValue) { minValue -= 10; maxValue += 10; }
    const padding = { left: 62, right: 18, top: 20, bottom: 48 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const yMin = minValue - (maxValue - minValue) * 0.08;
    const yMax = maxValue + (maxValue - minValue) * 0.08;
    const x = day => padding.left + (day / maxDay) * plotWidth;
    const y = value => padding.top + ((yMax - value) / (yMax - yMin)) * plotHeight;

    context.font = '12px Urbanist, sans-serif';
    context.lineWidth = 1;
    for (let tick = 0; tick <= 4; tick += 1) {
        const value = yMin + (yMax - yMin) * tick / 4;
        const ypos = y(value);
        context.strokeStyle = 'rgba(175,194,191,0.18)';
        context.beginPath(); context.moveTo(padding.left, ypos); context.lineTo(width - padding.right, ypos); context.stroke();
        context.fillStyle = '#afc2bf';
        context.textAlign = 'right';
        context.fillText(`${formatter.format(value)}%`, padding.left - 9, ypos + 4);
    }
    for (let tick = 0; tick <= 4; tick += 1) {
        const day = Math.round(maxDay * tick / 4);
        const xpos = x(day);
        context.strokeStyle = 'rgba(175,194,191,0.1)';
        context.beginPath(); context.moveTo(xpos, padding.top); context.lineTo(xpos, height - padding.bottom); context.stroke();
        context.fillStyle = '#afc2bf';
        context.textAlign = 'center';
        context.fillText(`${day}`, xpos, height - 23);
    }
    context.fillStyle = '#afc2bf';
    context.textAlign = 'center';
    context.fillText('Days since halving', padding.left + plotWidth / 2, height - 4);

    series.forEach(line => {
        context.beginPath();
        context.strokeStyle = cycleColors[line.index];
        context.lineWidth = line.asset === 'bitcoin' ? 2.6 : 2;
        context.setLineDash(line.asset === 'ethereum' ? [7, 5] : []);
        line.values.forEach((point, index) => {
            if (index === 0) context.moveTo(x(point.day), y(point.returnPct));
            else context.lineTo(x(point.day), y(point.returnPct));
        });
        context.stroke();
    });
    context.setLineDash([]);
}

function renderLegend(cycles, assets) {
    legend.replaceChildren();
    cycles.forEach((cycle, index) => assets.forEach(asset => {
        if (!(cycle.assets[asset]?.values || []).length) return;
        const item = document.createElement('span');
        item.className = 'legend-item';
        const swatch = document.createElement('i');
        swatch.style.setProperty('--series-color', cycleColors[index]);
        if (asset === 'ethereum') swatch.classList.add('dashed');
        item.append(swatch, document.createTextNode(`${cycle.label} ${assetLabels[asset]}`));
        legend.appendChild(item);
    }));
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
        const result = await loadPriceSets(assets);
        if (revision !== requestRevision) return;
        const allCycles = core.buildCycleSeries(core.HALVINGS, result.priceSets, selectedDate, assets);
        const cycles = allCycles.filter(cycle => assets.some(asset => (cycle.assets[asset]?.values || []).length));
        drawChart(cycles, assets);
        renderLegend(cycles, assets);
        renderRows(cycles, assets);
        renderDataInfo(result, cycles, assets);
        const elapsed = core.daysBetween(core.HALVINGS[core.HALVINGS.length - 1].date, selectedDate);
        statusNode.textContent = `${assets.map(asset => assetLabels[asset]).join(' and ')} through ${selectedDate} (day ${elapsed} of the current cycle). ${result.fallbackReason || 'Primary data source loaded successfully.'}`;
    } catch (error) {
        if (revision === requestRevision) {
            statusNode.textContent = `No chart data is available. ${error.message}`;
            dataInfo.textContent = 'The page tried CoinGecko USD history and Binance public USDT spot candles. Both sources failed, so there is no data to plot yet. Wait for the rate limit to clear, then select Update chart.';
            drawChart([], assets);
            renderLegend([], assets);
            renderRows([], assets);
        }
        console.error(error);
    } finally {
        document.getElementById('load-cycles').disabled = false;
    }
}

const today = new Date().toISOString().slice(0, 10);
dateInput.min = core.HALVINGS[core.HALVINGS.length - 1].date;
dateInput.max = today;
dateInput.value = today;
document.getElementById('load-cycles').addEventListener('click', updateChart);
dateInput.addEventListener('change', updateChart);
document.querySelectorAll('input[name="asset"]').forEach(input => input.addEventListener('change', updateChart));
window.addEventListener('resize', () => { if (tableBody.children.length) updateChart(); });
updateChart();
