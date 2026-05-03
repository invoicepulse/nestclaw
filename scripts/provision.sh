#!/bin/bash
set -e

USER_ID=$1
SUBDOMAIN=$2
AGENT_TYPE=$3
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$USER_ID" ] || [ -z "$SUBDOMAIN" ] || [ -z "$AGENT_TYPE" ]; then
  echo '{"error": "Usage: provision.sh <user_id> <subdomain> <agent_type>"}'
  exit 1
fi

CONTAINER_NAME="nestclaw_${SUBDOMAIN}"
VOLUME_NAME="nestclaw_data_${SUBDOMAIN}"

if docker inspect "$CONTAINER_NAME" &>/dev/null; then
  echo "{\"error\": \"Container ${CONTAINER_NAME} already exists\"}"
  exit 1
fi

# Find free port - simple approach using seq and checking with ss
find_port() {
  local START=$1 END=$2
  for port in $(seq "$START" "$END"); do
    if ! ss -tlnp 2>/dev/null | grep -q ":${port} "; then
      echo "$port"
      return 0
    fi
  done
  echo "0"
  return 1
}

TERMINAL_PORT=$(find_port 10000 19999)
WEBUI_PORT=""

if [ "$AGENT_TYPE" = "hermes" ]; then
  WEBUI_PORT=$(find_port 20000 29999)
fi

# Docker will create the volume directory with correct ownership
IMAGE="nestclaw/${AGENT_TYPE}:latest"

if [ "$AGENT_TYPE" = "hermes" ]; then
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --cpus="1" --memory="4g" \
    --network nestclaw_net \
    -p "${TERMINAL_PORT}:7681" \
    -p "${WEBUI_PORT}:5000" \
    -v "${VOLUME_NAME}:/home/agent/.hermes" \
    --label "nestclaw.user_id=${USER_ID}" \
    --label "nestclaw.subdomain=${SUBDOMAIN}" \
    "$IMAGE" >/dev/null
else
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --cpus="1" --memory="4g" \
    --network nestclaw_net \
    -p "${TERMINAL_PORT}:7681" \
    -v "${VOLUME_NAME}:/home/agent/.openclaw" \
    --label "nestclaw.user_id=${USER_ID}" \
    --label "nestclaw.subdomain=${SUBDOMAIN}" \
    "$IMAGE" >/dev/null
fi

echo "{\"terminal_port\": ${TERMINAL_PORT}, \"webui_port\": ${WEBUI_PORT:-null}, \"container_name\": \"${CONTAINER_NAME}\"}"
