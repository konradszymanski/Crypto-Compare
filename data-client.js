(() => {
    const inFlight = new Map();
    const cooldowns = new Map();
    const DEFAULT_TIMEOUT_MS = 15000;
    const DEFAULT_RETRY_MS = 60000;
    const CACHE_PREFIX = 'crypto-compare-provider-cache-v1:';
    const memoryCache = new Map();
    class ProviderError extends Error {
        constructor(message, { provider, status, retryAfterMs, cause } = {}) {
            super(message, cause ? { cause } : undefined);
            this.name = 'ProviderError';
            this.provider = provider || 'Data provider';
            if (Number.isFinite(status)) this.status = status;
            if (Number.isFinite(retryAfterMs)) this.retryAfterMs = retryAfterMs;
        }
    }
    function retryDelay(response) {
        const value = response.headers.get('Retry-After');
        if (!value) return DEFAULT_RETRY_MS;
        const seconds = Number(value);
        if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
        const timestamp = Date.parse(value);
        return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : DEFAULT_RETRY_MS;
    }
    async function requestJson(url, { provider = 'Data provider', timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
        const key = String(url);
        if (inFlight.has(key)) return inFlight.get(key);
        const origin = new URL(key, window.location.href).origin;
        const retryAt = cooldowns.get(origin) || 0;
        if (retryAt > Date.now()) throw new ProviderError(`${provider} is cooling down after a rate limit.`, { provider, status: 429, retryAfterMs: retryAt - Date.now() });
        const pending = (async () => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const response = await fetch(key, { signal: controller.signal });
                if (!response.ok) {
                    const retryAfterMs = response.status === 429 ? retryDelay(response) : undefined;
                    if (retryAfterMs !== undefined) cooldowns.set(origin, Date.now() + retryAfterMs);
                    throw new ProviderError(`${provider} request failed (HTTP ${response.status}).`, { provider, status: response.status, retryAfterMs });
                }
                try { return await response.json(); }
                catch (cause) { throw new ProviderError(`${provider} returned invalid JSON.`, { provider, cause }); }
            } catch (error) {
                if (error instanceof ProviderError) throw error;
                const message = error?.name === 'AbortError' ? `${provider} request timed out after ${Math.ceil(timeoutMs / 1000)} seconds.` : `${provider} could not be reached.`;
                throw new ProviderError(message, { provider, cause: error });
            } finally { clearTimeout(timeout); }
        })();
        inFlight.set(key, pending);
        try { return await pending; }
        finally { if (inFlight.get(key) === pending) inFlight.delete(key); }
    }
    function readCache(key) {
        try {
            const raw = window.sessionStorage?.getItem(key);
            if (raw) {
                const entry = JSON.parse(raw);
                if (entry && Number.isFinite(entry.savedAt) && Object.hasOwn(entry, 'data')) return entry;
            }
        } catch { /* Storage may be disabled. */ }
        return memoryCache.get(key) || null;
    }

    async function requestJsonWithMetadata(url, {
        provider = 'Data provider', timeoutMs = DEFAULT_TIMEOUT_MS,
        cacheTtlMs = 0, cacheKey = String(url), forceRefresh = false, allowStaleOnError = false
    } = {}) {
        const storageKey = CACHE_PREFIX + cacheKey;
        const cached = cacheTtlMs > 0 ? readCache(storageKey) : null;
        if (!forceRefresh && cached && Date.now() - cached.savedAt < cacheTtlMs) {
            return { data: cached.data, source: 'session-cache', cachedAt: cached.savedAt };
        }
        try {
            const data = await requestJson(url, { provider, timeoutMs });
            const cachedAt = Date.now();
            if (cacheTtlMs > 0) {
                const entry = { data, savedAt: cachedAt };
                memoryCache.set(storageKey, entry);
                try { window.sessionStorage?.setItem(storageKey, JSON.stringify(entry)); } catch { /* Keep the in-memory copy. */ }
            }
            return { data, source: 'network', cachedAt };
        } catch (error) {
            if (allowStaleOnError && cached) return { data: cached.data, source: 'session-cache-stale', cachedAt: cached.savedAt, error };
            throw error;
        }
    }

    window.CryptoCompareData = Object.freeze({ requestJson, requestJsonWithMetadata, ProviderError });
})();
