# Carbook self-hosted image (linux/arm64 and linux/amd64).
# Build context: the repo's `carbook/` folder.
# Runs the built Cloudflare Worker locally with workerd (via wrangler/miniflare):
#   D1 -> local SQLite, R2 -> local files, both persisted under /data.

# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /src
ENV CI=1 \
    WRANGLER_SEND_METRICS=false \
    CLOUDFLARE_CF_FETCH_ENABLED=false
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack pnpm install --frozen-lockfile
COPY . .
RUN corepack pnpm run build \
 && node -e 'const f="dist/server/wrangler.json",fs=require("fs"),c=JSON.parse(fs.readFileSync(f));c.d1_databases[0].migrations_dir="../../drizzle";c.dev={...c.dev,enable_containers:false};fs.writeFileSync(f,JSON.stringify(c));'

# ---------- runtime ----------
FROM node:22-bookworm-slim
# workerd needs glibc + CA certs; tini handles signals.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Only the runtime is needed here (wrangler pulls the matching workerd binary for this arch).
RUN npm init -y >/dev/null && npm install --omit=dev --no-audit --no-fund wrangler@4.92.0 \
 && npx wrangler --version
COPY --from=build /src/dist ./dist
COPY --from=build /src/drizzle ./drizzle
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /data && chown -R node:node /app /data
USER node
ENV CI=1 \
    HOME=/app \
    WRANGLER_SEND_METRICS=false \
    WRANGLER_WRITE_LOGS=false \
    CLOUDFLARE_CF_FETCH_ENABLED=false \
    PORT=8787 \
    DATA_DIR=/data \
    PUBLIC_HOST=analysight.com \
    PUBLIC_PROTOCOL=https \
    SELF_HOSTED=1
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/favicon.svg').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
