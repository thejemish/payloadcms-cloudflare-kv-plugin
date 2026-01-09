import type {
  CollectionSlug,
  CountArgs,
  CountGlobalVersionArgs,
  FindArgs,
  FindGlobalArgs,
  FindOneArgs,
  GlobalSlug,
  QueryDraftsArgs,
} from 'payload'

export type DBOperationArgs =
  | CountArgs
  | CountGlobalVersionArgs
  | FindArgs
  | FindGlobalArgs
  | FindOneArgs
  | QueryDraftsArgs

export interface CollectionCacheOptions extends CacheOptions {
  versions?: boolean
}

/**
 * Cloudflare KV Namespace interface
 * This matches the KVNamespace type from @cloudflare/workers-types
 * Reference: https://developers.cloudflare.com/workers/runtime-apis/kv/
 */
export interface KVNamespace {
  /**
   * Deletes a key-value pair from the KV namespace
   * @param key The key to delete
   */
  delete(key: string): Promise<void>

  /**
   * Retrieves a value from the KV namespace
   * @param key The key to retrieve
   * @param options Optional type specification for the return value
   * @returns The value as a string (or parsed based on type), or null if not found
   */
  get(
    key: string,
    options?: { type?: 'arrayBuffer' | 'json' | 'stream' | 'text' },
  ): Promise<null | string>

  /**
   * Lists keys in the KV namespace
   * @param options Optional parameters for listing (prefix, limit, cursor)
   * @returns A promise resolving to an object containing keys and pagination info
   */
  list(options?: { cursor?: string; limit?: number; prefix?: string }): Promise<{
    complete: boolean
    cursor?: string
    keys: Array<{ expiration?: number; metadata?: unknown; name: string }>
  }>

  /**
   * Stores a value in the KV namespace
   * @param key The key to store
   * @param value The value to store (must be a string)
   * @param options Optional expiration settings
   * @param options.expirationTtl Time to live in seconds from now
   * @param options.expiration Unix timestamp (in seconds) when the key should expire
   */
  put(
    key: string,
    value: string,
    options?: { expiration?: number; expirationTtl?: number },
  ): Promise<void>
}

export type CloudflareKVPluginConfig = {
  /**
   * List of collections to add KV caching
   */
  collections?: Partial<Record<CollectionSlug, CollectionCacheOptions | true>>
  debug?: boolean
  defaultCacheOptions?: {
    generateKey?: ({
      args,
      operation,
      versions,
    }: {
      args: DBOperationArgs
      operation: string
      versions: boolean
    }) => string
    keyPrefix?: string
    ttl?: number
    versions?: boolean
  }
  globals?: Partial<Record<GlobalSlug, CollectionCacheOptions | true>>
  /**
   * Cloudflare KV Namespace binding
   * This should be the KV namespace instance from your Cloudflare Worker environment
   */
  kv: KVNamespace
}

export interface CacheOptions {
  /** Custom cache key (overrides auto-generated key) */
  key?: string

  /** Skip cache for this query and always hit the database */
  skip?: boolean

  /** Cache tags for grouped invalidation */
  tags?: string[]

  /** Custom TTL (time to live) in seconds for this query */
  ttl?: number
}

declare module 'payload' {
  export interface RequestContext {
    cache?: CacheOptions
  }
}
