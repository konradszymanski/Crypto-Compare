const { fields, createStore, formatValue } = window.CryptoCompareCore;
const store = createStore();
const input = document.getElementById('input');
const matchList = document.getElementById('match-list');
const status = document.getElementById('status');
const emptyState = document.getElementById('empty-state');
const coinCount = document.getElementById('coin-count');
const tableWrap = document.getElementById('table-wrap');
const tableHead = document.getElementById('table-head');
const tableBody = document.getElementById('table-body');
const coinCards = document.getElementById('coin-cards');

const coinListUrl = page => `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false`;
const marketUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=';
const iconBaseUrl = 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/';
const coinListCacheKey = 'crypto-compare-top-coins-v1';
const coinListCacheTtl = 6 * 60 * 60 * 1000;
const fallbackCoins = [
    ['bitcoin', 'Bitcoin', 'btc'], ['ethereum', 'Ethereum', 'eth'], ['tether', 'Tether', 'usdt'],
    ['binancecoin', 'BNB', 'bnb'], ['solana', 'Solana', 'sol'], ['ripple', 'XRP', 'xrp'],
    ['usd-coin', 'USDC', 'usdc'], ['dogecoin', 'Dogecoin', 'doge'], ['cardano', 'Cardano', 'ada'],
    ['tron', 'TRON', 'trx'], ['chainlink', 'Chainlink', 'link'], ['avalanche-2', 'Avalanche', 'avax'],
    ['shiba-inu', 'Shiba Inu', 'shib'], ['polkadot', 'Polkadot', 'dot'], ['bitcoin-cash', 'Bitcoin Cash', 'bch'],
    ['litecoin', 'Litecoin', 'ltc'], ['sui', 'Sui', 'sui'], ['stellar', 'Stellar', 'xlm'],
    ['near', 'NEAR Protocol', 'near'], ['the-open-network', 'Toncoin', 'ton']
].map(([id, name, symbol]) => ({ id, name, symbol }));
let coinListPromise;
let cachedCoinList;
let cachedCoinListAt = 0;
let coinListCooldownUntil = 0;
let cooldownTimer;
let searchRevision = 0;
const pendingIds = new Set();
let activeSuggestion = -1;

function readCoinListCache() {
    try {
        const cached = JSON.parse(sessionStorage.getItem(coinListCacheKey) || 'null');
        if (Array.isArray(cached?.coins)) {
            cachedCoinList = cached.coins;
            cachedCoinListAt = Number(cached.savedAt) || 0;
        }
    } catch {
        // Storage can be unavailable in private browsing; the in-memory fallback still works.
    }
}

function saveCoinListCache(coins) {
    cachedCoinList = coins;
    cachedCoinListAt = Date.now();
    try {
        sessionStorage.setItem(coinListCacheKey, JSON.stringify({ savedAt: cachedCoinListAt, coins }));
    } catch {
        // Keep the response in memory when storage is full or disabled.
    }
}

function apiError(response, requestName) {
    const error = new Error(`${requestName} request failed (${response.status}).`);
    error.status = response.status;
    const retryAfter = Number(response.headers.get('Retry-After'));
    error.retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60_000;
    return error;
}

function showRateLimitStatus(prefix, retryAfterMs) {
    const until = Date.now() + Math.max(1000, retryAfterMs || 60_000);
    if (prefix.startsWith('Coin search')) coinListCooldownUntil = until;
    clearInterval(cooldownTimer);
    const update = () => {
        const seconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        status.textContent = seconds
            ? `${prefix} Try again in about ${seconds} seconds.`
            : `${prefix} You can try again now.`;
        if (!seconds) clearInterval(cooldownTimer);
    };
    update();
    cooldownTimer = setInterval(update, 1000);
}

function resetActiveSuggestion() {
    activeSuggestion = -1;
    input.removeAttribute('aria-activedescendant');
    matchList.querySelectorAll('.suggestion').forEach(button => button.setAttribute('aria-selected', 'false'));
}

