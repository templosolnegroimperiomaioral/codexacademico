#!/usr/bin/env sh
set -eu

APP_DIR="${APP_DIR:-/opt/codexacademico}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$APP_DIR/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Arquivo de ambiente não encontrado: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD deve ser definido}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"

cd "$APP_DIR"
docker compose -f "$COMPOSE_FILE" exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" db \
  mysqldump --single-transaction --routines --events -uroot codex_academico \
  | gzip > "$BACKUP_DIR/mysql-$TIMESTAMP.sql.gz"

tar -C "$APP_DIR" -czf "$BACKUP_DIR/uploads-$TIMESTAMP.tar.gz" uploads
find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete

echo "Backup concluído em $BACKUP_DIR: $TIMESTAMP"
