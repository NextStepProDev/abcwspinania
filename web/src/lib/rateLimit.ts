/**
 * A token bucket per key — the arithmetic of `lib/actionLimit.ts`, with no
 * Next or Payload import so `node --test` can run it.
 *
 * Each key starts with `capacity` tokens and gets `perMinute` back every
 * minute, never above `capacity`. A request spends one; with none left it is
 * refused. The same shape as nginx's `limit_req … burst=… nodelay`.
 */

export interface Bucket {
  tokens: number
  /** When `tokens` was last brought up to date, in ms. */
  at: number
}

export interface BucketLimit {
  capacity: number
  perMinute: number
}

/** Above this many keys, buckets that have refilled completely are dropped. */
const PRUNE_ABOVE = 5000

/**
 * Tokens earned since `at`. Never negative: a clock stepped back (NTP) would
 * otherwise read as minus hundreds of tokens and lock an address out for as
 * long as the clock went back.
 */
function refill(limit: BucketLimit, at: number, now: number): number {
  return (Math.max(0, now - at) / 60_000) * limit.perMinute
}

/** Spends one token of `key`'s bucket; false when there is none left. */
export function takeToken(
  buckets: Map<string, Bucket>,
  key: string,
  limit: BucketLimit,
  now: number,
): boolean {
  if (buckets.size > PRUNE_ABOVE) prune(buckets, limit, now)
  const bucket = buckets.get(key)
  const tokens = bucket
    ? Math.min(limit.capacity, bucket.tokens + refill(limit, bucket.at, now))
    : limit.capacity
  if (tokens < 1) {
    buckets.set(key, { tokens, at: now })
    return false
  }
  buckets.set(key, { tokens: tokens - 1, at: now })
  return true
}

/** A full bucket says nothing a missing one would not — memory stays bounded. */
function prune(buckets: Map<string, Bucket>, limit: BucketLimit, now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.tokens + refill(limit, bucket.at, now) >= limit.capacity) {
      buckets.delete(key)
    }
  }
}
