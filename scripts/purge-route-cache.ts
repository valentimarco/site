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
// comma or comment stripper is more brittle than this keyed lookup. Requires the CACHE namespace
// object to be written as `{ "binding": "CACHE", "id": "..." }` so a follow-up namespace's id can
// never be picked up instead.
const match = configText.match(/"binding"\s*:\s*"CACHE",\s*"id"\s*:\s*"([a-f0-9]{32})"/)
if (!match) {
  console.error('[cf-purge] could not find "binding": "CACHE" followed by its id in wrangler.jsonc')
  process.exit(1)
}
const namespaceId = match[1]

function wrangler(args: string[]) {
  const res = spawnSync('bunx', ['wrangler', ...args], { encoding: 'utf8' })
  // `bunx` missing from PATH surfaces as .error, not as an exit status.
  if (res.error)
    res.stderr = `${res.error} ${res.stderr || ''}`
  return res
}

const list = wrangler(['kv', 'key', 'list', '--namespace-id', namespaceId, '--remote', '--prefix', 'nitro:routes:'])
if (list.status !== 0) {
  console.error(`[cf-purge] failed to list KV keys: ${list.stderr.trim()}`)
  process.exit(list.status || 1)
}

let keys: { name: string }[]
try {
  keys = JSON.parse(list.stdout)
}
catch (error) {
  console.error(`[cf-purge] could not parse wrangler's key list output: ${error}`)
  console.error('raw output:', list.stdout.slice(0, 500))
  process.exit(1)
}

if (keys.length === 0) {
  console.log('[cf-purge] no route cache entries to purge')
  process.exit(0)
}

process.stderr.write(`[cf-purge] purging ${keys.length} route cache entries\n`)
// Keep going past a failed delete so one flaky KV call does not leave the remaining entries
// stale; the exit status still reports the failure.
let failed = false
for (const key of keys) {
  const del = wrangler(['kv', 'key', 'delete', key, '--namespace-id', namespaceId, '--remote'])
  if (del.status !== 0) {
    failed = true
    console.error(`[cf-purge] failed to delete "${key}": ${del.stderr.trim()}`)
  }
}
if (failed) {
  console.error('[cf-purge] some entries could not be purged')
  process.exit(1)
}
console.log(`[cf-purge] purged ${keys.length} route cache entries from CACHE`)
