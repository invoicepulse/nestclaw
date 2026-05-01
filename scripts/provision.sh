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
DATA_DIR="/opt/nestclaw/data/${SUBDOMAIN}"

if docker inspect "$CONTAINER_NAME" &>/dev/null; then
  echo "{\"error\": \"Container ${CONTAINER_NAME} already exists\"}"
  exit 1
fi

TERMINAL_PORT=$("$SCRIPT_DIR/find-free-port.sh" 10000 19999)
WEBUI_PORT=""

if [ "$AGENT_TYPE" = "hermes" ]; then
  WEBUI_PORT=$("$SCRIPT_DIR/find-free-port.sh" 20000 29999)
fi

mkdir -p "$DATA_DIR"
IMAGE="nestclaw/${AGENT_TYPE}:latest"

if [ "$AGENT_TYPE" = "hermes" ]; then
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --cpus="1" --memory="4g" \
    --network nestclaw_net \
    -p "${TERMINAL_PORT}:7681" \
    -p "${WEBUI_PORT}:5000" \
    -v "${DATA_DIR}:/home/agent/.hermes" \
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
    -v "${DATA_DIR}:/home/agent/.openclaw" \
    --label "nestclaw.user_id=${USER_ID}" \
    --label "nestclaw.subdomain=${SUBDOMAIN}" \
    "$IMAGE" >/dev/null
fi

echo "{\"terminal_port\": ${TERMINAL_PORT}, \"webui_port\": ${WEBUI_PORT:-null}, \"container_name\": \"${CONTAINER_NAME}\"}"
