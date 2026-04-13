/**
 * In-memory rate limiter for API requests
 * Uses a sliding window approach with per-key limits
 *
 * Note: In production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

// In-memory store (cleared on server restart)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Window duration in milliseconds (1 hour)
const WINDOW_MS = 60 * 60 * 1000

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when limit resets
}

/**
 * Check and update rate limit for an API key
 */
export function checkRateLimit(apiKeyId: string, limit: number): RateLimitResult {
  const now = Date.now()
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS
  const reset = Math.ceil((windowStart + WINDOW_MS) / 1000) // Unix timestamp

  const key = `${apiKeyId}:${windowStart}`
  const entry = rateLimitStore.get(key)

  if (!entry) {
    // First request in this window
    rateLimitStore.set(key, { count: 1, windowStart })
    cleanupOldEntries(windowStart)

    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      reset,
    }
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset,
    }
  }

  // Increment counter
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    limit,
    remaining: limit - entry.count,
    reset,
  }
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(apiKeyId: string, limit: number): RateLimitResult {
  const now = Date.now()
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS
  const reset = Math.ceil((windowStart + WINDOW_MS) / 1000)

  const key = `${apiKeyId}:${windowStart}`
  const entry = rateLimitStore.get(key)

  const count = entry?.count || 0

  return {
    allowed: count < limit,
    limit,
    remaining: Math.max(0, limit - count),
    reset,
  }
}

/**
 * Clean up entries from previous windows to prevent memory leaks
 */
function cleanupOldEntries(currentWindowStart: number): void {
  const keysToDelete: string[] = []

  rateLimitStore.forEach((entry, key) => {
    if (entry.windowStart < currentWindowStart) {
      keysToDelete.push(key)
    }
  })

  keysToDelete.forEach(key => {
    rateLimitStore.delete(key)
  })
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  }
}

/**
 * Create rate limit exceeded error response
 */
export function createRateLimitError(result: RateLimitResult): {
  error: {
    code: string
    message: string
    details: {
      limit: number
      remaining: number
      reset: number
      retry_after: number
    }
  }
} {
  const retryAfter = result.reset - Math.floor(Date.now() / 1000)

  return {
    error: {
      code: 'rate_limit_exceeded',
      message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      details: {
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        retry_after: retryAfter,
      },
    },
  }
}
