#!/bin/sh
# Wrapper for postgres:16-alpine on Azure Files (SMB).
# Official initdb chmod's PGDATA, which SMB mounts reject. Initialize on /tmp, copy to PGDATA.
set -e

if [ "$1" != 'postgres' ]; then
  exec /usr/local/bin/docker-entrypoint.sh "$@"
fi

pgdata="${PGDATA:-/var/lib/postgresql/data}"

if [ ! -s "$pgdata/PG_VERSION" ]; then
  echo "Initializing PostgreSQL off-volume for Azure Files SMB compatibility..."

  tmp="/tmp/pginit.$$"
  rm -rf "$tmp"
  mkdir -p "$tmp"
  chmod 700 "$tmp"
  chown postgres:postgres "$tmp"

  pwfile="/tmp/pgpass.$$"
  umask 077
  printf '%s\n' "$POSTGRES_PASSWORD" > "$pwfile"
  chown postgres:postgres "$pwfile"

  initdb_args=""
  if [ -n "${POSTGRES_INITDB_ARGS:-}" ]; then
    initdb_args="$POSTGRES_INITDB_ARGS"
  fi
  if [ -n "${POSTGRES_DB:-}" ] && [ "$POSTGRES_DB" != "$POSTGRES_USER" ]; then
    initdb_args="$initdb_args --dbname=$POSTGRES_DB"
  fi

  # shellcheck disable=SC2086
  su-exec postgres initdb -D "$tmp" --username="$POSTGRES_USER" --pwfile="$pwfile" $initdb_args

  rm -f "$pwfile"

  mkdir -p "$pgdata"
  su-exec postgres sh -c "cp -R \"$tmp\"/. \"$pgdata\"/"
  rm -rf "$tmp"

  echo "PostgreSQL cluster copied to $pgdata"
fi

# SMB/CIFS does not support fsync; disable to avoid runtime I/O errors on Azure Files.
exec /usr/local/bin/docker-entrypoint.sh postgres \
  -c fsync=off \
  -c full_page_writes=off
