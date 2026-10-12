import './comparison-core.js';

const { fields, createStore, createMarketRefresher, formatValue, marketDataUrl } = window.CryptoCompareCore;
const store = createStore();
const input = document.getElementById('input');
const matchList = document.getElementById('match-list');
const status = document.getElementById('status');
const emptyState = document.getElementById('empty-state');
const coinCount = document.getElementById('coin-count');
const refreshButton = document.getElementById('refresh-data');
const clearSelectionButton = document.getElementById('clear-selection');
const tableWrap = document.getElementById('table-wrap');
const tableHead = document.getElementById('table-head');
const tableBody = document.getElementById('table-body');
const coinCards = document.getElementById('coin-cards');
const currencySelect = document.getElementById('display-currency');
const sortFieldSelect = document.getElementById('sort-field');
const sortDirectionButton = document.getElementById('sort-direction');
const tableCaption = document.getElementById('table-caption');
const supportedCurrencies = new Set(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']);
const currencyStorageKey = 'crypto-compare-display-currency-v1';
const selectionStorageKey = 'crypto-compare-selected-coins-v1';
let displayCurrency = 'USD';
let marketRequestInProgress = false;
let sortFieldKey = 'market_cap_rank';
let sortDirection = 1;

const coinListUrl = page => `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=${page}&sparkline=false`;
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

const marketRefresher = createMarketRefresher(store, async (currency, ids) => {
    const response = await fetch(marketDataUrl(currency, ids));
    if (!response.ok) throw apiError(response, 'Market data refresh');
    return response.json();
});

function setMarketRequestInProgress(inProgress) {
    marketRequestInProgress = inProgress;
    currencySelect.disabled = inProgress;
    refreshButton.disabled = inProgress || store.getCoins().length === 0;
    clearSelectionButton.disabled = inProgress || store.getCoins().length === 0;
    document.querySelectorAll('.remove-coin').forEach(button => { button.disabled = inProgress; });
    refreshButton.textContent = inProgress ? 'Refreshing…' : 'Refresh data';
}

function reportMarketDataError(error, action, context = 'Your current comparison is unchanged.') {
    if (error.status === 429) {
        showRateLimitStatus(`${action} was rate limited (HTTP 429). ${context}`, error.retryAfterMs);
    } else if (error.status) {
        status.textContent = `${action} failed (HTTP ${error.status}). ${context}`;
    } else {
        status.textContent = `${error.message || `${action} failed.`} ${context}`;
    }
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
        saveSelectedCoins();
        status.textContent = `${coin.name} removed from comparison.`;
        renderComparison();
        input.focus();
    });
    return button;
}

function saveSelectedCoins() {
    try {
        const selection = store.getCoins().map(coin => ({
            id: coin.id,
            name: coin.name || coin.id,
            symbol: coin.symbol || '',
            image: typeof coin.image === 'string' ? coin.image : '',
            market_cap_rank: Number.isFinite(coin.market_cap_rank) ? coin.market_cap_rank : null
        }));
        localStorage.setItem(selectionStorageKey, JSON.stringify(selection));
    } catch {
        // The comparison remains usable when browser storage is disabled or full.
    }
}

function readSavedCoins() {
    try {
        const saved = JSON.parse(localStorage.getItem(selectionStorageKey) || '[]');
        if (!Array.isArray(saved)) return [];
        const unique = new Map();
        saved.forEach(coin => {
            if (coin && typeof coin.id === 'string' && /^[a-z0-9-]+$/i.test(coin.id) && !unique.has(coin.id)) {
                unique.set(coin.id, {
                    id: coin.id,
                    name: typeof coin.name === 'string' ? coin.name : coin.id,
                    symbol: typeof coin.symbol === 'string' ? coin.symbol : '',
                    image: typeof coin.image === 'string' && coin.image.startsWith('https://') ? coin.image : '',
                    market_cap_rank: Number.isFinite(coin.market_cap_rank) ? coin.market_cap_rank : null
                });
            }
        });
        return [...unique.values()];
    } catch {
        return [];
    }
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

    parent.textContent = formatValue(field, coin, displayCurrency);
}

function fieldLabel(field) {
    return field.type === 'currency' ? `${field.label} (${displayCurrency})` : field.label;
}

