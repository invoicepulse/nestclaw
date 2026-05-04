#!/bin/bash
# Run initial setup to create config dirs
openclaw setup > /dev/null 2>&1

# Keep gateway running - restart if it dies (e.g. after config changes)
while true; do
    openclaw gateway --port 18789 --allow-unconfigured >> /tmp/openclaw-gateway.log 2>&1
    echo "[nestclaw] Gateway exited, restarting in 2s..."
    sleep 2
done &

sleep 3
echo "Gateway ready. Run: openclaw setup --wizard (first time) or openclaw (to chat)"

exec ttyd -p 7681 -W bash
