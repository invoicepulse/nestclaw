FROM node:22-slim
RUN apt-get update && apt-get install -y curl bash git && rm -rf /var/lib/apt/lists/*
RUN curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /usr/local/bin/ttyd && chmod +x /usr/local/bin/ttyd

# Install OpenClaw latest (2026.5.3+)
RUN npm install -g openclaw@latest

# Install Composio for integrations
RUN npm install -g composio-core

# Create user and set up home directory
RUN useradd -m -s /bin/bash agent && \
    mkdir -p /home/agent/.openclaw && \
    chown -R agent:agent /home/agent

COPY start.sh /start.sh
RUN chmod +x /start.sh && echo "v2"

USER agent
WORKDIR /home/agent

EXPOSE 7681
ENTRYPOINT ["/start.sh"]
