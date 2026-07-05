// A tiny in-memory cache for rendered markdown. It is bounded two ways: by entry
// count (LRU eviction) so memory can't grow without limit, and by TTL so pages
// nobody revisits eventually release their memory. Keys are content-derived
// hashes, so an edited file lands on a fresh key rather than serving stale HTML.

type Entry<V> = {
  value: V;
  // Absolute expiry timestamp in ms, or 0 when TTL is disabled.
  expires: number;
};

export type LruCacheOptions = {
  maxEntries: number;
  ttlMs: number;
};

export class LruCache<K, V> {
  // Map preserves insertion order, which we lean on for LRU: the first key is the
  // least-recently-used, and re-inserting on access moves an entry to the newest.
  private readonly entries = new Map<K, Entry<V>>();

  constructor(private readonly options: LruCacheOptions) {}

  get(key: K): V | undefined {
    const hit = this.entries.get(key);
    if (!hit) return undefined;

    if (hit.expires !== 0 && hit.expires <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    // Mark as most-recently-used by reinserting at the end of the map.
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit.value;
  }

  set(key: K, value: V): void {
    if (this.entries.has(key)) this.entries.delete(key);

    const expires = this.options.ttlMs > 0 ? Date.now() + this.options.ttlMs : 0;
    this.entries.set(key, { value, expires });

    while (this.entries.size > this.options.maxEntries) {
      const oldest = this.entries.keys().next().value as K;
      this.entries.delete(oldest);
    }
  }
}

// Non-cryptographic 64-bit hash of some text, rendered as hex. Fast enough to run
// on every request; collision odds are irrelevant for a local render cache and a
// weak ETag. The value is stable across processes for identical input.
export function hashText(text: string): string {
  return Bun.hash(text).toString(16);
}
