#!/bin/bash
# Fix ownership of .openclaw directory if it exists
if [ -d ~/.openclaw ]; then
    # If we can't write to it, it's owned by root - need to fix via docker exec
    if [ ! -w ~/.openclaw ]; then
        echo "Warning: .openclaw directory has wrong ownership. Please run: docker exec -u root <container> chown -R agent:agent /home/agent/.openclaw"
    fi
fi
echo "OpenClaw is installed. Run 'openclaw configure' to get started."
exec ttyd -p 7681 -W bash
