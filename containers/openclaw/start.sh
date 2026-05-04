#!/bin/bash
# Start OpenClaw Gateway in background
openclaw gateway run &
sleep 2

echo ""
echo "=========================================="
echo "  OpenClaw is ready!"
echo "  Run: openclaw setup   (first time)"
echo "  Run: openclaw         (to chat)"
echo "=========================================="
echo ""

exec ttyd -p 7681 -W bash
