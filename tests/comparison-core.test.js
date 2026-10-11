const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, fields, formatValue, marketDataUrl } = require('../comparison-core.js');
const { eventWindow } = require('../event-core.js');

test('store adds unique coin ids and returns current selections', () => {
    const store = createStore();
    const bitcoin = { id: 'bitcoin', name: 'Bitcoin' };

    assert.equal(store.add(bitcoin), true);
    assert.equal(store.add({ id: 'bitcoin', name: 'Duplicate' }), false);
    assert.deepEqual(store.getCoins(), [bitcoin]);
    assert.equal(store.has('bitcoin'), true);
});

test('store removes a selected coin and reports missing ids', () => {
    const store = createStore();
    store.add({ id: 'bitcoin', name: 'Bitcoin' });

    assert.equal(store.remove('bitcoin'), true);
    assert.equal(store.remove('bitcoin'), false);
    assert.deepEqual(store.getCoins(), []);
});

test('store refreshes all selected market data without changing selection order', () => {
    const store = createStore();
    store.add({ id: 'bitcoin', current_price: 1 });
    store.add({ id: 'ethereum', current_price: 2 });

    assert.deepEqual(store.updateMany([
        { id: 'ethereum', current_price: 20 },
        { id: 'bitcoin', current_price: 10 },
        { id: 'unselected', current_price: 30 }
    ]), ['bitcoin', 'ethereum']);
    assert.deepEqual(store.getCoins(), [
        { id: 'bitcoin', current_price: 10 },
        { id: 'ethereum', current_price: 20 }
    ]);
});

test('store rejects coins without an id', () => {
    const store = createStore();
    assert.throws(() => store.add({ name: 'Coin without id' }), /id is required/);
});

test('formatValue makes USD currency and percentages explicit', () => {
    const price = fields.find(field => field.key === 'current_price');
    const change = fields.find(field => field.key === 'price_change_percentage_24h');

    assert.equal(formatValue(price, { current_price: 1250 }), '$1,250');
    assert.equal(formatValue(change, { price_change_percentage_24h: -2.5 }), '-2.5%');
});

test('formatValue supports alternate display currencies', () => {
    const price = fields.find(field => field.key === 'current_price');

    assert.match(formatValue(price, { current_price: 1250 }, 'EUR'), /€\s?1,250/);
    assert.match(formatValue(price, { current_price: 1250 }, 'GBP'), /£\s?1,250/);
});

test('marketDataUrl requests all selected ids in the chosen currency', () => {
    assert.equal(
        marketDataUrl('EUR', ['bitcoin', 'ethereum']),
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&ids=bitcoin%2Cethereum&sparkline=false'
    );
});

test('formatValue shows missing or invalid values as an em dash', () => {
    const supply = fields.find(field => field.key === 'max_supply');
    const athDate = fields.find(field => field.key === 'ath_date');

    assert.equal(formatValue(supply, { max_supply: null }), '—');
    assert.equal(formatValue(athDate, { ath_date: 'not-a-date' }), '—');
});

test('formatValue uppercases symbols', () => {
    const symbol = fields.find(field => field.key === 'symbol');
    assert.equal(formatValue(symbol, { symbol: 'btc' }), 'BTC');
});

test('event window indexes BTC returns to the first price in the 60-day window', () => {
    const day = 24 * 60 * 60 * 1000;
    const start = Date.parse('2020-02-10T00:00:00Z');
    const prices = Array.from({ length: 61 }, (_, index) => [start + index * day, 100 + index]);
    const result = eventWindow(prices, '2020-03-11');

    assert.equal(result.startDate, '2020-02-10');
    assert.equal(result.endDate, '2020-04-10');
    assert.equal(result.values[30].day, 0);
    assert.ok(Math.abs(result.returnPct - 60) < 1e-9);
    assert.ok(Math.abs(result.eventReturnPct - 30) < 1e-9);
});

test('event window returns null when no prices cover the requested dates', () => {
    assert.equal(eventWindow([], '2020-03-11'), null);
});

