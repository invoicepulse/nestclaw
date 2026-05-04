#!/bin/bash
echo "Starting OpenClaw Gateway..."
openclaw gateway run &
GATEWAY_PID=$!
sleep 3
echo "OpenClaw Gateway running (PID: $GATEWAY_PID)"
echo "Run 'openclaw configure' to set up your API keys, then 'openclaw' to start chatting."
exec ttyd -p 7681 -W bash
