#!/bin/bash
SUBDOMAIN=$1
CONTAINER_NAME="nestclaw_${SUBDOMAIN}"
DATA_DIR="/opt/nestclaw/data/${SUBDOMAIN}"

docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

if [ "$2" = "--force" ]; then
  rm -rf "$DATA_DIR"
fi

echo '{"success": true}'
