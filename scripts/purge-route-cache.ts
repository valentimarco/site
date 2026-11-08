/**
 * Deletes the Nitro route-rule HTML cache entries (`nitro:routes:*`) from the remote CACHE KV
 * namespace. Route-rule caches persist in KV across deploys — the key is request-based, not
 * build-based — so right after `wrangler deploy` a cached `/` or `/blog` page can keep serving
 * the previous build's HTML (old chunk hashes, old content) until its `maxAge` elapses. Run this
 * right after deploying to make new content and chunk hashes visible immediately.
 *
 * Writes are eventually consistent: an edge may still briefly serve a deleted entry, so expect
 * fresh content within seconds, not on the very first request.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const configText = readFileSync(join(import.meta.dir, '../wrangler.jsonc'), 'utf8')
// Targeted extraction instead of a full JSONC parse: wrangler.jsonc is simple, but a trailing
// comma or comment stripper is more brittle than this keyed lookup.
const match = configText.match(/"binding"\s*:\s*"CACHE"[\s\S]*?"id"\s*:\s*"([a-f0-9]{32})"/)
if (!match) {
  console.error('[cf-purge] could not find the CACHE KV namespace id in wrangler.jsonc')
  process.exit(1)
}
const namespaceId = match[1]

function wrangler(args: string[]) {
  return spawnSync('bunx', ['wrangler', ...args], { encoding: 'utf8' })
}

const list = wrangler(['kv', 'key', 'list', '--namespace-id', namespaceId, '--remote', '--prefix', 'nitro:routes:'])
if (list.status !== 0) {
  console.error(`[cf-purge] failed to list KV keys: ${list.stderr.trim()}`)
  process.exit(list.status || 1)
}

const keys = (JSON.parse(list.stdout) as { name: string }[]).map(k => k.name)
if (keys.length === 0) {
  console.log('[cf-purge] no route cache entries to purge')
  process.exit(0)
}

process.stderr.write(`[cf-purge] purging ${keys.length} route cache entries\n`)
for (const key of keys) {
  const del = wrangler(['kv', 'key', 'delete', key, '--namespace-id', namespaceId, '--remote'])
  if (del.status !== 0) {
    console.error(`[cf-purge] failed to delete "${key}": ${del.stderr.trim()}`)
    process.exit(del.status || 1)
  }
}
console.log(`[cf-purge] purged ${keys.length} route cache entries from CACHE`)
