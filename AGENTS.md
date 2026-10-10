# AGENTS.md

Instructions for AI coding agents working in this repository. Read this before making changes.

## Project Overview

Personal portfolio website built with:

- **Nuxt 4** (`nuxt@^4.5.1`) — Vue 3 framework, SSR enabled
- **Nuxt UI v4** (`@nuxt/ui`) — Tailwind CSS 4 component library
- **Nuxt Content v3** (`@nuxt/content`) — file-based CMS backed by SQLite locally / **Cloudflare D1** in production
- **Tailwind CSS 4**, **@nuxtjs/seo**, **@nuxt/image**, VueUse, motion-v
- **Bun** — the package manager and runtime. **Do not use pnpm or npm.**

Renders a one-page portfolio (profile, experience, projects from GitHub, contributions, skills, education, certifications), a blog (`/blog`), and a server-generated PDF CV (`/api/cv-pdf`).

## Commands

| Command                     | What it does                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `bun run dev`               | Start dev server (SSR). Runs `nuxt dev` with `nitro-cloudflare-dev` emulating Cloudflare bindings locally |
| `bun run build`             | Production build via `nuxt build`; output in `.output/public` + `.output/server`                          |
| `bun run preview`           | `bun run build && wrangler dev` — preview exactly as on Cloudflare                                        |
| `bun run deploy`            | `bun run build && wrangler deploy` — deploy to Cloudflare Workers                                         |
| `bun run typecheck`         | `nuxt typecheck` (vue-tsc + TS)                                                                           |
| `bun run lint` / `lint:fix` | ESLint (flat config, `@antfu/eslint-config`)                                                              |
| `bun run generate`          | Static generation via `nuxt generate` — **not used for production** (see Gotchas)                         |
| `bun run clean`             | `nuxi cleanup && nuxt prepare`                                                                            |
| `bun run lighthouse`        | Unlighthouse performance audit                                                                            |
| `bun run cf-typegen`        | `wrangler types` — regenerates `worker-configuration.d.ts`                                                |
| `bun run changelog`         | `changelogen --release`                                                                                   |

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
    helpers.ts            # getCachedData / setCachedData (1h localStorage cache)
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

- `ssr: true`. `hooks['prerender:routes']` **clears all routes** — `nuxt generate` produces nothing; the site is SSR-only on Cloudflare.
- Edge caching via `routeRules` in `nuxt.config.ts`:
  - `/blog` → 5 min, `/blog/**` → 1 h
  - `/api/github` → 1 h (edge cache)
  - `/api/cv-pdf` → 1 h (edge cache; protects the GitHub rate limit)
- Client-side: `useGitHub` caches API responses in `localStorage` under `cache:<key>` for 1 h (`helpers.ts` `CACHE_TTL`), and prefers SSR payload data. `fetchedAt` is stamped by `setCachedData`.

### GitHub data flow

1. `useGitHub` (client) → `GET /api/github` with **no query parameters**. The account is server-configured (`runtimeConfig.githubUsername` ← `GITHUB_USERNAME`) and the project slugs are read from the `projects` collection, so callers cannot point the endpoint (and the server token) at arbitrary accounts or amplify a request with arbitrary repo slugs. Identity/display fields (`name`, `email`, `location`) are passed to `useGitHub` only as offline fallbacks.
2. `server/api/github.ts` resolves `githubUsername` and `projectSlugs` server-side, then calls Octokit for profile, project repos, and merged PRs (`author:<username> is:pr is:merged`), dedupes by repo, enriches top repos with stars and each project repo with `languages` (sorted by byte count). Profile data carries a `source: 'github' | 'fallback'` flag. All Octokit calls use `runtimeConfig.githubToken`; per-repo language failures degrade to `[]` rather than dropping the repo. If `GITHUB_USERNAME` is unset it logs a warning and returns the fallback payload without calling GitHub. The cache key is constant (`github:<username>`).
3. Output validated against `gitHubApiResponseSchema` (shared/types/schemas.ts). On mismatch it logs a warning and returns raw data — the client is lenient.
4. Endpoint degrades gracefully: any GitHub failure logs a warning and returns fallback data (empty lists / zeroed profile), so the site never breaks.

