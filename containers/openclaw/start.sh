#!/bin/bash
# Run initial setup (non-interactive, just creates config dirs)
openclaw setup > /dev/null 2>&1

# Now start gateway - config exists so no conflict
openclaw gateway --port 18789 --allow-unconfigured > /tmp/openclaw-gateway.log 2>&1 &
sleep 3

if kill -0 $! 2>/dev/null; then
    echo "Gateway ready. Run: openclaw setup --wizard"
else
    echo "Gateway log: $(cat /tmp/openclaw-gateway.log)"
fi

exec ttyd -p 7681 -W bash
