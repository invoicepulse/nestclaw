#!/bin/bash
# Run initial setup
openclaw setup > /dev/null 2>&1

# Supervisor loop - force-kills stuck gateway before restart
(
  while true; do
    openclaw gateway --port 18789 --allow-unconfigured >> /tmp/openclaw-gateway.log 2>&1
    echo "[$(date)] Gateway exited or stuck, force-killing..." >> /tmp/openclaw-gateway.log
    pkill -9 -f "openclaw gateway" 2>/dev/null
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
