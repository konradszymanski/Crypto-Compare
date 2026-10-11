(() => {
    const API = 'https://api.coingecko.com/api/v3';
    const CACHE_KEY = 'crypto-compare-market-snapshot-v1';
    const CACHE_MS = 5 * 60 * 1000;
    const status = document.getElementById('market-status');
    const rows = document.getElementById('leaders-rows');
    const cards = document.getElementById('leaders-cards');
    const usd = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
    const compact = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 });
    let busy = false;

    function readCache() {
        try {
            const value = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
            return value && value.global && Array.isArray(value.coins) ? value : null;
        } catch { return null; }
    }

    function saveCache(snapshot) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...snapshot, savedAt: Date.now() })); } catch { /* The page still works without storage. */ }
    }

    async function request(path) {
        const response = await fetch(`${API}${path}`);
        if (!response.ok) {
            const error = new Error(`CoinGecko returned HTTP ${response.status}.`);
            error.status = response.status;
            throw error;
        }
        return response.json();
    }

    function currency(value, short = false) {
        return Number.isFinite(value) ? (short ? compact : usd).format(value) : '—';
    }

    function percentage(value) {
        return Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : '—';
    }

    function render(snapshot, stale = false) {
        const data = snapshot.global.data || snapshot.global;
        const cap = data.total_market_cap?.usd;
        const volume = data.total_volume?.usd;
        document.getElementById('metric-market-cap').textContent = currency(cap, true);
        document.getElementById('metric-cap-change').textContent = `24-hour change: ${percentage(data.market_cap_change_percentage_24h_usd)}`;
        document.getElementById('metric-volume').textContent = currency(volume, true);
        document.getElementById('metric-btc-share').textContent = percentage(data.market_cap_percentage?.btc);
        document.getElementById('metric-eth-share').textContent = percentage(data.market_cap_percentage?.eth);
        rows.replaceChildren(); cards.replaceChildren();
        snapshot.coins.forEach(coin => {
            const row = document.createElement('tr');
            const values = [String(coin.market_cap_rank ?? '—'), `${coin.name} (${String(coin.symbol || '').toUpperCase()})`, currency(coin.current_price), currency(coin.market_cap, true), percentage(coin.price_change_percentage_24h), percentage(coin.ath_change_percentage)];
            values.forEach((value, index) => { const cell = document.createElement(index === 0 ? 'th' : 'td'); if (index === 0) cell.scope = 'row'; cell.textContent = value; row.appendChild(cell); });
            rows.appendChild(row);
            const card = document.createElement('article'); card.className = 'coin-card';
            const heading = document.createElement('h3'); heading.textContent = `${coin.market_cap_rank ?? '—'}. ${coin.name} (${String(coin.symbol || '').toUpperCase()})`;
            const details = document.createElement('p'); details.textContent = `${currency(coin.current_price)} · 24h ${percentage(coin.price_change_percentage_24h)} · ATH drawdown ${percentage(coin.ath_change_percentage)}`;
            card.append(heading, details); cards.appendChild(card);
        });
        const updatedAt = Number(snapshot.savedAt) || Date.now();
        document.getElementById('market-freshness').textContent = `${stale ? 'Showing saved data. ' : ''}Snapshot fetched ${new Date(updatedAt).toLocaleString()}. CoinGecko’s public API may rate limit requests; figures can be delayed.`;
    }

    async function load(force = false) {
        if (busy) return;
        busy = true;
        const cached = readCache();
        if (!force && cached && Date.now() - cached.savedAt < CACHE_MS) {
            render(cached);
            status.textContent = 'Showing a recent cached snapshot.';
            busy = false;
            return;
        }
        status.textContent = 'Fetching global market metrics and leading assets…';
        document.getElementById('refresh-market').disabled = true;
        try {
            const [global, coins] = await Promise.all([
                request('/global'),
                request('/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h')
            ]);
            if (!Array.isArray(coins)) throw new Error('CoinGecko returned an invalid asset list.');
            const snapshot = { global, coins, savedAt: Date.now() };
            saveCache(snapshot); render(snapshot);
            status.textContent = 'Market snapshot updated.';
        } catch (error) {
            if (cached) {
                render(cached, true);
                status.textContent = `Could not refresh (${error.message}) Showing the saved snapshot instead.`;
            } else {
                status.textContent = `Market data is unavailable (${error.message}). Wait briefly before retrying if CoinGecko is rate limiting requests.`;
                rows.replaceChildren();
                const row = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 6; cell.textContent = 'No market snapshot is available yet.'; row.appendChild(cell); rows.appendChild(row);
            }
        } finally {
            busy = false;
            document.getElementById('refresh-market').disabled = false;
        }
    }

    document.getElementById('refresh-market').addEventListener('click', () => load(true));
    load();
})();
