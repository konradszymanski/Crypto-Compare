const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function makeClient(fetchImpl, storage = new Map()) {
    const window = {
        location: { href: 'https://site.test/' },
        sessionStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../data-client.js'), 'utf8'), {
        window, fetch: fetchImpl, AbortController, URL, Date, Map, Object, Number, Error, JSON, setTimeout, clearTimeout
    });
    return window.CryptoCompareData;
}
const response = (status, body, headers = {}) => ({
    ok: status >= 200 && status < 300, status,
    headers: { get: name => headers[name] || headers[name.toLowerCase()] || null },
    json: async () => body
});

test('session cache returns source and timestamp within its TTL', async () => {
    let calls = 0;
    const api = makeClient(async () => { calls++; return response(200, { value: 1 }); });
    const options = { cacheKey: 'asset:btc', cacheTtlMs: 60_000 };
    const first = await api.requestJsonWithMetadata('https://api.test/btc', options);
    const second = await api.requestJsonWithMetadata('https://api.test/btc', options);
    assert.deepEqual(first.data, { value: 1 });
    assert.equal(first.source, 'network');
    assert.equal(second.source, 'session-cache');
    assert.equal(second.cachedAt, first.cachedAt);
    assert.equal(calls, 1);
});

test('force refresh bypasses the fresh session cache', async () => {
    let calls = 0;
    const api = makeClient(async () => response(200, { value: ++calls }));
    const options = { cacheKey: 'market:global', cacheTtlMs: 60_000 };
    await api.requestJsonWithMetadata('https://api.test/global', options);
    const refreshed = await api.requestJsonWithMetadata('https://api.test/global', { ...options, forceRefresh: true });
    assert.equal(refreshed.data.value, 2);
    assert.equal(refreshed.source, 'network');
    assert.equal(calls, 2);
});

test('identical simultaneous requests are de-duplicated', async () => {
    let calls = 0, resolveRequest;
    const api = makeClient(() => { calls++; return new Promise(resolve => { resolveRequest = resolve; }); });
    const a = api.requestJson('https://api.test/shared'), b = api.requestJson('https://api.test/shared');
    await Promise.resolve();
    assert.equal(calls, 1);
    resolveRequest(response(200, { ok: true }));
    assert.deepEqual(await a, { ok: true });
    assert.deepEqual(await b, { ok: true });
});

test('429 Retry-After starts an origin-wide cooldown', async () => {
    let calls = 0;
    const api = makeClient(async () => { calls++; return response(429, {}, { 'Retry-After': '60' }); });
    await assert.rejects(api.requestJson('https://api.test/limited'), error => error.status === 429 && error.retryAfterMs === 60_000);
    await assert.rejects(api.requestJson('https://api.test/other'), error => error.status === 429 && error.retryAfterMs > 0);
    assert.equal(calls, 1);
});
