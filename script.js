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

const coinListUrl = 'https://api.coingecko.com/api/v3/coins/list?include_platform=false';
const marketUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=';
let coinListPromise;
let searchRevision = 0;
const pendingIds = new Set();

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
    if (coins.length === 0) {
        matchList.textContent = 'No coins found.';
        return;
    }

    coins.forEach(coin => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'suggestion';
        const name = document.createElement('span');
        name.textContent = coin.name;
        const id = document.createElement('span');
        id.className = 'suggestion-id';
        id.textContent = store.has(coin.id) ? `${coin.id} · Added` : pendingIds.has(coin.id) ? `${coin.id} · Adding…` : coin.id;
        button.append(name, id);

        const alreadyAdded = store.has(coin.id);
        button.disabled = alreadyAdded || pendingIds.has(coin.id);
        if (alreadyAdded) button.setAttribute('aria-label', `${coin.name}, already in comparison`);
        button.addEventListener('click', () => loadCoin(coin.id));
        matchList.appendChild(button);
    });
}

async function loadCoinList() {
    if (!coinListPromise) {
        coinListPromise = fetch(coinListUrl).then(async response => {
            if (!response.ok) throw new Error(`Coin list request failed (${response.status}).`);
            const coins = await response.json();
            if (!Array.isArray(coins)) throw new Error('Coin list response was not an array.');
            return coins;
        }).catch(error => {
            coinListPromise = undefined;
            throw error;
        });
    }
    return coinListPromise;
}

async function searchCoins(searchText) {
    const revision = ++searchRevision;
    const query = searchText.trim().toLocaleLowerCase();
    status.textContent = '';
    matchList.replaceChildren();
    if (!query) return;

    matchList.textContent = 'Searching…';
    try {
        const availableCoins = await loadCoinList();
        if (revision !== searchRevision) return;
        const matches = availableCoins.filter(coin => {
            const name = String(coin.name || '').toLocaleLowerCase();
            const id = String(coin.id || '').toLocaleLowerCase();
            return name.startsWith(query) || id.startsWith(query);
        }).slice(0, 10);
        renderSuggestions(matches);
    } catch (error) {
        if (revision !== searchRevision) return;
        matchList.replaceChildren();
        status.textContent = 'Coin search is unavailable. Check your connection and try again.';
        console.error(error);
    }
}

async function loadCoin(id) {
    if (store.has(id) || pendingIds.has(id)) return;
    pendingIds.add(id);
    searchRevision += 1;
    matchList.replaceChildren();
    status.textContent = 'Loading market data…';

    try {
        const response = await fetch(`${marketUrl}${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error(`Market data request failed (${response.status}).`);
        const data = await response.json();
        const coin = Array.isArray(data) ? data.find(item => item.id === id) : null;
        if (!coin) throw new Error('No market data was returned for this coin.');

        store.add(coin);
        input.value = '';
        status.textContent = `${coin.name} added to comparison.`;
        renderComparison();
    } catch (error) {
        status.textContent = 'Market data could not be loaded. Please try again.';
        console.error(error);
    } finally {
        pendingIds.delete(id);
    }
}

input.addEventListener('input', () => searchCoins(input.value));
renderComparison();

