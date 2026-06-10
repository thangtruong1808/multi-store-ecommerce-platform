#!/bin/sh
# Wrapper for postgres:16-alpine on Azure Files (SMB).
# Official initdb chmod's PGDATA, which SMB mounts reject. Initialize on /tmp, copy to PGDATA.
set -e

if [ "$1" != 'postgres' ]; then
  exec /usr/local/bin/docker-entrypoint.sh "$@"
fi

pgdata="${PGDATA:-/mnt/postgres-data}"

# API connects from ACA internal IPs without TLS; default initdb pg_hba is local-only.
ensure_aca_pg_hba() {
  hba="$pgdata/pg_hba.conf"
  if [ ! -f "$hba" ]; then
    return 0
  fi
  if ! su-exec postgres grep -q 'aca-container-apps' "$hba" 2>/dev/null; then
    echo "Allowing ACA internal TCP connections in pg_hba.conf..."
    su-exec postgres sh -c "printf '%s\n' '' '# aca-container-apps (api -> postgres, no TLS inside env)' 'hostnossl all all 0.0.0.0/0 scram-sha-256' >> \"$hba\""
  fi
}

# SMB mount uses uid=70 (postgres:16-alpine) with dir_mode=0700; check and copy as postgres.
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

  # Share is mounted at PGDATA (uid=70); copy cluster to mount root — no mkdir on image paths.
  su-exec postgres sh -c "cp -R \"$tmp\"/. \"$pgdata\"/"
  rm -rf "$tmp"

  echo "PostgreSQL cluster copied to $pgdata"
fi

ensure_aca_pg_hba

# SMB/CIFS does not support fsync; disable to avoid runtime I/O errors on Azure Files.
exec /usr/local/bin/docker-entrypoint.sh postgres \
  -c fsync=off \
  -c full_page_writes=off
