const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const macro = require('../macro-core.js');

const snapshot = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'macro-monthly.json'), 'utf8'));

test('macro snapshot has sourced monthly observations and keeps missing CPI values explicit', () => {
    assert.equal(snapshot.schemaVersion, 1);
    assert.equal(snapshot.sources.fedFunds.id, 'FEDFUNDS');
    assert.equal(snapshot.sources.cpi.id, 'CPIAUCSL');
    assert.ok(snapshot.observations.length >= 190);
    assert.equal(snapshot.observations[0].date, '2010-01');
    assert.equal(snapshot.observations.at(-1).date, '2026-09');
    assert.ok(snapshot.observations.some(row => row.cpiYoYPct == null));
});

test('macro chart rows stop at the selected month and align the final BTC close in each month', () => {
    const points = [
        [Date.parse('2024-01-02T00:00:00Z'), 42000],
        [Date.parse('2024-01-31T00:00:00Z'), 43000],
        [Date.parse('2024-02-29T00:00:00Z'), 61000]
    ];
    const rows = macro.alignMonthlyData([
        { date: '2024-01', fedFundsPct: 5.33, cpiYoYPct: 3.1 },
        { date: '2024-02', fedFundsPct: 5.33, cpiYoYPct: 3.2 },
        { date: '2024-03', fedFundsPct: 5.33, cpiYoYPct: 3.3 }
    ], points, '2024-02-15');

    assert.deepEqual(rows.map(row => row.date), ['2024-01', '2024-02']);
    assert.deepEqual(rows.map(row => row.btcPrice), [43000, null]);
});

test('latest macro values retain each indicator observation month', () => {
    const rows = [
        { date: '2026-08', fedFundsPct: 3.63, cpiYoYPct: 3.35 },
        { date: '2026-09', fedFundsPct: 3.75, cpiYoYPct: null }
    ];
    assert.equal(macro.latestValue(rows, 'fedFundsPct').date, '2026-09');
    assert.equal(macro.latestValue(rows, 'cpiYoYPct').date, '2026-08');
});
