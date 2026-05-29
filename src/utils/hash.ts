// ============================================================
// ThesisForge Utils — DJB2 Hash (Engine v3)
// Fast, zero-dependency hash for cache invalidation.
// Produces a short base-36 string — perfect for Map keys.
// ============================================================

/**
 * Compute a DJB2 hash of the input string.
 * Returns a base-36 string suitable for use as a Map key.
 *
 * @example
 * hash('chapter-1-introduction') // => '3kf8a2m'
 * hash('chapter-1-introduction') // => '3kf8a2m' (deterministic)
 */
export function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

/**
 * Combine multiple values into a single hash.
 * Useful for hashing composite keys (id + title + body).
 */
export function hashCombined(...values: string[]): string {
  return hash(values.join('\x00'));
}
