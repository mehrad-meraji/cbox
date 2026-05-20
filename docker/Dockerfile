FROM node:20-bookworm-slim

# System Chromium + dependencies (works on both x86_64 and ARM64)
RUN apt-get update && apt-get install -y \
    chromium wget gnupg ca-certificates fonts-liberation \
    libappindicator3-1 libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 \
    libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxrandr2 xdg-utils \
    git curl unzip \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun && \
    ln -s /root/.bun/bin/bunx /usr/local/bin/bunx

# Install global tools as root so they land in /usr/local/bin
RUN npm install -g @anthropic-ai/claude-code agent-browser

# Local MCP packages (space-separated list injected at build time)
ARG MCP_PACKAGES=""
RUN if [ -n "$MCP_PACKAGES" ]; then npm install -g $MCP_PACKAGES; fi

# Point agent-browser at system Chromium (avoids arch-specific Chrome for Testing)
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# node:20 base image ships a 'node' user at UID 1000 — use it directly
# claude --dangerously-skip-permissions refuses to run as root
RUN mkdir -p /workspace && chown node:node /workspace

USER node
WORKDIR /workspace
ENTRYPOINT []
CMD ["claude", "--dangerously-skip-permissions"]