function sortCoins(coins) {
    const field = fields.find(candidate => candidate.key === sortFieldKey);
    if (!field) return coins;
    return coins.map((coin, index) => {
        const rawValue = coin[field.key];
        const value = rawValue === null || rawValue === undefined || rawValue === '' ? NaN : Number(rawValue);
        return { coin, index, value };
    }).sort((left, right) => {
        const leftMissing = !Number.isFinite(left.value);
        const rightMissing = !Number.isFinite(right.value);
        if (leftMissing !== rightMissing) return leftMissing ? 1 : -1;
        if (leftMissing || left.value === right.value) return left.index - right.index;
        return (left.value - right.value) * sortDirection;
    }).map(entry => entry.coin);
}

function updateSortDirectionButton() {
    const ascending = sortDirection === 1;
    sortDirectionButton.textContent = ascending ? 'Ascending ↑' : 'Descending ↓';
    sortDirectionButton.setAttribute('aria-label', ascending ? 'Sort descending' : 'Sort ascending');
}

function renderComparison() {
    const coins = sortCoins(store.getCoins());
    const hasCoins = coins.length > 0;
    emptyState.hidden = hasCoins;
    tableWrap.hidden = !hasCoins;
    coinCards.hidden = !hasCoins;
    coinCount.textContent = `${coins.length} ${coins.length === 1 ? 'coin' : 'coins'}`;
    refreshButton.disabled = marketRequestInProgress || !hasCoins;
    clearSelectionButton.disabled = marketRequestInProgress || !hasCoins;
    sortFieldSelect.disabled = !hasCoins;
    sortDirectionButton.disabled = !hasCoins;

    tableHead.replaceChildren();
    tableBody.replaceChildren();
    coinCards.replaceChildren();
    tableCaption.textContent = `Cryptocurrency market data comparison in ${displayCurrency}`;

    if (!hasCoins) return;

    const headerRow = document.createElement('tr');
    const metricHeader = document.createElement('th');
    metricHeader.scope = 'col';
    metricHeader.textContent = `Metric · ${displayCurrency}`;
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
        label.textContent = fieldLabel(field);
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
            term.textContent = fieldLabel(field);
            const value = document.createElement('dd');
            appendValue(value, field, coin);
            details.append(term, value);
        });
        card.appendChild(details);
        coinCards.appendChild(card);
    });
}

async function changeDisplayCurrency(nextCurrency) {
    const currency = String(nextCurrency || '').toUpperCase();
    if (!supportedCurrencies.has(currency) || currency === displayCurrency) return;
    if (marketRequestInProgress) {
        currencySelect.value = displayCurrency;
        return;
    }

    const previousCurrency = displayCurrency;
    const selectedCoins = store.getCoins();
    setMarketRequestInProgress(true);
    status.textContent = selectedCoins.length
        ? `Refreshing selected coins in ${currency}…`
        : `Display currency set to ${currency}. Add coins to compare.`;

    try {
        if (selectedCoins.length) {
            const result = await marketRefresher.refresh(currency);
            if (result.status !== 'updated') throw new Error('Could not update the comparison. Please try again.');
        }

        displayCurrency = currency;
        try {
            localStorage.setItem(currencyStorageKey, displayCurrency);
        } catch {
            // The selected currency still works for this page when storage is unavailable.
        }
        renderComparison();
        status.textContent = selectedCoins.length
            ? `Comparison updated to ${currency}.`
            : `Display currency set to ${currency}. Add coins to compare.`;
    } catch (error) {
        currencySelect.value = previousCurrency;
        reportMarketDataError(error, 'Currency refresh', `Your comparison remains in ${previousCurrency}.`);
        console.error(error);
    } finally {
        setMarketRequestInProgress(false);
    }
}

async function refreshComparison() {
    if (marketRequestInProgress || !store.getCoins().length) return;
    clearInterval(cooldownTimer);
    setMarketRequestInProgress(true);
    status.textContent = 'Refreshing market data for all selected coins…';

    try {
        const result = await marketRefresher.refresh(displayCurrency);
        if (result.status === 'busy') return;
        if (result.status === 'empty') {
            status.textContent = 'Add a coin before refreshing market data.';
            return;
        }
        renderComparison();
        status.textContent = 'Market data refreshed. CoinGecko update times are shown for each coin.';
    } catch (error) {
        reportMarketDataError(error, 'Market data refresh');
        console.error(error);
    } finally {
        setMarketRequestInProgress(false);
    }
}

