#!/bin/bash
# Run OpenClaw Gateway in background (container mode - no systemd)
openclaw gateway --port 18789 &
sleep 2

echo ""
echo "=========================================="
echo "  OpenClaw is ready!"
echo "  Run: openclaw setup   (first time only)"
echo "  Run: openclaw         (to chat)"
echo "=========================================="
echo ""

exec ttyd -p 7681 -W bash
