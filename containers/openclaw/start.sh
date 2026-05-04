#!/bin/bash
# Run initial setup
openclaw setup > /dev/null 2>&1

# Supervisor loop - keeps gateway alive even after crashes
(
  while true; do
    openclaw gateway --port 18789 --allow-unconfigured >> /tmp/openclaw-gateway.log 2>&1
    echo "[$(date)] Gateway exited, restarting in 3s..." >> /tmp/openclaw-gateway.log
    sleep 3
  done
) &

sleep 5
echo ""
echo "=========================================="
echo "  OpenClaw Ready!"
echo ""
echo "  First time: openclaw onboard"
echo "  Then chat:  openclaw tui"
echo "=========================================="
echo ""

exec ttyd -p 7681 -W bash
