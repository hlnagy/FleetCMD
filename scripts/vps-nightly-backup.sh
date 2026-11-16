#!/usr/bin/env bash
# ==============================================================================
# FleetCMD — Contabo VPS Nightly Backup Script (Native PostgreSQL OR Docker)
# ==============================================================================
# Optional OS-level backup script (in addition to NestJS built-in 02:00 cron).
# Auto-detects whether PostgreSQL runs natively or in Docker (cmms_postgres).
#
# Cron example (02:15 every night):
#   15 2 * * * /path/to/FleetCMD/scripts/vps-nightly-backup.sh >> /var/log/fleetcmd-backup.log 2>&1
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${REPO_DIR}/.env"
[ -f "${REPO_DIR}/backend/.env" ] && ENV_FILE="${REPO_DIR}/backend/.env"

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

BACKUP_ROOT="${BACKUP_DIR:-${REPO_DIR}/backups/vps_pgdump}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TODAY="$(TZ=Europe/Bucharest date +%F)"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "${WORK_DIR}"' EXIT

mkdir -p "${BACKUP_ROOT}"
chmod 700 "${BACKUP_ROOT}"

DB_NAME="${POSTGRES_DB:-cmms_flota}"
DB_USER="${POSTGRES_USER:-fleet_app_user}"
DUMP_FILE="${WORK_DIR}/database_${TODAY}.dump"

echo "[$(date -Is)] Pornire backup VPS FleetCMD pentru ${TODAY}..."

if command -v pg_dump >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
  CLEAN_URL="${DATABASE_URL%%\?*}"
  pg_dump --format=custom --no-owner --no-acl -f "${DUMP_FILE}" "${CLEAN_URL}"
  echo "[OK] Dump realizat cu pg_dump nativ."
elif command -v docker >/dev/null 2>&1; then
  CONTAINER="$(docker ps --format '{{.Names}}\t{{.Image}}' | awk '/cmms_postgres|postgres/ {print $1; exit}')"
  if [ -z "${CONTAINER}" ]; then
    echo "[EROARE] Nu s-a găsit nici pg_dump nativ, nici un container Docker PostgreSQL activ."
    exit 1
  fi
  export PGPASSWORD="${POSTGRES_PASSWORD:-}"
  docker exec -e PGPASSWORD "${CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --format=custom --no-owner --no-acl > "${DUMP_FILE}"
  unset PGPASSWORD
  echo "[OK] Dump realizat din containerul Docker '${CONTAINER}'."
else
  echo "[EROARE] Nu există nici pg_dump, nici docker pe sistem."
  exit 1
fi

if [ -d "${REPO_DIR}/backend/uploads" ]; then
  tar -czf "${WORK_DIR}/uploads_${TODAY}.tar.gz" -C "${REPO_DIR}/backend" uploads
fi

ARCHIVE_TAR="${WORK_DIR}/fleetcmd_vps_${TODAY}.tar.gz"
tar -czf "${ARCHIVE_TAR}" -C "${WORK_DIR}" .

if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  FINAL_FILE="${BACKUP_ROOT}/fleetcmd_vps_${TODAY}.tar.gz.enc"
  openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt \
    -in "${ARCHIVE_TAR}" -out "${FINAL_FILE}" -pass env:BACKUP_ENCRYPTION_KEY
  chmod 600 "${FINAL_FILE}"
  echo "[OK] Backup criptat salvat: ${FINAL_FILE}"
else
  FINAL_FILE="${BACKUP_ROOT}/fleetcmd_vps_${TODAY}.tar.gz"
  mv "${ARCHIVE_TAR}" "${FINAL_FILE}"
  chmod 600 "${FINAL_FILE}"
  echo "[WARN] BACKUP_ENCRYPTION_KEY lipsește — salvat necriptat: ${FINAL_FILE}"
fi

sha256sum "${FINAL_FILE}" > "${FINAL_FILE}.sha256"

# Retention cleanup (keep monthly 1st-day snapshots up to 180 days)
find "${BACKUP_ROOT}" -maxdepth 1 -type f -name 'fleetcmd_vps_*' -mtime "+${RETENTION_DAYS}" ! -name '*-01.*' -delete
find "${BACKUP_ROOT}" -maxdepth 1 -type f -name 'fleetcmd_vps_*-01.*' -mtime +180 -delete

echo "[$(date -Is)] Backup VPS finalizat cu succes."
