(function (root, factory) {
    const core = factory();
    if (typeof module === 'object' && module.exports) module.exports = core;
    root.CryptoCompareCore = core;
})(globalThis, function () {
    const fields = Object.freeze([
        { key: 'current_price', label: 'Current price', type: 'currency' },
        { key: 'symbol', label: 'Symbol', type: 'symbol' },
        { key: 'image', label: 'Logo', type: 'image' },
        { key: 'market_cap_rank', label: 'Market cap rank', type: 'number' },
        { key: 'market_cap', label: 'Market cap', type: 'currency' },
        { key: 'fully_diluted_valuation', label: 'Fully diluted valuation', type: 'currency' },
        { key: 'total_volume', label: '24h volume', type: 'currency' },
        { key: 'high_24h', label: '24h high', type: 'currency' },
        { key: 'low_24h', label: '24h low', type: 'currency' },
        { key: 'price_change_24h', label: '24h price change (USD)', type: 'currency' },
        { key: 'price_change_percentage_24h', label: '24h price change (%)', type: 'percent' },
        { key: 'market_cap_change_24h', label: '24h market cap change (USD)', type: 'currency' },
        { key: 'market_cap_change_percentage_24h', label: '24h market cap change (%)', type: 'percent' },
        { key: 'circulating_supply', label: 'Circulating supply', type: 'number' },
        { key: 'total_supply', label: 'Total supply', type: 'number' },
        { key: 'max_supply', label: 'Maximum supply', type: 'number' },
        { key: 'ath', label: 'All-time high', type: 'currency' },
        { key: 'ath_change_percentage', label: 'Change from all-time high (%)', type: 'percent' },
        { key: 'ath_date', label: 'All-time high date', type: 'date' },
        { key: 'atl', label: 'All-time low', type: 'currency' },
        { key: 'atl_change_percentage', label: 'Change from all-time low (%)', type: 'percent' },
        { key: 'atl_date', label: 'All-time low date', type: 'date' },
        { key: 'last_updated', label: 'Last updated', type: 'datetime' }
    ]);

    function createStore() {
        let coins = [];

        return {
            getCoins() {
                return coins.slice();
            },
            has(id) {
                return coins.some(coin => coin.id === id);
            },
            add(coin) {
                if (!coin || !coin.id) throw new TypeError('A coin with an id is required.');
                if (this.has(coin.id)) return false;
                coins = [...coins, coin];
                return true;
            },
            remove(id) {
                const nextCoins = coins.filter(coin => coin.id !== id);
                if (nextCoins.length === coins.length) return false;
                coins = nextCoins;
                return true;
            }
        };
    }

    function formatValue(field, coin) {
        const value = coin[field.key];
        if (value === null || value === undefined || value === '') return '—';
        if (field.type === 'image') return value;
        if (field.type === 'symbol') return String(value).toUpperCase();
        if (field.type === 'currency') {
            return new Intl.NumberFormat('en-US', {
                style: 'currency', currency: 'USD', maximumSignificantDigits: 9
            }).format(value);
        }
        if (field.type === 'number') {
            return new Intl.NumberFormat('en-US', { maximumSignificantDigits: 9 }).format(value);
        }
        if (field.type === 'percent') {
            return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)}%`;
        }
        if (field.type === 'date' || field.type === 'datetime') {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return '—';
            return field.type === 'date' ? date.toLocaleDateString() : date.toLocaleString();
        }
        return String(value);
    }

    return Object.freeze({ fields, createStore, formatValue });
});

