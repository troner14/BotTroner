
interface CacheEntry<T> {
    data: T;
    expiry: number;
}

export class VirtualizationCache {
    private cache: Map<string, CacheEntry<any>> = new Map();

    /**
     * Gets a value from the cache
     * @param key The cache key
     * @returns The cached value or null if not found or expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Sets a value in the cache
     * @param key The cache key
     * @param data The data to cache
     * @param ttlSeconds Time to live in seconds
     */
    set<T>(key: string, data: T, ttlSeconds: number): void {
        this.cache.set(key, {
            data,
            expiry: Date.now() + (ttlSeconds * 1000)
        });
    }

    /**
     * Removes a specific key
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clears all cached data
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Deletes all keys starting with a prefix
     */
    invalidatePrefix(prefix: string): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
}
