#!/usr/bin/env bash
# Deletes the original MP4 of every movie already converted to HLS, to free disk space.
# Run on the server: the worker only listens on 127.0.0.1. Dry run by default - nothing is deleted
# until you set DRY_RUN=0.
#
#   WORKER_ENV_FILE=/path/to/worker/.env ./cleanup-mp4.sh            # report only
#   WORKER_ENV_FILE=/path/to/worker/.env DRY_RUN=0 ./cleanup-mp4.sh  # delete
set -euo pipefail

WORKER_URL="${WORKER_URL:-http://127.0.0.1:8080}"
BATCH_SIZE="${BATCH_SIZE:-50}"
DRY_RUN="${DRY_RUN:-1}"

if [[ -z "${INGEST_WORKER_SECRET:-}" && -n "${WORKER_ENV_FILE:-}" ]]; then
  INGEST_WORKER_SECRET="$(grep -E '^INGEST_WORKER_SECRET=' "$WORKER_ENV_FILE" | head -1 | cut -d= -f2-)"
fi
: "${INGEST_WORKER_SECRET:?Set INGEST_WORKER_SECRET or WORKER_ENV_FILE}"

exec 9>/tmp/nolimitflix-cleanup-mp4.lock
flock -n 9 || { echo "cleanup-mp4 already running"; exit 0; }

dry_json=true
[[ "$DRY_RUN" == "0" ]] && dry_json=false
echo "dryRun=$dry_json"

offset=0
while true; do
  response="$(curl -fsS --max-time 600 -X POST "$WORKER_URL/cleanup-mp4" \
    -H "Authorization: Bearer $INGEST_WORKER_SECRET" \
    -H 'Content-Type: application/json' \
    -d "{\"limit\": $BATCH_SIZE, \"offset\": $offset, \"dryRun\": $dry_json}")"
  echo "$(date -Is) $response"

  more="$(printf '%s' "$response" | grep -o '"moreRemaining":[a-z]*' | cut -d: -f2)"
  offset="$(printf '%s' "$response" | grep -o '"nextOffset":[0-9]*' | cut -d: -f2)"
  [[ "$more" == "true" ]] || break
done
echo "$(date -Is) done"
