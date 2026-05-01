FROM node:22-slim
RUN apt-get update && apt-get install -y curl bash && rm -rf /var/lib/apt/lists/*
RUN curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /usr/local/bin/ttyd && chmod +x /usr/local/bin/ttyd
RUN npm install -g @anthropic-ai/claude-code composio-core
RUN useradd -m -s /bin/bash agent
WORKDIR /home/agent
COPY start.sh /start.sh
RUN chmod +x /start.sh
USER agent
EXPOSE 7681
CMD ["/start.sh"]
