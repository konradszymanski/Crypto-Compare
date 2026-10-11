(function (root) {
    'use strict';

    const DAY_MS = 24 * 60 * 60 * 1000;
    const HALVINGS = [
        { date: '2012-11-28', label: '2012 cycle' },
        { date: '2016-07-09', label: '2016 cycle' },
        { date: '2020-05-11', label: '2020 cycle' },
        { date: '2024-04-20', label: '2024 cycle' }
    ];

    function utcDay(date) {
        const parsed = new Date(`${date}T00:00:00.000Z`);
        if (Number.isNaN(parsed.getTime())) throw new TypeError(`Invalid date: ${date}`);
        return Math.floor(parsed.getTime() / DAY_MS);
    }

    function daysBetween(start, end) {
        return utcDay(end) - utcDay(start);
    }

    function normalizeSeries(points) {
        if (!Array.isArray(points)) return [];
        return points.map(point => ({ day: Math.floor(Number(point[0]) / DAY_MS), price: Number(point[1]) }))
            .filter(point => Number.isFinite(point.day) && Number.isFinite(point.price) && point.price > 0)
            .sort((a, b) => a.day - b.day);
    }

    function priceAtOrAfter(series, day, maxDelayDays = 7) {
        return series.find(point => point.day >= day && point.day <= day + maxDelayDays);
    }

    function buildCycleSeries(cycles, priceSets, selectedDate, assets = ['bitcoin', 'ethereum']) {
        const selectedDay = utcDay(selectedDate);
        const activeIndex = cycles.length - 1;
        const activeAge = Math.max(0, selectedDay - utcDay(cycles[activeIndex].date));
        return cycles.map((cycle, index) => {
            const startDay = utcDay(cycle.date);
            const endDay = index < cycles.length - 1
                ? Math.min(selectedDay, utcDay(cycles[index + 1].date) - 1)
                : selectedDay;
            const maxAge = Math.max(0, endDay - startDay);
            const ageLimit = index === activeIndex ? activeAge : Math.min(activeAge, maxAge);
            const assetsData = {};
            assets.forEach(asset => {
                const series = normalizeSeries(priceSets[asset] || []);
                const baseline = priceAtOrAfter(series, startDay);
                if (!baseline) return;
                const values = [];
                series.forEach(point => {
                    const offset = point.day - baseline.day;
                    if (offset < 0 || offset > ageLimit) return;
                    values.push({ day: offset, price: point.price, returnPct: ((point.price / baseline.price) - 1) * 100 });
                });
                assetsData[asset] = {
                    baselineDate: new Date(baseline.day * DAY_MS).toISOString().slice(0, 10),
                    baselinePrice: baseline.price,
                    values
                };
            });
            return { label: cycle.label, date: cycle.date, maxDay: ageLimit, assets: assetsData };
        });
    }

    const api = { DAY_MS, HALVINGS, utcDay, daysBetween, normalizeSeries, buildCycleSeries };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.BitcoinCycleCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
