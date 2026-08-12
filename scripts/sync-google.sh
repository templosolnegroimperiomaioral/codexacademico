#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/codexacademico}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"

if [ ! -r "$ENV_FILE" ]; then
  echo "Arquivo de ambiente não encontrado: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${CRON_SECRET:?CRON_SECRET deve ser configurado}"

curl --fail --silent --show-error \
  --request POST \
  --header "x-cron-secret: $CRON_SECRET" \
  "http://127.0.0.1:${PORT:-3000}/api/scheduled/google-sync"
