# AGENTS.md

Instructions for AI coding agents working in this repository. Read this before making changes.

## Project Overview

Personal portfolio website built with:

- **Nuxt 4** (`nuxt@^4.5.1`) — Vue 3 framework, SSR enabled
- **Nuxt UI v4** (`@nuxt/ui`) — Tailwind CSS 4 component library
- **Nuxt Content v3** (`@nuxt/content`) — file-based CMS backed by SQLite (a local file on the self-hosted target, **Cloudflare D1** on the Cloudflare fallback)
- **Tailwind CSS 4**, **@nuxtjs/seo**, **@nuxt/image**, VueUse, motion-v
- **Bun** — the package manager and runtime. **Do not use pnpm or npm.**
- **Deployment** — production is **self-hosted Docker** (image `ghcr.io/valentimarco/site`, built by GitHub Actions); Cloudflare Workers is a **fallback** target.

Renders a one-page portfolio (profile, experience, projects from GitHub, contributions, skills, education, certifications), a blog (`/blog`), and a server-generated PDF CV (`/api/cv-pdf`).

## Branches & CI

- Default branch is `main` (production source). CI (`.github/workflows/docker.yml`) builds and pushes the public `ghcr.io/valentimarco/site` image (linux/amd64; tags `latest`, `main`, `sha-*`, and semver on `v*` tags) on push.
- CI deliberately has **no lint/typecheck job** — quality gates are local discipline: run `bun run lint` and `bun run typecheck` before committing.
- The old `pages` branch (legacy Cloudflare deploy source), `master`, and the GitHub Pages workflow are gone — `main` is the only branch.

## Commands

| Command                     | What it does                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `bun run dev`               | Start dev server (SSR). Local SQLite (better-sqlite3) via the default node target                              |
| `bun run build`             | Production build via `nuxt build` (node-server preset, default); output in `.output/public` + `.output/server` |
| `bun run build:cf`          | `NITRO_PRESET=cloudflare_module nuxt build` — Cloudflare Workers build (fallback target)                       |
| `bun run preview:cf`        | `bun run build:cf && wrangler dev` — preview exactly as on Cloudflare                                          |
| `bun run deploy:cf`         | `bun run build:cf && wrangler deploy && bun run cf-purge` — deploy to Cloudflare Workers (fallback)            |
| `bun run docker:build`      | `docker build -t ghcr.io/valentimarco/site:dev .` — build the self-hosted image locally                        |
| `bun run typecheck`         | `nuxt typecheck` (vue-tsc + TS)                                                                                |
| `bun run lint` / `lint:fix` | ESLint (flat config, `@antfu/eslint-config`)                                                                   |
| `bun run generate`          | Static generation via `nuxt generate` — **not used for production** (see Gotchas)                              |
| `bun run clean`             | `nuxi cleanup && nuxt prepare`                                                                                 |
| `bun run lighthouse`        | Unlighthouse performance audit                                                                                 |
| `bun run cf-typegen`        | `wrangler types` — regenerates `worker-configuration.d.ts`                                                     |
| `bun run changelog`         | `changelogen --release`                                                                                        |

Verification before completing any task: run `bun run lint` and `bun run typecheck`. There is **no test suite** — do not invent one unless asked.

## Project Structure

```
app/                      # Nuxt frontend (srcDir = app/)
  app.vue                 # Root: UApp + NavBar + NuxtPage
  app.config.ts
  loading.html            # SPA loading template
  assets/css/main.css     # Global styles (Tailwind)
  components/             # Section components (Experience, Education, Projects, ...)
  composables/
    useContent.ts         # Loads all Nuxt Content collections into one object
    useGitHub.ts          # Fetches /api/github with local cache + SSR fallback
  pages/
    index.vue             # The single-page portfolio
    blog/index.vue        # Blog list (searchable)
    blog/[slug].vue       # Blog post reader
  utils/
    consts.ts             # Re-exports Zod-derived types from #shared
content/                  # Nuxt Content collections (markdown + yml) — see "Content authoring"
server/
  api/
    github.ts             # GET /api/github — Octokit proxy: profile + repos (incl. languages) + merged PRs
    cv-pdf.get.ts         # GET /api/cv-pdf — server-rendered PDF CV (pdf-lib)
  utils/
    cv-text.ts            # WinAnsi sanitization, date fns, minimark parser
    cv-pdf.ts             # CvLayout: manual PDF layout engine
    cv-github.ts          # fetchContributions: merged PR search + repo enrichment
shared/
  types/schemas.ts        # Zod schemas for /api/github (output only), auto-imported as #shared
docs/
  review.md               # 2026-07-31 security + architecture review (findings, mostly resolved)
public/                   # Static assets (images, _robots.txt)
content.config.ts         # Collection definitions + Zod schemas
nuxt.config.ts            # Nuxt config (routeRules, runtimeConfig, nitro preset)
wrangler.jsonc            # Cloudflare Worker config (D1 binding, nodejs_compat)
```

