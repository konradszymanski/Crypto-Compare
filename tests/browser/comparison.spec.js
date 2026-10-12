const { test, expect } = require('@playwright/test');

const bitcoin = {
    id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', image: 'https://example.test/bitcoin.png',
    market_cap_rank: 1, current_price: 65000, market_cap: 1_280_000_000_000,
    total_volume: 25_000_000_000, circulating_supply: 19_700_000, total_supply: 21_000_000,
    max_supply: 21_000_000, ath: 73700, ath_change_percentage: -11.8,
    ath_date: '2024-03-14T00:00:00.000Z', atl: 67.81, atl_change_percentage: 95800,
    atl_date: '2013-07-06T00:00:00.000Z', last_updated: '2026-10-11T12:00:00.000Z'
};

const rankedCoins = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'btc', market_cap_rank: 1 },
    { id: 'wrapped-bitcoin', name: 'Wrapped Bitcoin', symbol: 'wbtc', market_cap_rank: 15 },
    { id: 'cardano', name: 'Cardano', symbol: 'ada', market_cap_rank: 12 }
];

async function mockCoinGecko(page, { searchStatus = 200, marketStatus = 200 } = {}) {
    await page.route('https://api.coingecko.com/api/v3/coins/markets**', async route => {
        const url = new URL(route.request().url());
        if (url.searchParams.has('order')) {
            if (searchStatus !== 200) {
                await route.fulfill({ status: searchStatus, headers: { 'Retry-After': '2' }, body: 'rate limited' });
                return;
            }
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(url.searchParams.get('page') === '1' ? rankedCoins : [])
            });
            return;
        }

        if (marketStatus !== 200) {
            await route.fulfill({ status: marketStatus, headers: { 'Retry-After': '2' }, body: 'rate limited' });
            return;
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([bitcoin]) });
    });
    await page.route('https://raw.githubusercontent.com/**', route => route.abort());
    await page.route('https://fonts.googleapis.com/**', route => route.abort());
    await page.route('https://fonts.gstatic.com/**', route => route.abort());
}

test.beforeEach(async ({ page }) => {
    await mockCoinGecko(page);
});

test('search is labelled, keyboard-selectable, and prevents duplicates', async ({ page }) => {
    await page.goto('/');
    const search = page.getByRole('combobox', { name: 'Search for a cryptocurrency' });
    const results = page.getByRole('listbox', { name: 'Cryptocurrency search results' });
    await expect(page.locator('#status')).toHaveAttribute('aria-live', 'polite');
    await expect(search).toBeVisible();

    await search.fill('btc');
    const bitcoinOption = page.getByRole('option', { name: 'Bitcoin #1 · bitcoin' });
    await expect(bitcoinOption).toBeVisible();
    await expect(page.locator('#search-feedback')).toHaveText(/\\d+ coins? found for btc/);
    await search.press('ArrowDown');
    await expect(search).toHaveAttribute('aria-activedescendant', 'coin-option-bitcoin');
    await expect(page.locator('#search-feedback')).toHaveText(/Bitcoin, 1 of/);
    await search.press('Enter');

    await expect(page.locator('#status')).toHaveText('Bitcoin added to comparison.');
    await expect(page.getByText('1 coin', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh all selected coins' })).toBeEnabled();

    await search.fill('btc');
    const alreadyAdded = page.getByRole('option', { name: 'Bitcoin, already in comparison' });
    await expect(alreadyAdded).toBeDisabled();
    await expect(page.locator('#coin-count')).toHaveText('1 coin');

    await page.getByRole('button', { name: 'Remove Bitcoin from comparison' }).click();
    await expect(page.locator('#coin-count')).toHaveText('0 coins');
    await expect(page.locator('#status')).toHaveText('Bitcoin removed from comparison.');
});

test('uses the popular fallback when ranked search is rate limited', async ({ page }) => {
    await mockCoinGecko(page, { searchStatus: 429 });
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search for a cryptocurrency' }).fill('ada');

    await expect(page.getByRole('option', { name: /Cardano/ })).toBeVisible();
    await expect(page.locator('#search-feedback')).toHaveText(/\\d+ coins? found for ada/);
    await expect(page.locator('#status')).toContainText('rate limited');
    await expect(page.locator('#status')).toContainText('popular coins only');
});

test('reports market-data rate limits and offers a retry action', async ({ page }) => {
    await mockCoinGecko(page, { marketStatus: 429 });
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search for a cryptocurrency' }).fill('btc');
    await page.getByRole('option', { name: 'Bitcoin #1 · bitcoin' }).click();

    await expect(page.locator('#status')).toContainText('HTTP 429');
    await expect(page.locator('#status')).toContainText('Try again in about');
    await expect(page.getByRole('button', { name: 'Retry loading coin' })).toBeVisible();
    await expect(page.locator('#coin-count')).toHaveText('0 coins');
});

test('shows the comparison as a table on desktop and cards on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await page.getByRole('combobox', { name: 'Search for a cryptocurrency' }).fill('btc');
    await page.getByRole('option', { name: 'Bitcoin #1 · bitcoin' }).click();
    await expect(page.locator('#table-wrap')).toBeVisible();
    await expect(page.locator('#coin-cards')).toBeHidden();
    await expect(page.getByRole('table', { name: /Cryptocurrency market data comparison in USD/ })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#table-wrap')).toBeHidden();
    await expect(page.locator('#coin-cards')).toBeVisible();
    await expect(page.getByRole('article').getByRole('heading', { name: 'Bitcoin' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove Bitcoin from comparison' })).toBeVisible();
});

