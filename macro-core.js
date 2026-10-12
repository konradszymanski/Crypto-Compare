(function (root) {
  'use strict';
  function normalizeMonthlyRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.filter(row => /^\d{4}-\d{2}$/.test(row.date) && Number.isFinite(row.fedFundsPct))
      .map(row => ({ date: row.date, fedFundsPct: row.fedFundsPct, cpiYoYPct: Number.isFinite(row.cpiYoYPct) ? row.cpiYoYPct : null }));
  }
  function monthEndPrice(points, throughDate) {
    const byMonth = new Map();
    if (!Array.isArray(points)) return byMonth;
    const cutoff = Date.parse(throughDate + 'T23:59:59.999Z');
    points.forEach(point => {
      const timestamp = Number(point[0]), price = Number(point[1]);
      if (!Number.isFinite(timestamp) || !Number.isFinite(price) || price <= 0 || timestamp > cutoff) return;
      const month = new Date(timestamp).toISOString().slice(0, 7);
      byMonth.set(month, price);
    });
    return byMonth;
  }
  function alignMonthlyData(rows, points, throughDate) {
    const cutoffMonth = throughDate.slice(0, 7);
    const btc = monthEndPrice(points, throughDate);
    return normalizeMonthlyRows(rows).filter(row => row.date <= cutoffMonth).map(row => ({
      date: row.date, btcPrice: btc.has(row.date) ? btc.get(row.date) : null,
      fedFundsPct: row.fedFundsPct, cpiYoYPct: row.cpiYoYPct
    }));
  }
  function latestValue(rows, key) {
    return [...normalizeMonthlyRows(rows)].reverse().find(row => row[key] != null) || null;
  }
  const api = { normalizeMonthlyRows, monthEndPrice, alignMonthlyData, latestValue };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CryptoMacroCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