function setActiveSuggestion(index) {
    const options = [...matchList.querySelectorAll('.suggestion:not(:disabled)')];
    if (!options.length) return;
    activeSuggestion = (index + options.length) % options.length;
    options.forEach((option, optionIndex) => option.setAttribute('aria-selected', String(optionIndex === activeSuggestion)));
    input.setAttribute('aria-activedescendant', options[activeSuggestion].id);
    options[activeSuggestion].scrollIntoView({ block: 'nearest' });
}

function createRemoveButton(coin) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'remove-coin';
    button.textContent = 'Remove';
    button.setAttribute('aria-label', `Remove ${coin.name} from comparison`);
    button.addEventListener('click', () => {
        store.remove(coin.id);
        status.textContent = `${coin.name} removed from comparison.`;
        renderComparison();
        input.focus();
    });
    return button;
}

function createSuggestionIcon(coin) {
    const wrapper = document.createElement('span');
    wrapper.className = 'suggestion-icon';
    wrapper.setAttribute('aria-hidden', 'true');

    const image = document.createElement('img');
    const symbol = String(coin.symbol || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    image.src = `${iconBaseUrl}${symbol || 'generic'}.svg`;
    image.alt = '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
        if (image.dataset.genericFallback) {
            image.remove();
            wrapper.classList.add('suggestion-icon-fallback');
            wrapper.textContent = symbol.slice(0, 1).toUpperCase() || '•';
            return;
        }
        image.dataset.genericFallback = 'true';
        image.src = `${iconBaseUrl}generic.svg`;
    });
    wrapper.appendChild(image);
    return wrapper;
}

function appendValue(parent, field, coin) {
    if (field.type === 'image') {
        const imageUrl = coin.image;
        if (typeof imageUrl !== 'string') {
            parent.textContent = '—';
            return;
        }

        try {
            const parsedUrl = new URL(imageUrl);
            if (parsedUrl.protocol !== 'https:') throw new Error('Unsupported image protocol.');
            const image = document.createElement('img');
            image.src = parsedUrl.href;
            image.alt = `${coin.name} logo`;
            image.loading = 'lazy';
            parent.appendChild(image);
        } catch {
            parent.textContent = '—';
        }
        return;
    }

    parent.textContent = formatValue(field, coin);
}

function renderComparison() {
    const coins = store.getCoins();
    const hasCoins = coins.length > 0;
    emptyState.hidden = hasCoins;
    tableWrap.hidden = !hasCoins;
    coinCards.hidden = !hasCoins;
    coinCount.textContent = `${coins.length} ${coins.length === 1 ? 'coin' : 'coins'}`;

    tableHead.replaceChildren();
    tableBody.replaceChildren();
    coinCards.replaceChildren();

    if (!hasCoins) return;

    const headerRow = document.createElement('tr');
    const metricHeader = document.createElement('th');
    metricHeader.scope = 'col';
    metricHeader.textContent = 'Metric';
    headerRow.appendChild(metricHeader);

    coins.forEach(coin => {
        const header = document.createElement('th');
        header.scope = 'col';
        header.className = 'coin-header';
        const name = document.createElement('span');
        name.className = 'coin-name';
        name.textContent = coin.name;
        const symbol = document.createElement('span');
        symbol.className = 'coin-symbol';
        symbol.textContent = String(coin.symbol || '').toUpperCase();
        const heading = document.createElement('div');
        heading.className = 'coin-heading';
        heading.append(name, symbol);
        header.append(heading, createRemoveButton(coin));
        headerRow.appendChild(header);
    });
    tableHead.appendChild(headerRow);

    fields.forEach(field => {
        const row = document.createElement('tr');
        const label = document.createElement('th');
        label.scope = 'row';
        label.textContent = field.label;
        row.appendChild(label);
        coins.forEach(coin => {
            const cell = document.createElement('td');
            appendValue(cell, field, coin);
            row.appendChild(cell);
        });
        tableBody.appendChild(row);
    });

    coins.forEach(coin => {
        const card = document.createElement('article');
        card.className = 'coin-card';
        const heading = document.createElement('header');
        heading.className = 'card-header';
        const title = document.createElement('div');
        const name = document.createElement('h3');
        name.textContent = coin.name;
        const symbol = document.createElement('span');
        symbol.className = 'coin-symbol';
        symbol.textContent = String(coin.symbol || '').toUpperCase();
        title.append(name, symbol);
        heading.append(title, createRemoveButton(coin));
        card.appendChild(heading);

        const details = document.createElement('dl');
        details.className = 'coin-details';
        fields.forEach(field => {
            const term = document.createElement('dt');
            term.textContent = field.label;
            const value = document.createElement('dd');
            appendValue(value, field, coin);
            details.append(term, value);
        });
        card.appendChild(details);
        coinCards.appendChild(card);
    });
}