## Content Authoring

Collections are declared in `content.config.ts` with Zod validation. Adding/editing content is the most common task — obey each collection's required frontmatter:

| Collection       | Source                        | Type | Required frontmatter                                                                                                                                                |
| ---------------- | ----------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profile`        | `content/profile.md`          | page | `name, username, description, jobTitle, birthDate, ogImage, email, location, socials[]`                                                                             |
| `skills`         | `content/skills.yml`          | data | `categories: [{ name, items[] }]`                                                                                                                                   |
| `experiences`    | `content/experiences/*.md`    | page | `company, companyUrl, location, position, startDate, technologies[]` (+ optional `endDate`, `isMaintainer`, `titleMaintainer`, `isContributor`, `titleContributor`) |
| `education`      | `content/education/*.md`      | page | `institution, degree, startDate, skills[]` (+ optional `endDate`)                                                                                                   |
| `certifications` | `content/certifications/*.md` | page | `title, issuer, issueDate` (+ optional `url`) — **directory does not exist yet**                                                                                    |
| `projects`       | `content/projects.yml`        | data | `repos[]` (max 12) — GitHub repo slugs                                                                                                                              |
| `blog`           | `content/blog/*.md`           | page | `title, description, date` (+ optional `image`, `tags[]`, `draft` default false)                                                                                    |
| `cv`             | `content/cv.yml`              | data | `body[]` — ordered list of PDF CV sections                                                                                                                          |

Conventions:

- Order numbered collections by filename stem prefix (`1.palermo.md`, `2.palermo.md`); `useContent` sorts by `stem ASC`.
- Blog posts with `draft: true` are excluded from listing (handled in `blog/index.vue`).
- Markdown can use custom components: `:gradient-text{colors="..." angle="..."}[text]` (see `content/profile.md`).
- `profile.md` body supports the `{{ $doc.age }}` binding; the CV PDF uses a custom "minimark" parser (`parseMinimarkBody` in `server/utils/cv-text.ts`) — paragraphs and `- ` lists; inline `**bold**` is supported, other markdown is not.
- Content is validated at build/runtime by the schemas in `content.config.ts`. Keep frontmatter in sync when editing schemas.

## Architecture Notes

### Rendering & caching

- `ssr: true`. `hooks['prerender:routes']` **clears all routes** — `nuxt generate` produces nothing; the site is SSR-only on both targets.
- Caching via `routeRules` in `nuxt.config.ts`:
  - `/blog` → 5 min, `/blog/**` → 1 h
  - `/api/cv-pdf` → 1 h (Nitro cache layer; protects the GitHub rate limit)
- `/api/github` is **not** a routeRule: `server/api/github.ts` caches its payload in the Nitro `cache`
  storage, which persists across restarts: Workers KV (`CACHE` in `wrangler.jsonc`) on the Cloudflare
  target, the filesystem (`.data/cache`) on the self-hosted target. Entries are wrapped as `{ fetchedAt, data }`: a fresh (≤1 h) healthy entry is served as-is,
  an older one triggers a live re-fetch. Degraded (`source: 'fallback'`) payloads are never written.
  The cache key is build-scoped (`github:<githubUsername || 'unset'>:<public.buildId>`; the build id
  is evaluated once per build in `nuxt.config.ts`) — content only ships with a deploy, so every
  deploy starts a new key and a stale snapshot cannot survive one. Old-scheme or orphaned entries
  are simply abandoned (no TTL is set; the purge script does not touch them). When GitHub is
  unreachable, a last-known-good entry (even older than 1 h) is served instead of the empty fallback.
- **Cloudflare only: route-rule HTML caches persist in KV across deploys** (the key is request-based, not build-based),
  so right after `wrangler deploy` a cached `/`, `/blog` or post can keep serving the previous build's
  HTML — which references chunk hashes the new deploy removed — until `maxAge` elapses. `bun run deploy:cf`
  purges them via `bun run cf-purge` (delete the `nitro:routes:*` keys from the `CACHE` namespace,
  reads the namespace id from `wrangler.jsonc`); KV is eventually consistent, so a fresh edge may
  still serve briefly.
- Client-side: `useGitHub` resolves `/api/github` **after hydration** (`server: false`) so the homepage
  never blocks on GitHub; the sections and profile stats render once it resolves. There is no
  localStorage cache — a synchronous cached read during hydration desyncs the DOM from the SSR HTML.

### GitHub data flow

1. `useGitHub` (client) → `GET /api/github` with **no query parameters**. The account is server-configured (`runtimeConfig.githubUsername` ← `GITHUB_USERNAME`) and the project slugs are read from the `projects` collection, so callers cannot point the endpoint (and the server token) at arbitrary accounts or amplify a request with arbitrary repo slugs. Identity/display fields (`name`, `email`, `location`) are passed to `useGitHub` only as offline fallbacks.
2. `server/api/github.ts` resolves `githubUsername` (from `GITHUB_USERNAME` only — the content profile's `username` is never read server-side, so content cannot steer which account the server token queries) and `projectSlugs` server-side, then calls Octokit for profile, project repos, and merged PRs (`author:<username> is:pr is:merged`), dedupes by repo, enriches top repos with stars and each project repo with `languages` (sorted by byte count). Profile data carries a `source: 'github' | 'fallback'` flag. All Octokit calls use `runtimeConfig.githubToken`; per-repo language failures degrade to `[]` rather than dropping the repo. If `GITHUB_USERNAME` is unset it logs a warning and returns the fallback payload without calling GitHub.
3. Output validated against `gitHubApiResponseSchema` (shared/types/schemas.ts). On mismatch it logs a warning and returns raw data — the client is lenient.
4. Endpoint degrades gracefully: any GitHub failure logs a warning and returns fallback data (empty lists / zeroed profile), so the site never breaks.

### CV PDF

`GET /api/cv-pdf` loads collections, fetches GitHub contributions, and draws the PDF with `pdf-lib` using the manual layout engine in `server/utils/cv-pdf.ts` (keep-together blocks, hanging indents, WinAnsi-safe text). Section order comes from `content/cv.yml`.

### Runtime config

- `runtimeConfig.githubToken` ← `process.env.GITHUB_TOKEN` at build (server-only). Local: `.env` (see `.env.example`). **Docker (production):** `NUXT_GITHUB_TOKEN` at runtime (Nuxt's `NUXT_` runtimeConfig override; `.env.docker`, see `.env.docker.example`). Cloudflare: `wrangler secret put GITHUB_TOKEN` (or `.dev.vars` locally, see `.dev.vars.example`).
- `runtimeConfig.githubUsername` ← `process.env.GITHUB_USERNAME` at build (server-only). The single account `/api/github` and the CV PDF query; there is no client input. Local: `.env` (see `.env.example`). **Docker (production):** `NUXT_GITHUB_USERNAME` at runtime (`.env.docker`). Cloudflare: `wrangler secret put GITHUB_USERNAME` (or `.dev.vars` locally, see `.dev.vars.example`).
- `runtimeConfig.public.version` ← `package.json` version (shown in footer).

## Self-hosted Docker (production)

- Default build is the Nitro `node-server` preset (`NITRO_PRESET` is read at build time in `nuxt.config.ts`, not at runtime). The `Dockerfile` is multi-stage and uses **Bun in both stages** (`oven/bun:1`, Debian-based) and runs as the non-root `bun` user.
- **glibc-only images**: better-sqlite3 needs glibc ≥ 2.29 — never switch the base to Alpine.
- Nuxt Content db is `.output/server/contents.sqlite`, created at server boot from the bundled dump. The Nitro `cache` storage is the filesystem at `.data/cache`; a new deploy is a new container with a fresh cache, so no KV purge is needed.
- Container env contract: `NUXT_GITHUB_TOKEN` (optional) and `NUXT_GITHUB_USERNAME` (required for GitHub sections), via `.env.docker` (copy from `.env.docker.example`).
- `docker-compose.yml` defines service `site` on port 3000 with a Bun-fetch healthcheck; the user's reverse proxy fronts it. On the server: `docker compose pull && docker compose up -d`.
- The image is published to the **public** GHCR repo `ghcr.io/valentimarco/site`, linux/amd64 only.

## Cloudflare / Deployment (fallback)

Not production; kept working via `bun run build:cf` / `bun run deploy:cf`.

- Deploys as a **Cloudflare Worker with Assets** via `wrangler.jsonc`: `main` = `.output/server/index.mjs`, `assets.directory` = `./.output/public` (binding `ASSETS`, mirroring what Nitro bakes into `.output/server/wrangler.json` — without it `wrangler deploy` uploads no static files and the Worker serves empty 200s for `/_nuxt/*`, `/_fonts/*` and images, which the CDN then caches for 4 h), `compatibility_date` `2026-07-10`, flags `nodejs_compat`, `observability` (traces) enabled.
- **Routing to `valentimarco.it` is currently detached** (`wrangler.jsonc` has no `routes`) while the final content is added. When re-attaching, use the scoped list only — `valentimarco.it/`, `/blog*`, `/api/*`, `/_*`, and the static files (`favicon.*`, `me*.webp`, `og-image.png`, `robots.txt`, `sitemap.xml`), mirrored on `www`. **Never add a catch-all `valentimarco.it/*`**: other apps live under the same domain and unmatched paths must fall through. Routes are read from `wrangler.jsonc` at build time (Nitro bakes them into `.output/server/wrangler.json`), so **rebuild before deploying route changes**. Note: removing `routes` from the config and deploying does **not** delete existing zone routes — `wrangler deploy` only adds them; delete stale ones via the API/dashboard.
- **D1 binding `DB`** is required — Nuxt Content v3 stores content in D1 in production (`portfolio-db`). There is no local emulation: `bun run dev` uses the default node target with better-sqlite3, so exercising the D1 path means the Cloudflare build via `bun run preview:cf` (wrangler dev).
- **KV binding `CACHE`** is required — the Nitro `cache` storage (used by `/api/github`, blog route rules, and the icon cache) is bound to Workers KV so values survive isolate cold starts. Create it with `wrangler kv namespace create CACHE` and keep the id in `wrangler.jsonc` in sync.
- `bun run deploy:cf` builds (Cloudflare preset), deploys and purges the route-cache KV keys. **Do not edit `worker-configuration.d.ts`** — it is generated by `bun run cf-typegen`.
- Branch state for this target: see "Branches & CI" above. Production is self-hosted Docker, not Cloudflare.

## Conventions & Quality

- **Package manager: Bun.** `bun.lock` is authoritative. (pnpm artifacts were removed in 2026-07-31 cleanup; don't reintroduce them.)
- **Lint:** `@antfu/eslint-config`, flat config, single quotes, 2-space indent, trailing newlines. Vue a11y enabled. `no-console` is off; style rules are warnings. Run `bun run lint` before finishing.
- **Types:** TypeScript strict-ish via Nuxt defaults; `nuxt typecheck` must pass. Prefer Zod-inferred types from `#shared/types/schemas` over `any` (existing `any` usage in server code is legacy).
- **No test suite.** Do not add tests unless explicitly asked.
- Git commit style follows conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`) per `CHANGELOG.md`.
- Use auto-imports (Vue/Nuxt/Nuxt UI components like `UCard`, `UButton`, `UIcon`) — do not import them manually.
- Keep section components in `app/components/` with a single responsibility; reuse Nuxt UI primitives.

## Gotchas / Known Issues

- **`worker-configuration.d.ts` is gitignored** — it's a generated file (`wrangler types`). Regenerate locally with `bun run cf-typegen`; don't hand-edit.
- **`certifications` content is placeholder** — `content/certifications/*.md` ships two `Example» placeholder certs (pointing at `/og-image.png`) so the section and the CV PDF render; replace them with real certs and logos under `public/certifications/`.
- **`@nuxtjs/seo` module: `schemaOrg` and `sitemap` are enabled; `ogImage` generation is disabled** — the site ships a static og image from `profile.md` via `useSeoMeta` instead. Re-enable `ogImage` deliberately if needed.
- **`@compodium/nuxt` is gated to development** (`process.env.NODE_ENV === 'development'`) — a beta module that should not run in production builds.
- **`GITHUB_TOKEN` unset in prod** → GitHub API runs unauthenticated (60 req/h limit). Server-side caching of `/api/github` and `/api/cv-pdf` mitigates this. Set `NUXT_GITHUB_TOKEN` (Docker) or `wrangler secret put GITHUB_TOKEN` (Cloudflare).
- **`GITHUB_USERNAME` unset** → `/api/github` serves the empty fallback payload without contacting GitHub, and the CV PDF renders without GitHub sections (no Octokit calls). Set `NUXT_GITHUB_USERNAME` (Docker), or `wrangler secret put GITHUB_USERNAME` (or `.dev.vars` locally) on Cloudflare, to enable the GitHub-backed sections.
- **Never let Vue be bundled twice in the server build.** `vue` is pinned in `package.json` (`^3.5.40`) so `nuxt` / `@nuxt/nitro-server` dedupe to the root copy. If the tree ends up with several Vue copies (e.g. a stale lockfile or a leftover pnpm `node_modules`), SSR throws `Cannot read properties of null (reading 'ce')` on every page: Vue runtime-core state is split across chunks, so Reka UI's `ConfigProvider` calls `renderSlot` with a null current instance. Keep `node_modules` a clean Bun install and `vue` aligned with Nuxt's requirement.
- **The runtime image copies the FULL `node_modules`, not Nitro's traced `.output/server/node_modules`.** Nitro's trace resolves `ofetch` via the `node` export condition, but Bun resolves the `bun` condition to a different file, so the partial traced copy crashes at boot (`Cannot find package 'ofetch'`). The Dockerfile copies the complete install and removes the traced copy (see `Dockerfile:16-18`).
- Local `.env` / `.dev.vars` hold `GITHUB_TOKEN` and `GITHUB_USERNAME` (gitignored). Never commit them.
- Uncommitted at times: new blog posts land as untracked files until committed.
