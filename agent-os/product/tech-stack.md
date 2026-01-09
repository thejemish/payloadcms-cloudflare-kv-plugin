# Tech Stack

## Core Framework
- **Payload CMS**: 3.37.0 - Core CMS framework that the plugin integrates with

## Language & Compilation
- **TypeScript** - Primary development language for type safety
- **SWC** - Fast TypeScript/JavaScript transpiler for build process

## Cloudflare KV Integration
- **Cloudflare Workers KV** - Globally distributed key-value store for edge caching
- **@cloudflare/workers-types** - TypeScript definitions for Cloudflare Workers APIs

## Testing
- **Vitest** - Unit testing framework for testing cache logic, key generation, and adapter wrapping
- **Playwright** - End-to-end testing for integration testing with actual Payload CMS instances

## Development Environment
- **Next.js**: 15.4.4 - Used for development and testing environment (not required for plugin consumers)

## Code Quality
- **ESLint** - Code linting and style enforcement
- **Prettier** - Code formatting with `.prettierrc.json` configuration

## Build & Distribution
- **npm** - Package distribution platform
- **TypeScript Compiler** - Type definition generation for npm package

## Runtime Requirements (for plugin consumers)
- **Node.js** - Runtime environment
- **Cloudflare Workers KV Namespace** - KV namespace accessible via Worker environment bindings
- **Cloudflare Workers Environment** - For production deployment (or local development setup)
- **Payload CMS 3.x** - Compatible Payload CMS installation
- **Any Payload Database Adapter** - PostgreSQL, MongoDB, or other supported adapters

## Configuration
- **Environment Variables**:
  - KV namespace binding from Cloudflare Worker environment (required)
- **Plugin Configuration**: TypeScript-based configuration passed to Payload plugin system
- **Wrangler Configuration**: KV namespace binding in `wrangler.toml` for Cloudflare Workers

## Architecture Patterns
- **Adapter Pattern** - Wraps Payload database adapters transparently
- **Decorator Pattern** - Adds caching behavior without modifying underlying adapter
- **Hook System** - Leverages Payload's lifecycle hooks for cache invalidation
- **Edge Computing** - Leverages Cloudflare's global edge network for low-latency cache access