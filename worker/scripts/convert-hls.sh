#!/usr/bin/env bash
# Converts every MP4 movie still in the library to HLS by calling the worker's /convert-hls
# until it reports nothing remaining. Run on the server: the worker only listens on 127.0.0.1.
#
#   INGEST_WORKER_SECRET=... ./convert-hls.sh
#   WORKER_ENV_FILE=/path/to/worker/.env ./convert-hls.sh
set -euo pipefail

WORKER_URL="${WORKER_URL:-http://127.0.0.1:8080}"
BATCH_SIZE="${BATCH_SIZE:-3}"

if [[ -z "${INGEST_WORKER_SECRET:-}" && -n "${WORKER_ENV_FILE:-}" ]]; then
  INGEST_WORKER_SECRET="$(grep -E '^INGEST_WORKER_SECRET=' "$WORKER_ENV_FILE" | head -1 | cut -d= -f2-)"
fi
: "${INGEST_WORKER_SECRET:?Set INGEST_WORKER_SECRET or WORKER_ENV_FILE}"

# Cron can fire again while a long run is still going; only one conversion loop at a time.
exec 9>/tmp/nolimitflix-convert-hls.lock
flock -n 9 || { echo "convert-hls already running"; exit 0; }

offset=0
while true; do
  response="$(curl -fsS --max-time 3600 -X POST "$WORKER_URL/convert-hls" \
    -H "Authorization: Bearer $INGEST_WORKER_SECRET" \
    -H 'Content-Type: application/json' \
    -d "{\"limit\": $BATCH_SIZE, \"offset\": $offset}")"
  echo "$(date -Is) $response"

  more="$(printf '%s' "$response" | grep -o '"moreRemaining":[a-z]*' | cut -d: -f2)"
  offset="$(printf '%s' "$response" | grep -o '"nextOffset":[0-9]*' | cut -d: -f2)"
  [[ "$more" == "true" ]] || break
done
echo "$(date -Is) done"
