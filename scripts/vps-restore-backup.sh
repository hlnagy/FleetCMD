#!/usr/bin/env bash
# ==============================================================================
# FleetCMD — Restore Helper (for .fleetbak / .zip / .dump archives)
# ==============================================================================
# Usage:
#   ./scripts/vps-restore-backup.sh <path-to-database.dump>
#
# Note:
#   If restoring from a downloaded `.fleetbak` archive, first decrypt & unzip:
#     node backend/scripts/decrypt-backup.js fleetcmd_backup_2026-11-16.fleetbak out.zip
#     unzip out.zip -d restored_bundle/
#     ./scripts/vps-restore-backup.sh restored_bundle/database.dump
# ==============================================================================

set -euo pipefail

DUMP_FILE="${1:-}"
if [ -z "${DUMP_FILE}" ] || [ ! -f "${DUMP_FILE}" ]; then
  echo "Utilizare: $0 <cale-catre-database.dump>"
  exit 1
fi

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

DB_NAME="${POSTGRES_DB:-cmms_flota}"
DB_USER="${POSTGRES_USER:-fleet_app_user}"

echo "ATENTIE: Restaurarea va suprascrie datele existente din baza '${DB_NAME}'!"
read -r -p "Scrie RESTORE pentru a continua: " CONFIRM
if [ "${CONFIRM}" != "RESTORE" ]; then
  echo "Anulat."
  exit 0
fi

if command -v pg_restore >/dev/null 2>&1 && [ -n "${DATABASE_URL:-}" ]; then
  CLEAN_URL="${DATABASE_URL%%\?*}"
  pg_restore --clean --if-exists --no-owner --no-acl -d "${CLEAN_URL}" "${DUMP_FILE}"
  echo "[OK] Restaurare finalizată cu pg_restore nativ."
elif command -v docker >/dev/null 2>&1; then
  CONTAINER="$(docker ps --format '{{.Names}}\t{{.Image}}' | awk '/cmms_postgres|postgres/ {print $1; exit}')"
  if [ -z "${CONTAINER}" ]; then
    echo "[EROARE] Container PostgreSQL negăsit."
    exit 1
  fi
  export PGPASSWORD="${POSTGRES_PASSWORD:-}"
  docker exec -i -e PGPASSWORD "${CONTAINER}" pg_restore -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists --no-owner --no-acl < "${DUMP_FILE}"
  unset PGPASSWORD
  echo "[OK] Restaurare finalizată în containerul '${CONTAINER}'."
else
  echo "[EROARE] Nu există pg_restore și nici docker."
  exit 1
fi
