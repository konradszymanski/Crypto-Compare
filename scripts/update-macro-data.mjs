import { writeFile } from 'node:fs/promises';

const startDate = '2009-01-01';
const definitions = {
    fedFunds: { id: 'FEDFUNDS', url: 'https://fred.stlouisfed.org/series/FEDFUNDS', source: 'Board of Governors of the Federal Reserve System', unit: 'percent', frequency: 'monthly average' },
    cpi: { id: 'CPIAUCSL', url: 'https://fred.stlouisfed.org/series/CPIAUCSL', source: 'U.S. Bureau of Labor Statistics via FRED', unit: 'percent', frequency: 'monthly, seasonally adjusted', method: '(CPI index this month / CPI index 12 months earlier - 1) * 100' }
};

async function fetchSeries(id) {
    const url = new URL('https://fred.stlouisfed.org/graph/fredgraph.csv');
    url.search = new URLSearchParams({ id, cosd: startDate });
    const response = await fetch(url, { headers: { accept: 'text/csv', 'user-agent': 'Crypto-Compare macro snapshot updater' } });
    if (!response.ok) throw new Error(`FRED ${id} CSV returned HTTP ${response.status}`);
    const lines = (await response.text()).trim().split(/\r?\n/);
    const rows = lines.slice(1).map(line => line.split(',')).filter(([date, value]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && value && value !== '.');
    if (rows.length < 120) throw new Error(`FRED ${id} returned too few valid observations (${rows.length}).`);
    return new Map(rows.map(([date, value]) => [date.slice(0, 7), Number(value)]));
}

const [fed, cpi] = await Promise.all([fetchSeries('FEDFUNDS'), fetchSeries('CPIAUCSL')]);
const months = [...fed.keys()].filter(date => date >= '2010-01').sort();
const observations = months.map(date => {
    const [year, month] = date.split('-').map(Number);
    const priorYear = `${year - 1}-${String(month).padStart(2, '0')}`;
    const currentCpi = cpi.get(date);
    const previousCpi = cpi.get(priorYear);
    const cpiYoYPct = currentCpi != null && previousCpi != null
        ? Number(((currentCpi / previousCpi - 1) * 100).toFixed(3))
        : null;
    return { date, fedFundsPct: fed.get(date), cpiYoYPct };
}).filter(row => row.fedFundsPct != null);

if (!observations.length || observations.at(-1).date < new Date().toISOString().slice(0, 7).replace(/-\d{2}$/, '')) {
    console.warn('FRED has not published the current month; keeping the latest available observations.');
}
const snapshot = {
    schemaVersion: 1,
    snapshotDate: new Date().toISOString().slice(0, 10),
    sources: {
        fedFunds: { id: definitions.fedFunds.id, label: 'Federal funds effective rate', url: definitions.fedFunds.url, source: definitions.fedFunds.source, unit: definitions.fedFunds.unit, frequency: definitions.fedFunds.frequency },
        cpi: { id: definitions.cpi.id, label: 'U.S. CPI inflation, year over year', url: definitions.cpi.url, source: definitions.cpi.source, unit: definitions.cpi.unit, frequency: definitions.cpi.frequency, method: definitions.cpi.method }
    },
    observations
};
await writeFile(new URL('../data/macro-monthly.json', import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Updated ${observations.length} macro observations through ${observations.at(-1).date}.`);
