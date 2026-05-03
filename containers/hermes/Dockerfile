FROM python:3.11-slim
RUN apt-get update && apt-get install -y curl bash git && rm -rf /var/lib/apt/lists/*
RUN curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /usr/local/bin/ttyd && chmod +x /usr/local/bin/ttyd

# Install Hermes using official installer
RUN curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

RUN useradd -m -s /bin/bash agent
WORKDIR /home/agent

# Create config directory
RUN mkdir -p /home/agent/.hermes && chown -R agent:agent /home/agent

COPY start.sh /start.sh
RUN chmod +x /start.sh

USER agent
EXPOSE 7681 5000
CMD ["/start.sh"]
