(function (root) {
    'use strict';
    const DAY_MS = 24 * 60 * 60 * 1000;

    function utcDay(date) {
        const value = Date.parse(`${date}T00:00:00.000Z`);
        if (!Number.isFinite(value)) throw new TypeError(`Invalid date: ${date}`);
        return Math.floor(value / DAY_MS);
    }

    function normalizeSeries(points) {
        if (!Array.isArray(points)) return [];
        return points.map(point => ({ day: Math.floor(Number(point[0]) / DAY_MS), price: Number(point[1]) }))
            .filter(point => Number.isFinite(point.day) && Number.isFinite(point.price) && point.price > 0)
            .sort((a, b) => a.day - b.day);
    }

    function eventWindow(points, eventDate, radiusDays = 30) {
        const series = normalizeSeries(points);
        const eventDay = utcDay(eventDate);
        const start = eventDay - radiusDays;
        const end = eventDay + radiusDays;
        const values = series.filter(point => point.day >= start && point.day <= end);
        if (!values.length) return null;
        const baseline = values.find(point => point.day >= start);
        if (!baseline) return null;
        const eventPoint = values.find(point => point.day >= eventDay);
        const endPoint = [...values].reverse().find(point => point.day <= end);
        return {
            eventDay,
            startDate: new Date(baseline.day * DAY_MS).toISOString().slice(0, 10),
            endDate: new Date(endPoint.day * DAY_MS).toISOString().slice(0, 10),
            baselinePrice: baseline.price,
            eventPrice: eventPoint?.price ?? null,
            endPrice: endPoint.price,
            returnPct: ((endPoint.price / baseline.price) - 1) * 100,
            eventReturnPct: eventPoint ? ((eventPoint.price / baseline.price) - 1) * 100 : null,
            values: values.map(point => ({ day: point.day - eventDay, price: point.price, returnPct: ((point.price / baseline.price) - 1) * 100 }))
        };
    }

    const api = { DAY_MS, utcDay, normalizeSeries, eventWindow };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.CryptoEventCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
