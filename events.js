(() => {
    const core = window.CryptoEventCore;
    const events = [
        { date: '2020-03-11', category: 'macro', title: 'WHO characterizes COVID-19 as a pandemic', detail: 'The World Health Organization described COVID-19 as a pandemic during its March 11 media briefing.', source: 'https://www.who.int/director-general/speeches/detail/who-director-general-s-opening-remarks-at-the-media-briefing-on-covid-19---11-march-2020' },
        { date: '2022-02-24', category: 'macro', title: 'Russia launches its full-scale invasion of Ukraine', detail: 'The UN Security Council met after Russia launched its invasion, a major geopolitical shock during a period of global market uncertainty.', source: 'https://press.un.org/en/2022/sc14808.doc.htm' },
        { date: '2022-11-11', category: 'crypto', title: 'FTX Trading and affiliates file for Chapter 11', detail: 'FTX announced that FTX Trading Ltd. and approximately 130 affiliated companies had commenced voluntary Chapter 11 proceedings.', source: 'https://www.prnewswire.com/news-releases/ftx-trading-ltd-and-approximately-130-additional-affiliated-companies-commence-voluntary-chapter-11-proceedings-in-delaware-301675116.html' },
        { date: '2024-01-10', category: 'crypto', title: 'SEC approves spot Bitcoin exchange-traded products', detail: 'The SEC approved the listing and trading of several spot Bitcoin exchange-traded product shares.', source: 'https://www.sec.gov/newsroom/press-releases/2024-4' },
        { date: '2024-04-20', category: 'crypto', title: 'Bitcoin’s fourth halving', detail: 'Block 840,000 marked the subsidy halving from 6.25 BTC to 3.125 BTC per block.', source: 'https://www.blockchain.com/explorer/blocks/btc/840000' }
    ].sort((a, b) => a.date.localeCompare(b.date));
    const list = document.getElementById('event-list');
    const filter = document.getElementById('event-filter');
    const status = document.getElementById('event-status');
    const info = document.getElementById('event-data-info');
    const canvas = document.getElementById('event-chart');
    const summary = document.getElementById('event-chart-summary');
    const heading = document.getElementById('event-chart-heading');
    const formatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
    const seriesCache = new Map();
    let activeEvent = null;

    function showEvents() {
        list.replaceChildren();
        events.filter(item => filter.value === 'all' || item.category === filter.value).forEach(item => {
            const article = document.createElement('article'); article.className = 'event-card';
            const date = document.createElement('time'); date.dateTime = item.date; date.textContent = new Date(`${item.date}T00:00:00Z`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
            const tag = document.createElement('span'); tag.className = 'event-tag'; tag.textContent = item.category === 'macro' ? 'Macro & world' : 'Crypto';
            const title = document.createElement('h3'); title.textContent = item.title;
            const detail = document.createElement('p'); detail.textContent = item.detail;
            const source = document.createElement('a'); source.href = item.source; source.target = '_blank'; source.rel = 'noreferrer'; source.textContent = 'Read source';
            const inspect = document.createElement('button'); inspect.type = 'button'; inspect.textContent = 'Compare BTC ±30 days'; inspect.setAttribute('aria-label', `Compare Bitcoin returns around ${item.title}`); inspect.addEventListener('click', () => loadWindow(item));
            article.append(date, tag, title, detail, source, inspect); list.appendChild(article);
        });
    }

    function httpError(response, provider) {
        const error = new Error(`${provider} returned HTTP ${response.status}.`); error.status = response.status; return error;
    }

    async function getSeries() {
        if (seriesCache.has('bitcoin')) return seriesCache.get('bitcoin');
        const work = (async () => {
            let geckoError;
            try {
                const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max');
                if (!response.ok) throw httpError(response, 'CoinGecko');
                const payload = await response.json();
                if (!Array.isArray(payload.prices) || !payload.prices.length) throw new Error('CoinGecko returned no BTC history.');
                return { points: payload.prices, provider: 'CoinGecko BTC/USD' };
            } catch (error) { geckoError = error; }

            const storedKey = 'crypto-events-binance-btc-v1';
            try {
                const stored = JSON.parse(sessionStorage.getItem(storedKey) || 'null');
                if (Array.isArray(stored?.prices) && Date.now() - stored.savedAt < 6 * 60 * 60 * 1000) return { points: stored.prices, provider: 'saved Binance BTC/USDT candles', fallback: geckoError };
            } catch { /* Browser storage is optional. */ }
            const prices = [];
            let cursor = Date.parse('2017-08-17T00:00:00Z');
            const lastDay = Math.floor(Date.now() / core.DAY_MS) * core.DAY_MS - 1;
            for (let page = 0; page < 10 && cursor <= lastDay; page += 1) {
                const url = new URL('https://data-api.binance.vision/api/v3/klines');
                url.search = new URLSearchParams({ symbol: 'BTCUSDT', interval: '1d', startTime: String(cursor), endTime: String(lastDay), limit: '1000' });
                const response = await fetch(url);
                if (!response.ok) throw httpError(response, 'Binance public market data');
                const candles = await response.json();
                if (!Array.isArray(candles) || !candles.length) break;
                candles.forEach(candle => prices.push([Number(candle[0]), Number(candle[4])]));
                const next = Number(candles[candles.length - 1][0]) + core.DAY_MS;
                if (next <= cursor || candles.length < 1000) break;
                cursor = next;
            }
            if (!prices.length) throw new Error(`CoinGecko (${geckoError.message}) and Binance returned no usable BTC history.`);
            try { sessionStorage.setItem(storedKey, JSON.stringify({ savedAt: Date.now(), prices })); } catch { /* Use the in-memory response. */ }
            return { points: prices, provider: 'Binance BTC/USDT', fallback: geckoError };
        })();
        seriesCache.set('bitcoin', work);
        try { return await work; } catch (error) { seriesCache.delete('bitcoin'); throw error; }
    }

    function drawWindow(windowData) {
        const rect = canvas.getBoundingClientRect();
        const scale = window.devicePixelRatio || 1;
        const width = Math.max(320, rect.width);
        const height = 300;
        canvas.width = width * scale; canvas.height = height * scale; canvas.style.height = `${height}px`;
        const context = canvas.getContext('2d'); context.setTransform(scale, 0, 0, scale, 0, 0); context.clearRect(0, 0, width, height);
        const points = windowData.values;
        if (!points.length) return;
        let low = Math.min(0, ...points.map(point => point.returnPct));
        let high = Math.max(0, ...points.map(point => point.returnPct));
        if (low === high) { low -= 5; high += 5; }
        const pad = { left: 54, right: 15, top: 18, bottom: 40 };
        const x = day => pad.left + ((day + 30) / 60) * (width - pad.left - pad.right);
        const y = value => pad.top + ((high - value) / (high - low)) * (height - pad.top - pad.bottom);
        context.font = '12px Urbanist, sans-serif'; context.lineWidth = 1;
        for (let i = 0; i <= 4; i += 1) {
            const value = low + (high - low) * i / 4; const yy = y(value);
            context.strokeStyle = 'rgba(175,194,191,.18)'; context.beginPath(); context.moveTo(pad.left, yy); context.lineTo(width - pad.right, yy); context.stroke();
            context.fillStyle = '#afc2bf'; context.textAlign = 'right'; context.fillText(`${formatter.format(value)}%`, pad.left - 8, yy + 4);
        }
        context.strokeStyle = '#ffbd69'; context.setLineDash([4, 5]); context.beginPath(); context.moveTo(x(0), pad.top); context.lineTo(x(0), height - pad.bottom); context.stroke(); context.setLineDash([]);
        context.beginPath(); context.strokeStyle = '#70d6c5'; context.lineWidth = 2.5;
        points.forEach((point, index) => index ? context.lineTo(x(point.day), y(point.returnPct)) : context.moveTo(x(point.day), y(point.returnPct)));
        context.stroke();
        context.fillStyle = '#afc2bf'; context.textAlign = 'center';
        [-30, -15, 0, 15, 30].forEach(day => context.fillText(day === 0 ? 'Event' : `${day}d`, x(day), height - 12));
    }

    async function loadWindow(item) {
        activeEvent = item;
        heading.textContent = item.title;
        summary.textContent = 'Loading daily Bitcoin prices…';
        status.textContent = 'Loading BTC price history. The first request may take a little while…';
        document.querySelectorAll('.event-card button').forEach(button => { button.disabled = true; });
        try {
            const data = await getSeries();
            if (activeEvent !== item) return;
            const result = core.eventWindow(data.points, item.date);
            if (!result) throw new Error('There is no BTC data near this event date.');
            const change = `${result.returnPct >= 0 ? '+' : ''}${formatter.format(result.returnPct)}%`;
            summary.textContent = `${result.startDate} to ${result.endDate}: ${change} over the available window. ${result.eventReturnPct == null ? 'Event-date price unavailable.' : `At/after event date: ${result.eventReturnPct >= 0 ? '+' : ''}${formatter.format(result.eventReturnPct)}% versus the baseline.`}`;
            info.textContent = `${data.provider}. Window begins ${result.startDate} and ends ${result.endDate}; baseline is the first available daily close in the window. Binance fallback begins in August 2017 and uses USDT as a USD proxy. ${data.fallback ? `CoinGecko unavailable (${data.fallback.message}); used Binance.` : ''}`;
            status.textContent = `BTC price window loaded for ${item.date}.`;
            drawWindow(result);
        } catch (error) {
            if (activeEvent === item) { status.textContent = `Could not load the BTC price window. ${error.message}`; summary.textContent = 'Wait briefly if the provider is rate limiting requests, then select the event again.'; info.textContent = 'The page tried CoinGecko daily BTC/USD, then Binance BTC/USDT candles.'; }
        } finally {
            document.querySelectorAll('.event-card button').forEach(button => { button.disabled = false; });
        }
    }

    filter.addEventListener('change', showEvents);
    window.addEventListener('resize', () => { if (activeEvent) loadWindow(activeEvent); });
    showEvents();
})();
