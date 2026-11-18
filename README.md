# Portfolio Website

Personal portfolio website built with Nuxt 4, Nuxt UI v4, Nuxt Content v3, and Vite.

## Local Development

```bash
bun run dev
```

The dev server uses `nitro-cloudflare-dev`, which emulates Cloudflare bindings (KV, D1) locally.

## Deployment

### Self-hosted (Docker) — primary

CI (GitHub Actions) builds and publishes the public image `ghcr.io/valentimarco/site` (linux/amd64) on every push to `main`. The image runs on Bun (`oven/bun:1`, Debian-based) as a non-root user and listens on port 3000.

On the server:

1. Copy `.env.docker.example` to `.env.docker` and fill in `NUXT_GITHUB_USERNAME` (and optionally `NUXT_GITHUB_TOKEN`).
2. Pull and start:

   ```bash
   docker compose pull && docker compose up -d
   ```

3. Point your reverse proxy at port 3000. The compose service `site` ships a healthcheck.

To build the image locally instead: `bun run docker:build`.

CI intentionally has no lint/typecheck job; run `bun run lint` and `bun run typecheck` locally before pushing.

### Cloudflare — fallback

The project can still be built and deployed to Cloudflare Workers with Assets (`wrangler.jsonc` is kept):

```bash
bun run build:cf     # Cloudflare build
bun run preview:cf   # build + local `wrangler dev`
bun run deploy:cf    # build + wrangler deploy + route-cache purge
```

On Cloudflare, Nuxt Content v3 uses **Cloudflare D1** and the Nitro cache uses **Workers KV**:

1. Create the D1 database:

   ```bash
   bunx wrangler d1 create portfolio-db
   ```

2. Put the generated `database_id` in `wrangler.jsonc`:

   ```json
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "portfolio-db",
       "database_id": "<your-actual-database-id>"
     }
   ]
   ```

3. Make sure the `DB` binding (and the `CACHE` KV namespace) are connected when deploying.

## Built With

- **Nuxt 4** - The intuitive Vue framework
- **Nuxt UI v4** - Beautiful, customizable Tailwind CSS component library
- **Nuxt Content v3** - Git-based CMS for writing markdown files
- **Tailwind CSS** - Utility-first CSS framework
- **Bun** - Fast all-in-one JavaScript runtime
