# PayloadCMS Cloudflare KV Plugin

[![npm version](https://img.shields.io/npm/v/payloadcms-cloudflare-kv-plugin.svg)](https://www.npmjs.com/package/payloadcms-cloudflare-kv-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A transparent Cloudflare KV caching layer plugin for Payload CMS v3 that automatically caches database queries to improve performance using Cloudflare's globally distributed key-value store.

## Features

- **Automatic Query Caching** - Transparently caches all read operations (find, findOne, count, etc.)
- **Smart Invalidation** - Automatically invalidates cache on write operations (create, update, delete)
- **Flexible Configuration** - Enable caching per collection or globally with custom TTL
- **Per-Request Override** - Control cache behavior on individual requests
- **Custom Cache Keys** - Generate custom cache keys based on your needs
- **Pattern-Based Invalidation** - Invalidate related cache entries using KV prefix matching
- **Debug Mode** - Optional logging for cache hits, misses, and invalidations
- **Zero Breaking Changes** - Works seamlessly with existing Payload applications
- **Global Distribution** - Leverages Cloudflare's edge network for low-latency reads

## Installation

```bash
npm install payloadcms-cloudflare-kv-plugin
# or
yarn add payloadcms-cloudflare-kv-plugin
# or
pnpm add payloadcms-cloudflare-kv-plugin
```

## Requirements

- Payload CMS v3.37.0 or higher
- Node.js 18.20.2+ or 20.9.0+
- Cloudflare Workers KV namespace
- Cloudflare Workers environment (for production) or local development setup

## Quick Start

### Basic Setup

First, create a KV namespace in your Cloudflare dashboard or using Wrangler:

```bash
wrangler kv:namespace create "CACHE"
```

This will output a namespace ID. Add it to your `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-namespace-id"
```

Then configure the plugin in your Payload config:

```typescript
import { buildConfig } from 'payload'
import { cloudflareKVCache } from 'payloadcms-cloudflare-kv-plugin'

export default buildConfig({
  plugins: [
    cloudflareKVCache({
      // Pass the KV namespace from your Cloudflare Worker environment
      kv: env.CACHE, // or your KV namespace binding
      // Enable caching for specific collections
      collections: {
        posts: true,
        articles: true,
      },
    }),
  ],
  // ... rest of your config
})
```

### Using in Cloudflare Workers

When using in a Cloudflare Worker, pass the KV namespace from the environment:

```typescript
import { cloudflareKVCache } from 'payloadcms-cloudflare-kv-plugin'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const config = buildConfig({
      plugins: [
        cloudflareKVCache({
          kv: env.CACHE, // KV namespace from Worker environment
          collections: {
            posts: true,
          },
        }),
      ],
      // ... rest of config
    })
    
    // ... your handler
  }
}
```

## Configuration

### Plugin Options

```typescript
type CloudflareKVPluginConfig = {
  // Cloudflare KV Namespace binding (required)
  kv: KVNamespace

  // Collections to cache
  collections?: Partial<Record<CollectionSlug, CacheOptions | true>>

  // Globals to cache
  globals?: Partial<Record<GlobalSlug, CacheOptions | true>>

  // Enable debug logging
  debug?: boolean

  // Default cache behavior
  defaultCacheOptions?: {
    generateKey?: (operation: string, args: DBOperationArgs) => string
    keyPrefix?: string
    ttl?: number // in seconds, default: 300 (5 minutes)
  }
}
```

### Cache Options

```typescript
type CacheOptions = {
  key?: string // Custom cache key override
  skip?: boolean // Skip cache for this collection/query
  tags?: string[] // Tags for grouped invalidation (future feature)
  ttl?: number // Time-to-live in seconds
}
```

### Advanced Configuration

```typescript
cloudflareKVCache({
  kv: env.CACHE,

  // Configure collections with custom TTL
  collections: {
    posts: {
      ttl: 600, // Cache posts for 10 minutes
      skip: false,
    },
    articles: {
      ttl: 1800, // Cache articles for 30 minutes
    },
    users: true, // Use default TTL (5 minutes)
  },

  // Cache global configurations
  globals: {
    settings: true,
  },

  // Custom default options
  defaultCacheOptions: {
    keyPrefix: 'myapp',
    ttl: 300,
    generateKey: (operation, args) => {
      // Custom key generation logic
      const { slug, where, locale } = args
      return `${slug}:${operation}:${locale || 'default'}:${JSON.stringify(where)}`
    },
  },

  // Enable debug logging
  debug: true,
})
```

## Usage

### Per-Request Cache Control

Override cache behavior for individual requests:

```typescript
// Skip cache for a specific query
const freshPosts = await payload.find({
  collection: 'posts',
  req: {
    context: {
      cache: {
        skip: true, // Bypass cache, always hit database
      },
    },
  },
})

// Custom TTL for a specific query
const shortLivedPosts = await payload.find({
  collection: 'posts',
  req: {
    context: {
      cache: {
        ttl: 60, // Cache for 1 minute only
      },
    },
  },
})

// Custom cache key
const customCachedPosts = await payload.find({
  collection: 'posts',
  req: {
    context: {
      cache: {
        key: 'posts:featured',
      },
    },
  },
})
```

### Cached Operations

The following database operations are automatically cached:

**Read Operations** (cached before hitting database):

- `find` - Query collections with pagination
- `findOne` - Query single document by ID
- `findGlobal` - Query global configurations
- `findGlobalVersions` - Query global version history
- `count` - Count documents
- `countVersions` - Count document versions
- `countGlobalVersions` - Count global versions
- `queryDrafts` - Query draft documents

**Write Operations** (invalidate cache after database update):

- `create` - Create new document
- `createMany` - Batch create
- `updateOne` - Update single document
- `updateMany` - Batch update
- `deleteOne` - Delete single document
- `deleteMany` - Batch delete
- `upsert` - Create or update
- `updateGlobal` - Update global config
- `updateGlobalVersion` - Update global version
- `deleteVersions` - Delete document versions

## How It Works

### Cache Key Generation

By default, cache keys are generated using MD5 hashing:

```
[prefix]:[slug]:[operation]:[md5-hash]
```

The hash includes: `{ slug, locale, operation, where }`

Example keys:

```
posts:find:a1b2c3d4e5f6g7h8
myapp:articles:count:x9y8z7w6v5u4t3s2
```

### Cache Flow

**Read Operations:**

```
Request → Check cache config → Check skip flag
  ↓ (cache enabled)
  Check KV → HIT: Return cached → MISS: Hit DB → Store in KV → Return
  ↓ (cache disabled/skipped)
  Hit DB directly
```

**Write Operations:**

```
Request → Execute on DB → Get cache config → Check skip flag
  ↓ (cache enabled)
  Invalidate pattern → Return result
  ↓ (cache disabled/skipped)
  Return result directly
```

### Automatic Invalidation

When data changes, the plugin automatically invalidates related cache entries using prefix matching:

```typescript
// Creating a post invalidates all post queries
await payload.create({
  collection: 'posts',
  data: { title: 'New Post' },
})
// Invalidates: posts:*, myapp:*:posts:*, etc.

// Updating an article invalidates all article queries
await payload.update({
  collection: 'articles',
  id: '123',
  data: { title: 'Updated' },
})
// Invalidates: articles:*, myapp:*:articles:*, etc.
```

**Note:** Cloudflare KV uses prefix-based listing instead of pattern matching. The plugin converts patterns like `posts:*` to prefix queries and filters matching keys.

## Debug Mode

Enable debug logging to monitor cache behavior:

```typescript
cloudflareKVCache({
  kv: env.CACHE,
  collections: { posts: true },
  debug: true,
})
```

Console output:

```
[CloudflareKVPlugin] [find] [posts] Cache HIT
[CloudflareKVPlugin] [find] [articles] Cache MISS
[CloudflareKVPlugin] [create] [posts] Invalidating pattern: posts:*
[CloudflareKVPlugin] [update] [posts] Cache SKIP (per-request)
```

## TypeScript Support

The plugin includes full TypeScript definitions and extends Payload's `RequestContext` type:

```typescript
declare module 'payload' {
  export interface RequestContext {
    cache?: {
      key?: string
      skip?: boolean
      tags?: string[]
      ttl?: number
    }
  }
}
```

## Performance Considerations

- **Default TTL**: 5 minutes (300 seconds)
- **Prefix Matching**: Uses KV `list()` with prefix for invalidation (may be slower with large keyspaces)
- **Silent Failures**: Cache errors don't break database queries
- **Memory**: KV has a 25 MB value size limit per key
- **Expiration**: KV automatically removes expired keys
- **Eventual Consistency**: KV is eventually consistent - writes may take a few seconds to propagate globally
- **Read Performance**: KV is optimized for high-read, low-write workloads

## Cloudflare KV Limitations

- **Eventual Consistency**: KV is eventually consistent. Writes may take a few seconds to be visible globally
- **No Transactions**: KV doesn't support transactions or atomic operations
- **Value Size Limit**: Maximum 25 MB per value
- **List Performance**: Listing keys with prefixes can be slower with very large keyspaces
- **No Pattern Matching**: Uses prefix-based listing instead of Redis-style pattern matching

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Build plugin
pnpm build

# Lint code
pnpm lint
```

## Examples

### E-commerce Site

```typescript
cloudflareKVCache({
  kv: env.CACHE,
  collections: {
    products: { ttl: 3600 }, // Cache products for 1 hour
    categories: { ttl: 7200 }, // Cache categories for 2 hours
    orders: { skip: true }, // Never cache orders
    customers: { ttl: 600 }, // Cache customers for 10 minutes
  },
  globals: {
    siteSettings: { ttl: 86400 }, // Cache site settings for 24 hours
  },
})
```

### Blog Platform

```typescript
cloudflareKVCache({
  kv: env.CACHE,
  collections: {
    posts: { ttl: 1800 }, // Cache posts for 30 minutes
    authors: { ttl: 3600 }, // Cache authors for 1 hour
    comments: { ttl: 300 }, // Cache comments for 5 minutes
  },
  defaultCacheOptions: {
    keyPrefix: 'blog',
    ttl: 600,
  },
  debug: process.env.NODE_ENV === 'development',
})
```

## Troubleshooting

### KV Namespace Not Accessible

```typescript
// Verify KV namespace is properly bound
// In wrangler.toml:
[[kv_namespaces]]
binding = "CACHE"
id = "your-namespace-id"

// In your code:
cloudflareKVCache({
  kv: env.CACHE, // Make sure this matches the binding name
  // ...
})
```

### Cache Not Working

1. Enable debug mode to see cache behavior
2. Verify collection/global is configured for caching
3. Check if `skip: true` is set
4. Ensure KV namespace is properly bound and accessible
5. Check Cloudflare Workers logs for errors

### High Memory Usage

1. Reduce TTL values
2. Be selective about which collections to cache
3. Monitor KV usage in Cloudflare dashboard
4. Consider using KV max keys limits

### Eventual Consistency Issues

If you need immediate consistency:
- Use `skip: true` for critical queries
- Implement cache warming strategies
- Consider using Cloudflare Durable Objects for strongly consistent data

## Contributing

Contributions are welcome! Please see the [GitHub repository](https://github.com/thejemish/payloadcms-cloudflare-kv-plugin) for issues and pull requests.

> **Note:** This repository was originally created for a Redis plugin but has been converted to use Cloudflare KV. The repository name may be updated in the future.

## License

MIT

## Links

- [GitHub Repository](https://github.com/thejemish/payloadcms-cloudflare-kv-plugin)
- [NPM Package](https://www.npmjs.com/package/payloadcms-cloudflare-kv-plugin)
- [Payload CMS Documentation](https://payloadcms.com/docs)
- [Cloudflare KV Documentation](https://developers.cloudflare.com/kv/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