### CV PDF

`GET /api/cv-pdf` loads collections, fetches GitHub contributions, and draws the PDF with `pdf-lib` using the manual layout engine in `server/utils/cv-pdf.ts` (keep-together blocks, hanging indents, WinAnsi-safe text). Section order comes from `content/cv.yml`.

### Runtime config

- `runtimeConfig.githubToken` ← `process.env.GITHUB_TOKEN` (server-only). Local: `.env` (see `.env.example`). Cloudflare: `wrangler secret put GITHUB_TOKEN` (or `.dev.vars` locally, see `.dev.vars.example`).
- `runtimeConfig.githubUsername` ← `process.env.GITHUB_USERNAME` (server-only). The single account `/api/github` and the CV PDF query; there is no client input. Local: `.env` (see `.env.example`). Cloudflare: `wrangler secret put GITHUB_USERNAME` (or `.dev.vars` locally, see `.dev.vars.example`).
- `runtimeConfig.public.version` ← `package.json` version (shown in footer).

## Cloudflare / Deployment

- Deploys as a **Cloudflare Worker with Assets** via `wrangler.jsonc`: `main` = `.output/server/index.mjs`, `compatibility_date` `2026-07-10`, flags `nodejs_compat`, `observability` (traces) enabled.
- **D1 binding `DB`** is required — Nuxt Content v3 stores content in D1 in production (`portfolio-db`). Dev emulates it via `nitro-cloudflare-dev`.
- `bun run deploy` builds and deploys. **Do not edit `worker-configuration.d.ts`** — it is generated by `bun run cf-typegen`.
- The repo also carries a GitHub Pages workflow (`.github/workflows/build.yml`, branch `master`). The Cloudflare deploy happens from branch `pages`. Keep this in mind when switching branches; production is Cloudflare.

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
- **`certifications` collection has no source dir** (`content/certifications/` missing) — the Certifications section renders nothing until content is added.
- **`@nuxtjs/seo` module: `schemaOrg` and `sitemap` are enabled; `ogImage` generation is disabled** — the site ships a static og image from `profile.md` via `useSeoMeta` instead. Re-enable `ogImage` deliberately if needed.
- **`@compodium/nuxt` is gated to development** (`process.env.NODE_ENV === 'development'`) — a beta module that should not run in production builds.
- **`GITHUB_TOKEN` unset in prod** → GitHub API runs unauthenticated (60 req/h limit). Edge caching on `/api/github` and `/api/cv-pdf` + client caching mitigates this. Set it with `wrangler secret put GITHUB_TOKEN`.
- **`GITHUB_USERNAME` unset** → `/api/github` falls back to the `profile` collection's `username` (still server-side, never client input), so it keeps working on a fresh build; it only serves the empty fallback if neither is set. The CV PDF likewise falls back to the content profile. Set it with `wrangler secret put GITHUB_USERNAME` to pin the account explicitly.
- **Never let Vue be bundled twice in the server build.** `vue` is pinned in `package.json` (`^3.5.40`) so `nuxt` / `@nuxt/nitro-server` dedupe to the root copy. If the tree ends up with several Vue copies (e.g. a stale lockfile or a leftover pnpm `node_modules`), Cloudflare SSR throws `Cannot read properties of null (reading 'ce')` on every page: Vue runtime-core state is split across chunks, so Reka UI's `ConfigProvider` calls `renderSlot` with a null current instance. Keep `node_modules` a clean Bun install and `vue` aligned with Nuxt's requirement.
- Local `.env` / `.dev.vars` hold `GITHUB_TOKEN` and `GITHUB_USERNAME` (gitignored). Never commit them.
- Uncommitted at times: new blog posts land as untracked files until committed.