function renderSuggestions(coins) {
    matchList.replaceChildren();
    resetActiveSuggestion();
    if (coins.length === 0) {
        matchList.textContent = 'No coins found.';
        return;
    }

    coins.forEach(coin => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'suggestion';
        button.id = `coin-option-${String(coin.id).replace(/[^a-z0-9_-]/gi, '-')}`;
        button.setAttribute('role', 'option');
        button.setAttribute('aria-selected', 'false');
        const name = document.createElement('span');
        name.className = 'suggestion-name';
        name.textContent = coin.name;
        const main = document.createElement('span');
        main.className = 'suggestion-main';
        main.append(createSuggestionIcon(coin), name);
        const id = document.createElement('span');
        id.className = 'suggestion-id';
        const rank = Number(coin.market_cap_rank);
        const rankedId = Number.isFinite(rank) && rank > 0 ? `#${rank} · ${coin.id}` : coin.id;
        id.textContent = store.has(coin.id) ? `${rankedId} · Added` : pendingIds.has(coin.id) ? `${rankedId} · Adding…` : rankedId;
        button.append(main, id);

        const alreadyAdded = store.has(coin.id);
        button.disabled = alreadyAdded || pendingIds.has(coin.id);
        if (alreadyAdded) button.setAttribute('aria-label', `${coin.name}, already in comparison`);
        button.addEventListener('click', () => loadCoin(coin.id));
        matchList.appendChild(button);
    });
}

async function loadCoinList() {
    if (cachedCoinList && Date.now() - cachedCoinListAt < coinListCacheTtl) return cachedCoinList;
    if (Date.now() < coinListCooldownUntil) {
        const error = new Error('Coin search is cooling down after a rate limit.');
        error.status = 429;
        error.retryAfterMs = coinListCooldownUntil - Date.now();
        throw error;
    }
    if (!coinListPromise) {
        coinListPromise = (async () => {
            const coins = [];
            // CoinGecko caps this endpoint at 250 rows per page; two serial requests
            // load only the top 500 assets and avoid an unnecessary request burst.
            for (const page of [1, 2]) {
                const response = await fetch(coinListUrl(page));
                if (!response.ok) throw apiError(response, 'Ranked coin list');
                const pageCoins = await response.json();
                if (!Array.isArray(pageCoins)) throw new Error('Ranked coin list response was not an array.');
                coins.push(...pageCoins.map(coin => ({
                    id: coin.id,
                    name: coin.name,
                    symbol: coin.symbol,
                    image: coin.image,
                    market_cap_rank: coin.market_cap_rank
                })));
            }
            saveCoinListCache(coins);
            return coins;
        })().catch(error => {
            if (error.status === 429) coinListCooldownUntil = Date.now() + error.retryAfterMs;
            coinListPromise = undefined;
            throw error;
        });
    }
    return coinListPromise;
}

function rankCoinMatches(coins, query) {
    const text = value => String(value || '').toLocaleLowerCase();
    const score = coin => {
        const name = text(coin.name);
        const id = text(coin.id);
        const symbol = text(coin.symbol);
        if (symbol === query) return 0;
        if (name === query || id === query) return 1;
        if (symbol.startsWith(query)) return 2;
        if (name.startsWith(query) || id.startsWith(query)) return 3;
        return 4;
    };
    return coins.filter(coin => {
        const name = text(coin.name);
        const id = text(coin.id);
        const symbol = text(coin.symbol);
        return name.includes(query) || id.includes(query) || symbol.includes(query);
    }).sort((a, b) => {
        const relevance = score(a) - score(b);
        if (relevance) return relevance;
        const rankA = Number(a.market_cap_rank) || Number.MAX_SAFE_INTEGER;
        const rankB = Number(b.market_cap_rank) || Number.MAX_SAFE_INTEGER;
        return rankA - rankB || text(a.name).localeCompare(text(b.name));
    }).slice(0, 10);
}

