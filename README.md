# Portfolio Website

Personal portfolio website built with Nuxt 4, Nuxt UI v4, Nuxt Content v3, and Vite.

## Cloudflare Deployment

This project is configured to run on the **Cloudflare Developer Platform** (using Cloudflare Workers with Assets, the unified successor to Cloudflare Pages).

### Local Development & Emulation

You can run the Nuxt development server with Cloudflare's local resources (KV, D1, etc.) emulated locally:

```bash
bun run dev
```

This runs the dev server using `nitro-cloudflare-dev` which automatically binds Wrangler's local emulator.

### Local Preview

To build and preview your application locally exactly as it will run on Cloudflare:

```bash
bun run preview
```

### Production Build

To build your application for Cloudflare manually:

```bash
bun run build
```

The output will be generated inside `.output/public` (static assets) and `.output/server` (server-side rendering entry point).

### Deployment

To deploy your application to Cloudflare from your local machine:

```bash
bun run deploy
```

This will run the build script and use Wrangler to deploy your assets and server to Cloudflare under a `*.workers.dev` subdomain or custom domain.

#### Setting up the D1 Database (for Nuxt Content v3)

Nuxt Content v3 uses an SQLite-compatible storage layer. On Cloudflare, this is powered by **Cloudflare D1**.

1. Create a D1 Database in your Cloudflare Dashboard, or run via Wrangler:
   ```bash
   bunx wrangler d1 create portfolio-db
   ```
2. Note the generated `database_id` and update it in your `wrangler.jsonc` file:
   ```json
   "d1_databases": [
     {
       "binding": "DB",
       "database_name": "portfolio-db",
       "database_id": "<your-actual-database-id>"
     }
   ]
   ```
3. When deploying to the Cloudflare dashboard, make sure the `DB` binding is connected to your D1 database.

## Built With

- **Nuxt 4** - The intuitive Vue framework
- **Nuxt UI v4** - Beautiful, customizable Tailwind CSS component library
- **Nuxt Content v3** - Git-based CMS for writing markdown files
- **Tailwind CSS** - Utility-first CSS framework
- **Bun** - Fast all-in-one JavaScript runtime
