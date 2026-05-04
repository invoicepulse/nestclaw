#!/bin/bash
# Rebuild OpenClaw image with latest version

cd /opt/nestclaw
git pull origin main
docker build --no-cache -t nestclaw/openclaw:latest containers/openclaw/
echo "OpenClaw image rebuilt. Version:"
docker run --rm nestclaw/openclaw:latest openclaw --version
