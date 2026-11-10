#!/bin/sh
set -eu
CONFIG=/app/dist/server/wrangler.json
WRANGLER=/app/node_modules/.bin/wrangler

# Apply committed Drizzle migrations to the local D1 (SQLite) database.
"$WRANGLER" d1 migrations apply DB --local --persist-to "$DATA_DIR" --config "$CONFIG"

# --local-upstream/--upstream-protocol make request.url match the public origin,
# which the app's same-origin checks on POST requests rely on.
exec "$WRANGLER" dev \
  --config "$CONFIG" \
  --local \
  --persist-to "$DATA_DIR" \
  --ip 0.0.0.0 \
  --port "$PORT" \
  --inspector-port 0 \
  --local-upstream "$PUBLIC_HOST" \
  --upstream-protocol "$PUBLIC_PROTOCOL" \
  --var "SELF_HOSTED:$SELF_HOSTED" \
  --show-interactive-dev-session=false \
  --log-level info
