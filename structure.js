const API_ROOT = 'https://api.geckoterminal.com/api/v2';
const CACHE_KEY = 'crypto-compare-geckoterminal-v1';
const LAST_REQUEST_KEY = 'crypto-compare-geckoterminal-last-request-v1';
const CACHE_TTL_MS = 60_000;
const MIN_REQUEST_GAP_MS = 6_000;
const NETWORKS = new Set(['eth', 'solana', 'base', 'arbitrum', 'polygon_pos']);
const state = { network: 'all', busy: false };
const byId = (id) => document.getElementById(id);
const status = byId('structure-status');
const freshness = byId('structure-freshness');
const list = byId('pool-list');
const refreshButton = byId('refresh-pools');
const networkSelect = byId('network-filter');
const compactUsd = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 2 });

function readCache(network) {
    try {
        const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
        const entry = cache?.[network];
        if (entry && Array.isArray(entry.data) && Number.isFinite(entry.savedAt)) return entry;
    } catch { /* Continue without browser storage. */ }
    return null;
}

function saveCache(network, data, savedAt) {
    try {
        const cache = JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
        cache[network] = { data, savedAt };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch { /* The current response remains usable without browser storage. */ }
}

function number(value) {
    if (value === null || value === undefined || value === '') return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
}

function formatUsd(value) {
    const amount = number(value);
    return amount === null ? 'Not reported' : compactUsd.format(amount);
}

function formatPercent(value) {
    const amount = number(value);
    return amount === null ? 'Not reported' : percent.format(amount / 100);
}

function poolNetwork(pool) {
    return pool?.relationships?.network?.data?.id || 'Network not reported';
}

function poolDex(pool) {
    return pool?.relationships?.dex?.data?.id || 'DEX not reported';
}

function poolRecords(data) {
    return Array.isArray(data) ? data.filter(item => item && item.attributes && typeof item.attributes === 'object') : [];
}

function sumReported(records, getValue) {
    let sum = 0;
    let found = false;
    records.forEach(pool => {
        const value = number(getValue(pool));
        if (value !== null) { sum += value; found = true; }
    });
    return found ? sum : null;
}

function render(data, fetchedAt, stale = false) {
    const records = poolRecords(data).slice(0, 20);
    const networks = new Set(records.map(poolNetwork));
    byId('pool-count').textContent = new Intl.NumberFormat().format(records.length);
    byId('network-count').textContent = new Intl.NumberFormat().format(networks.size);
    byId('pool-liquidity').textContent = formatUsd(sumReported(records, pool => pool.attributes.reserve_in_usd));
    byId('pool-volume').textContent = formatUsd(sumReported(records, pool => pool.attributes.volume_usd?.h24));
    freshness.textContent = `GeckoTerminal public data · snapshot ${new Date(fetchedAt).toLocaleString()} · ${stale ? 'saved data shown because refresh failed' : 'cached for 1 minute'}.`;
    list.replaceChildren();

    if (!records.length) {
        const empty = document.createElement('p');
        empty.className = 'pool-empty';
        empty.textContent = 'No trending pools were returned for this network.';
        list.append(empty);
        return;
    }

    records.forEach(pool => {
        const attrs = pool.attributes;
        const network = poolNetwork(pool);
        const address = String(attrs.address || '');
        const safeNetwork = NETWORKS.has(network) ? network : '';
        const sourceUrl = safeNetwork && address
            ? `https://www.geckoterminal.com/${encodeURIComponent(safeNetwork)}/pools/${encodeURIComponent(address)}`
            : 'https://www.geckoterminal.com/';
        const card = document.createElement('article');
        card.className = 'pool-card';

        const header = document.createElement('div');
        header.className = 'pool-card-header';
        const title = document.createElement('h3');
        title.textContent = attrs.name || 'Unnamed pool';
        const networkTag = document.createElement('span');
        networkTag.className = 'pool-network';
        networkTag.textContent = network;
        header.append(title, networkTag);

        const dexLine = document.createElement('p');
        dexLine.className = 'pool-dex';
        dexLine.textContent = poolDex(pool);

        const metrics = document.createElement('dl');
        metrics.className = 'pool-metrics';
        const transactions = attrs.transactions?.h24;
        const values = [
            ['Liquidity', formatUsd(attrs.reserve_in_usd)],
            ['24-hour volume', formatUsd(attrs.volume_usd?.h24)],
            ['24-hour price change', formatPercent(attrs.price_change_percentage?.h24)],
            ['Buys / sells · 24h', transactions ? `${number(transactions.buys) ?? '—'} / ${number(transactions.sells) ?? '—'}` : 'Not reported']
        ];
        values.forEach(([label, value]) => {
            const term = document.createElement('dt');
            term.textContent = label;
            const detail = document.createElement('dd');
            detail.textContent = value;
            metrics.append(term, detail);
        });

        const link = document.createElement('a');
        link.href = sourceUrl;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'View pool on GeckoTerminal';
        card.append(header, dexLine, metrics, link);
        list.append(card);
    });
}

function setBusy(busy) {
    state.busy = busy;
    refreshButton.disabled = busy;
    networkSelect.disabled = busy;
    refreshButton.textContent = busy ? 'Loading…' : 'Refresh pools';
}

function retryDelay(response) {
    const value = response.headers.get('Retry-After');
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    const date = Date.parse(value || '');
    return Number.isFinite(date) ? Math.max(1000, date - Date.now()) : 60_000;
}

async function loadPools(network, forceRefresh = false) {
    if (state.busy) return;
    const cached = readCache(network);
    if (!forceRefresh && cached && Date.now() - cached.savedAt < CACHE_TTL_MS) {
        render(cached.data, cached.savedAt);
        status.textContent = `Loaded ${poolRecords(cached.data).length} pools from this tab's recent cache.`;
        return;
    }

    let lastRequestAt = 0;
    try { lastRequestAt = Number(localStorage.getItem(LAST_REQUEST_KEY)) || 0; } catch { /* Storage is optional. */ }
    const remainingMs = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
    if (remainingMs > 0) {
        if (cached) {
            render(cached.data, cached.savedAt, true);
            status.textContent = `Showing saved data. Try again in about ${Math.ceil(remainingMs / 1000)} seconds to respect the public API request limit.`;
        } else {
            status.textContent = `Please wait ${Math.ceil(remainingMs / 1000)} seconds before requesting more public data.`;
        }
        return;
    }

    setBusy(true);
    status.textContent = `Loading ${network === 'all' ? 'all-network' : network} trending pools from GeckoTerminal…`;
    const endpoint = network === 'all' ? '/networks/trending_pools' : `/networks/${encodeURIComponent(network)}/trending_pools`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
        try { localStorage.setItem(LAST_REQUEST_KEY, String(Date.now())); } catch { /* Optional request guard. */ }
        const response = await fetch(`${API_ROOT}${endpoint}`, {
            signal: controller.signal,
            headers: { Accept: 'application/json;version=20230203' }
        });
        if (!response.ok) {
            const error = new Error(`GeckoTerminal returned HTTP ${response.status}.`);
            error.status = response.status;
            if (response.status === 429) error.retryAfterMs = retryDelay(response);
            throw error;
        }
        const payload = await response.json();
        if (!Array.isArray(payload?.data)) throw new Error('GeckoTerminal returned an unexpected response.');
        const records = poolRecords(payload.data);
        const savedAt = Date.now();
        saveCache(network, records, savedAt);
        render(records, savedAt);
        status.textContent = records.length
            ? `Loaded ${records.length} trending pools. Values depend on the selected network and feed coverage.`
            : 'No trending pools were returned. Try another network later.';
    } catch (error) {
        if (cached) {
            render(cached.data, cached.savedAt, true);
            status.textContent = `Refresh failed${error.status ? ` (HTTP ${error.status})` : ''}; showing saved data from ${new Date(cached.savedAt).toLocaleString()}.`;
        } else if (error.status === 429) {
            const waitSeconds = Math.ceil((error.retryAfterMs || 60_000) / 1000);
            status.textContent = `GeckoTerminal rate limited this request (HTTP 429). Wait about ${waitSeconds} seconds before retrying.`;
        } else {
            status.textContent = `${error.name === 'AbortError' ? 'GeckoTerminal request timed out.' : error.message || 'Pool data could not be loaded.'} Check your connection and try again later.`;
        }
        console.error(error);
    } finally {
        clearTimeout(timeout);
        setBusy(false);
    }
}

networkSelect.addEventListener('change', () => {
    state.network = NETWORKS.has(networkSelect.value) ? networkSelect.value : 'all';
    loadPools(state.network);
});
refreshButton.addEventListener('click', () => loadPools(state.network, true));