async function refreshSavedCoins() {
    const savedCoins = store.getCoins();
    if (!savedCoins.length) return;
    status.textContent = `Restoring ${savedCoins.length} saved ${savedCoins.length === 1 ? 'coin' : 'coins'}…`;
    setMarketRequestInProgress(true);
    try {
        const response = await fetch(marketDataUrl(displayCurrency, savedCoins.map(coin => coin.id)));
        if (!response.ok) throw apiError(response, 'Saved comparison refresh');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Saved comparison response was invalid.');
        if (data.length) {
            const requestedIds = new Set(savedCoins.map(coin => coin.id));
            const returned = new Map(data.filter(coin => coin && requestedIds.has(coin.id)).map(coin => [coin.id, coin]));
            if (!returned.size) throw new Error('CoinGecko did not return market data for the saved selection.');
            store.updateMany([...returned.values()]);
            const removedCoins = savedCoins.filter(coin => !returned.has(coin.id));
            removedCoins.forEach(coin => store.remove(coin.id));
            saveSelectedCoins();
            renderComparison();
            status.textContent = removedCoins.length
                ? `Comparison restored. ${removedCoins.map(coin => coin.name).join(', ')} ${removedCoins.length === 1 ? 'is' : 'are'} no longer available and was removed.`
                : 'Saved comparison restored with current market data.';
        } else {
            renderComparison();
            status.textContent = 'Saved coins are still listed, but current market data was unavailable. Use Refresh data to try again.';
        }
    } catch (error) {
        renderComparison();
        reportMarketDataError(error, 'Saved comparison refresh', 'Your saved coins are still available; current prices could not be refreshed.');
    } finally {
        setMarketRequestInProgress(false);
    }
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
    if (marketRequestInProgress) {
        status.textContent = 'Wait for the market data update to finish before adding a coin.';
        return;
    }
    if (store.has(id) || pendingIds.has(id)) return;
    clearInterval(cooldownTimer);
    pendingIds.add(id);
    searchRevision += 1;
    matchList.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    resetActiveSuggestion();
    status.textContent = 'Loading market data…';

    try {
        const response = await fetch(marketDataUrl(displayCurrency, [id]));
        if (!response.ok) throw apiError(response, 'Market data');
        const data = await response.json();
        const coin = Array.isArray(data) ? data.find(item => item.id === id) : null;
        if (!coin) throw new Error('No market data was returned for this coin.');

        store.add(coin);
        saveSelectedCoins();
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
try {
    const savedCurrency = localStorage.getItem(currencyStorageKey);
    if (supportedCurrencies.has(savedCurrency)) displayCurrency = savedCurrency;
} catch {
    // Use USD when browser storage is unavailable.
}
currencySelect.value = displayCurrency;
const savedCoins = readSavedCoins();
savedCoins.forEach(coin => store.add(coin));
currencySelect.addEventListener('change', () => changeDisplayCurrency(currencySelect.value));
const sortableFields = fields.filter(field => ['currency', 'number', 'percent'].includes(field.type));
sortableFields.forEach(field => {
    const option = document.createElement('option');
    option.value = field.key;
    option.textContent = fieldLabel(field);
    sortFieldSelect.appendChild(option);
});
sortFieldSelect.value = sortFieldKey;
updateSortDirectionButton();
sortFieldSelect.addEventListener('change', () => {
    sortFieldKey = sortFieldSelect.value;
    sortDirection = sortFieldKey === 'market_cap_rank' ? 1 : -1;
    updateSortDirectionButton();
    renderComparison();
    const field = sortableFields.find(candidate => candidate.key === sortFieldKey);
    status.textContent = `Comparison sorted by ${fieldLabel(field)}, ${sortDirection === 1 ? 'ascending' : 'descending'}.`;
});
sortDirectionButton.addEventListener('click', () => {
    sortDirection *= -1;
    updateSortDirectionButton();
    renderComparison();
    const field = sortableFields.find(candidate => candidate.key === sortFieldKey);
    status.textContent = `Comparison sorted by ${fieldLabel(field)}, ${sortDirection === 1 ? 'ascending' : 'descending'}.`;
});
refreshButton.addEventListener('click', refreshComparison);
clearSelectionButton.addEventListener('click', () => {
    store.getCoins().forEach(coin => store.remove(coin.id));
    saveSelectedCoins();
    renderComparison();
    status.textContent = 'Comparison cleared.';
    input.focus();
});
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
if (savedCoins.length) refreshSavedCoins();


