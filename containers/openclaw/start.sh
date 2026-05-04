#!/bin/bash
# Delete any existing config to prevent ConfigMutationConflictError
rm -f /home/agent/.openclaw/openclaw.json

# Run initial setup to create fresh config
openclaw setup > /dev/null 2>&1

# Start gateway - it will stay running
openclaw gateway --port 18789 --allow-unconfigured > /tmp/openclaw-gateway.log 2>&1 &

sleep 3
echo "Gateway ready. Run: openclaw setup --wizard"

exec ttyd -p 7681 -W bash
