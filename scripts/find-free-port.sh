#!/bin/bash
START_PORT=${1:-10000}
END_PORT=${2:-19999}
for port in $(seq "$START_PORT" "$END_PORT"); do
  if ! ss -tlnp | grep -q ":${port} "; then
    echo "$port"
    exit 0
  fi
done
echo "No free port found in range ${START_PORT}-${END_PORT}" >&2
exit 1
