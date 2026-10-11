const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore, fields, formatValue } = require('../comparison-core.js');

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

