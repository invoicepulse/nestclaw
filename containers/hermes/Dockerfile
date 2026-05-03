FROM python:3.11-slim
RUN apt-get update && apt-get install -y curl bash git nodejs npm && rm -rf /var/lib/apt/lists/*
RUN curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /usr/local/bin/ttyd && chmod +x /usr/local/bin/ttyd

# Install Hermes (if available on PyPI, otherwise from git)
RUN pip install --no-cache-dir hermes-ai || \
    pip install --no-cache-dir git+https://github.com/hermes-ai/hermes.git || \
    echo "Hermes not available - will provide manual setup instructions"

RUN useradd -m -s /bin/bash agent
WORKDIR /home/agent

# Create config directory
RUN mkdir -p /home/agent/.hermes && chown -R agent:agent /home/agent

COPY start.sh /start.sh
RUN chmod +x /start.sh

USER agent
EXPOSE 7681 5000
CMD ["/start.sh"]
