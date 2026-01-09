import type { Config } from 'payload'

import type { CloudflareKVPluginConfig } from './types.js'

import { dbAdapterWithCache } from './adapter.js'

export const cloudflareKVCache =
	(pluginConfig: CloudflareKVPluginConfig) =>
		(config: Config): Config => {
			const incomingOnInit = config.onInit

			config.onInit = async (payload) => {
				// Ensure we are executing any existing onInit functions before running our own.
				if (incomingOnInit) {
					await incomingOnInit(payload)
				}

				if (!pluginConfig.kv) {
					throw new Error('[CloudflareKVPlugin] KV namespace must be provided')
				}

				// Verify KV namespace is accessible by attempting to list (with limit 1)
				try {
					await pluginConfig.kv.list({ limit: 1 })
				} catch (err) {
					console.error('[CloudflareKVPlugin] Failed to access KV namespace', err)
					throw err
				}

				const baseAdapter = payload.db

				if (!baseAdapter) {
					throw new Error('[CloudflareKVPlugin] No database adapter found')
				}

				payload.db = dbAdapterWithCache({ baseAdapter, config: pluginConfig, kv: pluginConfig.kv })
			}

			return config
		}
