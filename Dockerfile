FROM mcr.microsoft.com/playwright:v1.59.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    xvfb \
    fluxbox \
    x11vnc \
    novnc \
    websockify \
    wget \
    gnupg \
    ca-certificates \
    tzdata \
 && rm -rf /var/lib/apt/lists/*

RUN npx playwright install chromium

ENV DISPLAY=:99
ENV PORT=3001
ENV BROWSER_PROFILE_DIR=/app/data/browser-profile

RUN mkdir -p /app/data/browser-profile
RUN mkdir -p /tmp/.X11-unix

COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 3001
EXPOSE 6080
EXPOSE 5900

CMD ["/start.sh"]