FROM mcr.microsoft.com/playwright:v1.59.1-jammy

RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    xvfb \
    x11-utils \
    fluxbox \
    x11vnc \
    novnc \
    websockify \
    ca-certificates \
    tzdata \
 && rm -rf /var/lib/apt/lists/*

RUN npx playwright install chromium

ENV DISPLAY=:99
ENV BROWSER_PROFILE_DIR=/browser-profile
ENV CDP_PORT=9222
ENV VNC_PORT=5900
ENV NOVNC_PORT=6080

RUN mkdir -p /browser-profile /tmp/.X11-unix

COPY docker/browser/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 5900 6080 9222

CMD ["/start.sh"]
