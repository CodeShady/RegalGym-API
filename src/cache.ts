type CacheEntry = {
  expires: number;
  data: unknown;
};

const cache = new Map<string, CacheEntry>();

const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setCached(key: string, data: unknown) {
  cache.set(key, {
    expires: Date.now() + CACHE_TIME,
    data,
  });
}