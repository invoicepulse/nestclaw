FROM node:22-slim
RUN apt-get update && apt-get install -y curl bash git && rm -rf /var/lib/apt/lists/*
RUN curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /usr/local/bin/ttyd && chmod +x /usr/local/bin/ttyd

# Install OpenClaw globally
RUN npm install -g openclaw

# Install Composio for integrations
RUN npm install -g composio-core

RUN useradd -m -s /bin/bash agent

COPY start.sh /start.sh
RUN chmod +x /start.sh

USER agent
WORKDIR /home/agent

# Create config directory as agent user (not root)
RUN mkdir -p /home/agent/.openclaw

EXPOSE 7681
CMD ["/start.sh"]
