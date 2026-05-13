FROM node:20-slim

# Chrome dependencies for agent-browser
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates fonts-liberation \
    libappindicator3-1 libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 \
    libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxrandr2 xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Core tools
RUN npm install -g @anthropic-ai/claude-code agent-browser

# Download Chrome for agent-browser
RUN agent-browser install

# Local MCP packages (space-separated list injected at build time)
ARG MCP_PACKAGES=""
RUN if [ -n "$MCP_PACKAGES" ]; then npm install -g $MCP_PACKAGES; fi

WORKDIR /workspace
ENTRYPOINT []
CMD ["claude", "--dangerously-skip-permissions"]
