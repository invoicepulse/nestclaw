#!/bin/bash
# Start OpenClaw Gateway with logging
openclaw gateway --port 18789 > /tmp/openclaw-gateway.log 2>&1 &
GATEWAY_PID=$!
sleep 3

# Check if gateway actually started
if kill -0 $GATEWAY_PID 2>/dev/null; then
    echo "Gateway started (PID: $GATEWAY_PID)"
else
    echo "Gateway failed to start. Log:"
    cat /tmp/openclaw-gateway.log
fi

echo ""
echo "Run: openclaw setup --wizard   (first time)"
echo "Run: openclaw                  (to chat)"
echo ""

exec ttyd -p 7681 -W bash
