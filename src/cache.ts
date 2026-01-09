import type {
  CacheOptions,
  CloudflareKVPluginConfig,
  DBOperationArgs,
  KVNamespace,
} from './types.js'

import { DEFAULT_TTL } from './utils.js'

export function getCacheOptions({
  slug,
  args,
  config,
}: {
  args: DBOperationArgs
  config: CloudflareKVPluginConfig
  slug: string
}): CacheOptions | undefined {
  if (args.req?.context?.cache) {
    return args.req.context.cache
  }
  for (const [key, value] of Object.entries(config.collections ?? {})) {
    if (key === slug) {
      if (typeof value === 'boolean') {
        return { ttl: config.defaultCacheOptions?.ttl ?? DEFAULT_TTL }
      }
      return value
    }
  }
  for (const [key, value] of Object.entries(config.globals ?? {})) {
    if (key === slug) {
      if (typeof value === 'boolean') {
        return { ttl: config.defaultCacheOptions?.ttl ?? DEFAULT_TTL }
      }
      return value
    }
  }

  return undefined
}

export async function getFromCache<T>({
  key,
  kv,
}: {
  key: string
  kv: KVNamespace
}): Promise<null | T> {
  try {
    const cached = await kv.get(key, { type: 'text' })
    if (cached) {
      try {
        return JSON.parse(cached) as T
      } catch (parseErr) {
        console.error('[CloudflareKVPlugin] Error parsing cached value for key:', key, parseErr)
        // If JSON parsing fails, delete the corrupted cache entry
        await kv.delete(key).catch(() => {
          // Ignore delete errors
        })
        return null
      }
    }
    return null
  } catch (err) {
    console.error('[CloudflareKVPlugin] Error reading from cache for key:', key, err)
    return null
  }
}

export async function setInCache<T>({
  data,
  key,
  kv,
  ttl,
}: {
  data: T
  key: string
  kv: KVNamespace
  ttl: number
}): Promise<void> {
  try {
    await kv.put(key, JSON.stringify(data), { expirationTtl: ttl })
  } catch (err) {
    console.error('[CloudflareKVPlugin] Error writing to cache: ', err)
  }
}

/**
 * Invalidates cache entries matching a pattern
 * Since KV doesn't support pattern matching like Redis, we use list() with prefix
 * and filter keys that match the pattern
 *
 * Note: This operation can be slow for large namespaces as it requires listing
 * all keys with the matching prefix. Consider using more specific prefixes
 * or implementing a tag-based invalidation strategy for better performance.
 */
export async function invalidateByPattern({
  kv,
  pattern,
}: {
  kv: KVNamespace
  pattern: string
}): Promise<void> {
  try {
    // Convert Redis-style pattern (e.g., "posts:*") to KV prefix
    // Patterns like "prefix:posts:*" become prefix "prefix:posts:"
    const prefixMatch = pattern.match(/^(.+?):\*$/)
    let prefix: string | undefined

    if (prefixMatch) {
      prefix = prefixMatch[1] + ':'
    } else if (pattern.endsWith('*')) {
      // Handle patterns like "prefix*" (without colon)
      prefix = pattern.replace(/\*$/, '')
    } else {
      // No wildcard, treat as exact prefix match
      prefix = pattern
    }

    // List all keys with the prefix (handles pagination)
    const allKeys: string[] = []
    let cursor: string | undefined
    let complete = false

    while (!complete) {
      const result = await kv.list({ cursor, limit: 1000, prefix })
      allKeys.push(...result.keys.map((k) => k.name))
      complete = result.list_complete
      if (!result.list_complete) {
        cursor = result.cursor
      } else {
        cursor = undefined
      }
    }

    // If pattern has wildcard, filter keys that match the full pattern
    // Otherwise, all keys with the prefix match
    const patternRegex = pattern.includes('*')
      ? new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      : null

    const keysToDelete = patternRegex ? allKeys.filter((key) => patternRegex.test(key)) : allKeys

    // Delete all matching keys in parallel (with error handling)
    if (keysToDelete.length > 0) {
      await Promise.allSettled(keysToDelete.map((key) => kv.delete(key)))
    }
  } catch (err) {
    console.error('[CloudflareKVPlugin] Error invalidating cache for pattern:', pattern, err)
  }
}
