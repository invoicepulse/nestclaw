#!/bin/bash
# wake-container.sh — Called by the API when a user tries to access a stopped container
# Usage: ./wake-container.sh <subdomain>
# Returns JSON with status

SUBDOMAIN=$1
CONTAINER_NAME="nestclaw_${SUBDOMAIN}"

if [ -z "$SUBDOMAIN" ]; then
  echo '{"error": "Usage: wake-container.sh <subdomain>"}'
  exit 1
fi

# Check if container exists
if ! docker inspect "$CONTAINER_NAME" &>/dev/null; then
  echo '{"error": "Container not found"}'
  exit 1
fi

# Check current state
STATE=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null)

case "$STATE" in
  "running")
    echo '{"status": "already_running", "wake_time_ms": 0}'
    ;;
  "exited"|"stopped")
    START_TIME=$(date +%s%N)
    docker start "$CONTAINER_NAME" >/dev/null 2>&1
    # Wait for ttyd to be ready (max 10 seconds)
    for i in $(seq 1 20); do
      TERMINAL_PORT=$(docker port "$CONTAINER_NAME" 7681 2>/dev/null | grep -oP '\d+$')
      if [ -n "$TERMINAL_PORT" ] && curl -s -o /dev/null -w "%{http_code}" "http://localhost:${TERMINAL_PORT}" 2>/dev/null | grep -q "200"; then
        END_TIME=$(date +%s%N)
        WAKE_MS=$(( (END_TIME - START_TIME) / 1000000 ))
        # Update activity timestamp
        date +%s > "/opt/nestclaw/data/${SUBDOMAIN}/.last_activity"
        echo "{\"status\": \"started\", \"wake_time_ms\": ${WAKE_MS}}"
        exit 0
      fi
      sleep 0.5
    done
    echo '{"status": "started", "wake_time_ms": 10000}'
    ;;
  "paused")
    docker unpause "$CONTAINER_NAME" >/dev/null 2>&1
    date +%s > "/opt/nestclaw/data/${SUBDOMAIN}/.last_activity"
    echo '{"status": "unpaused", "wake_time_ms": 100}'
    ;;
  *)
    echo "{\"error\": \"Unknown state: ${STATE}\"}"
    exit 1
    ;;
esac
