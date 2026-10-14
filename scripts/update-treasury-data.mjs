import { writeFile } from 'node:fs/promises';

const apiKey = process.env.COINGECKO_DEMO_API_KEY;
if (!apiKey) {
    throw new Error('COINGECKO_DEMO_API_KEY is not set. Add it as a GitHub Actions secret before running this updater.');
}

const endpointBase = 'https://api.coingecko.com/api/v3';
const sourceUrl = 'https://www.coingecko.com/en/treasuries/bitcoin';
const apiDocsUrl = 'https://docs.coingecko.com/demo/reference/companies-public-treasury';

async function fetchEntityType(entityType) {
    const rows = [];
    for (let page = 1; page <= 10; page += 1) {
        const url = new URL(endpointBase + '/' + entityType + '/public_treasury/bitcoin');
        url.search = new URLSearchParams({ per_page: '250', page: String(page) });
        const response = await fetch(url, {
            headers: { accept: 'application/json', 'x-cg-demo-api-key': apiKey }
        });
        if (!response.ok) throw new Error('CoinGecko ' + entityType + ' treasury endpoint returned HTTP ' + response.status + '.');
        const payload = await response.json();
        const records = payload && Array.isArray(payload[entityType]) ? payload[entityType] : null;
        if (!records) throw new Error('CoinGecko returned an unexpected ' + entityType + ' treasury response.');
        rows.push(...records.map((record) => normalize(record, entityType === 'companies' ? 'company' : 'government')).filter(Boolean));
        if (records.length < 250) break;
    }
    return rows;
}

function normalize(record, type) {
    if (!record || typeof record.name !== 'string') return null;
    const btc = Number(record.total_holdings);
    const valueUsd = Number(record.total_current_value_usd);
    if (!Number.isFinite(btc) || btc < 0 || !Number.isFinite(valueUsd) || valueUsd < 0) return null;
    return {
        name: record.name,
        symbol: typeof record.symbol === 'string' ? record.symbol : '',
        country: typeof record.country === 'string' ? record.country : '',
        type,
        btc,
        valueUsd,
        supplySharePct: Number.isFinite(Number(record.percentage_of_total_supply)) ? Number(record.percentage_of_total_supply) : null
    };
}

const [companies, governments] = await Promise.all([
    fetchEntityType('companies'),
    fetchEntityType('governments')
]);
const entities = [...companies, ...governments]
    .sort((a, b) => b.valueUsd - a.valueUsd || b.btc - a.btc);
if (!entities.length) throw new Error('CoinGecko returned no valid treasury entities; keeping the existing snapshot.');

const btc = entities.reduce((sum, item) => sum + item.btc, 0);
const valueUsd = entities.reduce((sum, item) => sum + item.valueUsd, 0);
const snapshot = {
    schemaVersion: 1,
    snapshotDate: new Date().toISOString().slice(0, 10),
    source: { name: 'CoinGecko Bitcoin Treasury Holdings API', url: sourceUrl, apiDocsUrl },
    totals: { entities: entities.length, btc: Number(btc.toFixed(8)), valueUsd: Math.round(valueUsd) },
    coverage: { complete: true, reportedEntityCount: entities.length, displayedEntityCount: entities.length },
    entities
};
await writeFile(new URL('../public/data/treasury-bitcoin.json', import.meta.url), JSON.stringify(snapshot, null, 2) + '\n');
console.log('Updated treasury snapshot with ' + entities.length + ' entities as of ' + snapshot.snapshotDate + '.');