async function searchCoins(searchText) {
    const revision = ++searchRevision;
    const query = searchText.trim().toLocaleLowerCase();
    clearInterval(cooldownTimer);
    status.textContent = '';
    matchList.replaceChildren();
    resetActiveSuggestion();
    input.setAttribute('aria-expanded', String(Boolean(query)));
    if (!query) return;

    matchList.textContent = 'Searching…';
    try {
        let availableCoins;
        try {
            availableCoins = await loadCoinList();
        } catch (error) {
            if (error.status || cachedCoinList) {
                availableCoins = cachedCoinList || fallbackCoins;
                const source = cachedCoinList ? 'your cached top-500 list' : 'popular coins only';
                const reason = error.status === 429 ? 'rate limited' : error.status ? `unavailable (HTTP ${error.status})` : 'unavailable';
                status.textContent = `CoinGecko search is ${reason}; showing ${source}.`;
            } else {
                throw error;
            }
        }
        if (revision !== searchRevision) return;
        const matches = rankCoinMatches(availableCoins, query);
        renderSuggestions(matches);
    } catch (error) {
        if (revision !== searchRevision) return;
        matchList.replaceChildren();
        if (error.status === 429) {
            showRateLimitStatus('Coin search was rate limited (HTTP 429).', error.retryAfterMs);
        } else if (error.status) {
            status.textContent = `Coin search failed (HTTP ${error.status}). Try again shortly.`;
        } else {
            status.textContent = 'Coin search could not reach CoinGecko. Check your connection and try again.';
        }
        console.error(error);
    }
}

async function loadCoin(id) {
    if (store.has(id) || pendingIds.has(id)) return;
    clearInterval(cooldownTimer);
    pendingIds.add(id);
    searchRevision += 1;
    matchList.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    resetActiveSuggestion();
    status.textContent = 'Loading market data…';

    try {
        const response = await fetch(`${marketUrl}${encodeURIComponent(id)}`);
        if (!response.ok) throw apiError(response, 'Market data');
        const data = await response.json();
        const coin = Array.isArray(data) ? data.find(item => item.id === id) : null;
        if (!coin) throw new Error('No market data was returned for this coin.');

        store.add(coin);
        input.value = '';
        status.textContent = `${coin.name} added to comparison.`;
        renderComparison();
    } catch (error) {
        if (error.status === 429) {
            showRateLimitStatus('Market data was rate limited (HTTP 429).', error.retryAfterMs);
        } else {
            status.textContent = error.status
                ? `Market data request failed (HTTP ${error.status}). Try selecting the coin again.`
                : 'Market data could not be reached. Check your connection and try selecting the coin again.';
        }
        const retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'suggestion retry-suggestion';
        retry.textContent = 'Retry loading coin';
        retry.addEventListener('click', () => loadCoin(id));
        matchList.appendChild(retry);
        input.setAttribute('aria-expanded', 'true');
        console.error(error);
    } finally {
        pendingIds.delete(id);
    }
}

readCoinListCache();
input.addEventListener('input', () => searchCoins(input.value));
input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' && matchList.querySelector('.suggestion:not(:disabled)')) {
        event.preventDefault();
        setActiveSuggestion(activeSuggestion + 1);
    } else if (event.key === 'ArrowUp' && matchList.querySelector('.suggestion:not(:disabled)')) {
        event.preventDefault();
        setActiveSuggestion(activeSuggestion < 0 ? 0 : activeSuggestion - 1);
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
        event.preventDefault();
        matchList.querySelectorAll('.suggestion:not(:disabled)')[activeSuggestion]?.click();
    } else if (event.key === 'Escape') {
        matchList.replaceChildren();
        input.setAttribute('aria-expanded', 'false');
        resetActiveSuggestion();
    }
});
renderComparison();

