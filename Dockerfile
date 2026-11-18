# ---- build: bun (project toolchain) ----
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun --bun run build

# ---- runtime: bun on Debian (glibc >= 2.29 for better-sqlite3) ----
FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=bun:bun /app/.output ./.output
# Nitro's trace keeps only the `node` export-condition files (e.g. ofetch/dist/node.mjs),
# but Bun resolves the `bun` condition (dist/index.mjs) -> boot fails. Drop the partial
# trace and resolve from the full install instead (walk-up lookup reaches /app/node_modules).
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
RUN rm -rf .output/server/node_modules
# Content db restore + fs cache write into .data at runtime
RUN install -d -o bun -g bun .data
USER bun
EXPOSE 3000
CMD ["bun", ".output/server/index.mjs"]
