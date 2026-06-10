#!/bin/sh
# Wrapper for postgres:16-alpine on Azure Files (SMB).
# Official initdb chmod's PGDATA, which SMB mounts reject. Initialize on /tmp, copy to PGDATA.
set -e

if [ "$1" != 'postgres' ]; then
  exec /usr/local/bin/docker-entrypoint.sh "$@"
fi

pgdata="${PGDATA:-/mnt/postgres-data}"

# SMB mount uses uid=999; root cannot stat PGDATA — check and copy as postgres.
if ! su-exec postgres test -s "$pgdata/PG_VERSION"; then
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

  su-exec postgres initdb -D "$tmp" --username="$POSTGRES_USER" --pwfile="$pwfile"

  rm -f "$pwfile"

  # Alpine initdb has no --dbname; create the app database on a temporary local cluster.
  if [ -n "${POSTGRES_DB:-}" ] && [ "$POSTGRES_DB" != "$POSTGRES_USER" ]; then
    echo "Creating database ${POSTGRES_DB} on temporary cluster..."
    su-exec postgres pg_ctl -D "$tmp" -w start
    su-exec postgres createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
    su-exec postgres pg_ctl -D "$tmp" -m fast -w stop
  fi

  # Share is mounted at PGDATA (uid=999); copy cluster to mount root — no mkdir on image paths.
  su-exec postgres sh -c "cp -R \"$tmp\"/. \"$pgdata\"/"
  rm -rf "$tmp"

  echo "PostgreSQL cluster copied to $pgdata"
fi

# SMB/CIFS does not support fsync; disable to avoid runtime I/O errors on Azure Files.
exec /usr/local/bin/docker-entrypoint.sh postgres \
  -c fsync=off \
  -c full_page_writes=off
