const DATA_URL = './data/treasury-bitcoin.json';
const state = { snapshot: null, query: '', type: 'all', sort: 'value' };
const byId = (id) => document.getElementById(id);
const isFiniteValue = (value) => value !== null && value !== '' && Number.isFinite(Number(value));
const formatNumber = (value, digits = 0) => Number.isFinite(Number(value))
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(Number(value))
    : '—';
const formatUsd = (value) => Number.isFinite(Number(value))
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value))
    : '—';

function safeRecords() {
    return Array.isArray(state.snapshot && state.snapshot.entities)
        ? state.snapshot.entities.filter((item) => item && typeof item.name === 'string' && Number.isFinite(Number(item.btc)))
        : [];
}

function filteredRecords() {
    const query = state.query.trim().toLocaleLowerCase();
    return safeRecords().filter((item) => {
        const matchesType = state.type === 'all' || item.type === state.type;
        const haystack = [item.name, item.symbol, item.country].filter(Boolean).join(' ').toLocaleLowerCase();
        return matchesType && (!query || haystack.includes(query));
    }).sort((a, b) => {
        if (state.sort === 'name') return a.name.localeCompare(b.name);
        const key = state.sort === 'holdings' ? 'btc' : 'valueUsd';
        return Number(b[key] || 0) - Number(a[key] || 0);
    });
}

function renderSummary() {
    const snapshot = state.snapshot;
    const entities = safeRecords();
    const totalBtc = Number(snapshot.totals && snapshot.totals.btc);
    const totalValue = Number(snapshot.totals && snapshot.totals.valueUsd);
    const entityCount = Number(snapshot.totals && snapshot.totals.entities);
    byId('treasury-count').textContent = formatNumber(Number.isFinite(entityCount) ? entityCount : entities.length);
    byId('treasury-btc').textContent = formatNumber(totalBtc, 2) + ' BTC';
    byId('treasury-value').textContent = formatUsd(totalValue);
    byId('treasury-share').textContent = Number.isFinite(totalBtc) ? formatNumber(totalBtc / 21000000 * 100, 2) + '%' : '—';
    const partial = snapshot.coverage && snapshot.coverage.complete === false
        ? ' The checked-in starter snapshot shows only the leading entries; the full list appears after a successful authenticated refresh.'
        : '';
    byId('treasury-freshness').textContent = 'Snapshot captured ' + snapshot.snapshotDate + ' from CoinGecko. ' +
        entities.length + ' records are shown.' + partial;
}

function renderLeaders() {
    const list = byId('treasury-leaders');
    list.replaceChildren();
    const leaders = safeRecords().slice().sort((a, b) => Number(b.btc) - Number(a.btc)).slice(0, 10);
    const max = Number(leaders[0] && leaders[0].btc) || 1;
    leaders.forEach((entity) => {
        const item = document.createElement('li');
        item.className = 'treasury-leader';
        const label = document.createElement('span');
        label.className = 'treasury-leader-name';
        label.textContent = entity.name;
        const amount = document.createElement('strong');
        amount.textContent = formatNumber(entity.btc) + ' BTC';
        const bar = document.createElement('span');
        bar.className = 'treasury-leader-bar';
        bar.setAttribute('aria-hidden', 'true');
        bar.style.setProperty('--bar-width', Math.max(2, Number(entity.btc) / max * 100) + '%');
        item.append(label, amount, bar);
        list.append(item);
    });
    if (!leaders.length) list.innerHTML = '<li>No entity records are available in this snapshot.</li>';
}

function renderRows() {
    const records = filteredRecords();
    const body = byId('treasury-rows');
    const cards = byId('treasury-cards');
    body.replaceChildren();
    cards.replaceChildren();
    byId('treasury-results').textContent = 'Showing ' + formatNumber(records.length) + ' of ' + formatNumber(safeRecords().length) + ' published records.';
    records.forEach((entity) => {
        const row = document.createElement('tr');
        [entity.name, entity.type === 'government' ? 'Government' : 'Company', entity.country || 'Not reported',
            formatNumber(entity.btc) + ' BTC', formatUsd(entity.valueUsd),
            isFiniteValue(entity.supplySharePct) ? formatNumber(entity.supplySharePct, 3) + '%' : '—'
        ].forEach((value) => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.append(cell);
        });
        body.append(row);

        const card = document.createElement('article');
        card.className = 'treasury-card';
        const title = document.createElement('h3');
        title.textContent = entity.name;
        const type = document.createElement('p');
        type.className = 'data-info-inline';
        type.textContent = (entity.type === 'government' ? 'Government' : 'Company') + (entity.country ? ' · ' + entity.country : '');
        const details = document.createElement('p');
        details.textContent = formatNumber(entity.btc) + ' BTC · ' + formatUsd(entity.valueUsd);
        card.append(title, type, details);
        cards.append(card);
    });
    if (!records.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.textContent = 'No matching entities in this snapshot.';
        row.append(cell);
        body.append(row);
    }
}

async function loadSnapshot() {
    const status = byId('treasury-status');
    const button = byId('refresh-treasuries');
    button.disabled = true;
    status.textContent = 'Loading the published snapshot…';
    try {
        const response = await fetch(DATA_URL, { cache: 'no-cache' });
        if (!response.ok) throw new Error('Snapshot request failed with HTTP ' + response.status + '.');
        const snapshot = await response.json();
        if (!snapshot || snapshot.schemaVersion !== 1 || !Array.isArray(snapshot.entities) || !snapshot.totals) {
            throw new Error('The published snapshot has an unsupported format.');
        }
        state.snapshot = snapshot;
        renderSummary();
        renderLeaders();
        renderRows();
        status.textContent = 'Snapshot loaded. USD values reflect the source snapshot date.';
    } catch (error) {
        status.textContent = error instanceof Error ? error.message : 'Treasury snapshot could not be loaded.';
        byId('treasury-freshness').textContent = 'The checked-in CoinGecko snapshot is currently unavailable. Try reloading the page later.';
    } finally {
        button.disabled = false;
    }
}

byId('treasury-search').addEventListener('input', (event) => { state.query = event.target.value; renderRows(); });
byId('treasury-type').addEventListener('change', (event) => { state.type = event.target.value; renderRows(); });
byId('treasury-sort').addEventListener('change', (event) => { state.sort = event.target.value; renderRows(); });
byId('refresh-treasuries').addEventListener('click', loadSnapshot);
loadSnapshot();
