/**
 * AnalyticsCache
 * In-memory TTL caching helper for GA4 Data API responses.
 * Prevents redundant calls to Google APIs while serving fresh analytics data to admins.
 */

class AnalyticsCache {
    constructor() {
        this.cache = new Map();
    }

    /**
     * Get cached item if valid (not expired)
     * @param {string} key 
     * @returns {any|null}
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }

    /**
     * Set cache entry with TTL in seconds
     * @param {string} key 
     * @param {any} data 
     * @param {number} ttlSeconds 
     */
    set(key, data, ttlSeconds = 300) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + (ttlSeconds * 1000)
        });
    }

    /**
     * Invalidate all cached analytics data
     */
    invalidateAll() {
        this.cache.clear();
    }
}

module.exports = new AnalyticsCache();
