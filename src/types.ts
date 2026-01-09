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
 * This is a minimal interface that matches the essential methods needed by the plugin.
 * It's compatible with the actual Cloudflare Workers KVNamespace type which uses
 * `list_complete` instead of `complete` in the list() return type.
 *
 * The plugin accepts any object that implements these methods, including the actual
 * Cloudflare Workers KVNamespace type.
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
   *
   * Note: The actual Cloudflare Workers type returns `list_complete` instead of `complete`.
   * This interface uses `list_complete` to match the actual Cloudflare Workers API.
   */
  list(options?: { cursor?: null | string; limit?: number; prefix?: null | string }): Promise<
    | {
        cacheStatus: null | string
        cursor: string
        keys: Array<{ expiration?: number; metadata?: unknown; name: string }>
        list_complete: false
      }
    | {
        cacheStatus: null | string
        keys: Array<{ expiration?: number; metadata?: unknown; name: string }>
        list_complete: true
      }
  >

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
    options?: { expiration?: number; expirationTtl?: number; metadata?: unknown },
  ): Promise<void>
}

/**
 * Type that accepts any KVNamespace-like object compatible with Cloudflare Workers
 * This allows the plugin to work with the actual Cloudflare KVNamespace type
 * which may have additional overloads and generic parameters.
 *
 * This type matches the structure of Cloudflare Workers KVNamespace interface
 * from @cloudflare/workers-types, ensuring full compatibility.
 */
export type CompatibleKVNamespace = {
  /**
   * Deletes a key-value pair from the KV namespace
   */
  delete(key: string): Promise<void>

  /**
   * Retrieves a value from the KV namespace
   * Supports multiple overloads to match Cloudflare Workers API
   */
  get(
    key: string,
    options?: { cacheTtl?: number; type: 'arrayBuffer' },
  ): Promise<ArrayBuffer | null>
  get(key: string, options?: { cacheTtl?: number; type: 'stream' }): Promise<null | ReadableStream>
  get(key: string, options?: { cacheTtl?: number; type: 'text' }): Promise<null | string>
  get(
    key: string,
    options?: Partial<{ cacheTtl?: number; type?: 'arrayBuffer' | 'json' | 'stream' | 'text' }>,
  ): Promise<null | string>
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>
  get(key: string, type: 'stream'): Promise<null | ReadableStream>
  get(key: string, type: 'text'): Promise<null | string>
  get<ExpectedValue = unknown>(
    key: string,
    options?: { cacheTtl?: number; type: 'json' },
  ): Promise<ExpectedValue | null>
  get<ExpectedValue = unknown>(key: string, type: 'json'): Promise<ExpectedValue | null>

  /**
   * Lists keys in the KV namespace
   * Matches KVNamespaceListResult structure from Cloudflare Workers
   */
  list<Metadata = unknown>(options?: {
    cursor?: null | string
    limit?: number
    prefix?: null | string
  }): Promise<
    | {
        cacheStatus: null | string
        cursor: string
        keys: Array<{ expiration?: number; metadata?: Metadata; name: string }>
        list_complete: false
      }
    | {
        cacheStatus: null | string
        keys: Array<{ expiration?: number; metadata?: Metadata; name: string }>
        list_complete: true
      }
  >

  /**
   * Stores a value in the KV namespace
   * Matches KVNamespacePutOptions from Cloudflare Workers
   * Note: metadata type matches Cloudflare's `any | null` for compatibility
   */

  put(
    key: string,
    value: ArrayBuffer | ArrayBufferView | ReadableStream | string,
    options?: { expiration?: number; expirationTtl?: number; metadata?: any | null },
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
   * This should be the KV namespace instance from your Cloudflare Worker environment.
   *
   * Accepts the actual Cloudflare Workers KVNamespace type (e.g., KVNamespace<string>)
   * or any object that implements the required KVNamespace methods.
   *
   * The type is intentionally flexible to accept both the plugin's KVNamespace interface
   * and the actual Cloudflare Workers KVNamespace type which may have additional overloads.
   */
  kv: CompatibleKVNamespace
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
