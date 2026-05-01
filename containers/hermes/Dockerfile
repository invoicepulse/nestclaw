FROM python:3.11-slim
RUN apt-get update && apt-get install -y curl bash git nodejs npm && rm -rf /var/lib/apt/lists/*
RUN curl -sL https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64 -o /usr/local/bin/ttyd && chmod +x /usr/local/bin/ttyd
RUN pip install --no-cache-dir hermes-agent || echo 'hermes-agent not on PyPI yet - install manually'
RUN pip install --no-cache-dir hermes-webui || pip install --no-cache-dir git+https://github.com/nesquena/hermes-webui.git || echo 'hermes-webui install deferred'
RUN useradd -m -s /bin/bash agent
WORKDIR /home/agent
COPY start.sh /start.sh
RUN chmod +x /start.sh
EXPOSE 7681 5000
CMD ["/start.sh"]
