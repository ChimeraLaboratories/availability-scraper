#!/bin/bash
set -e

export DISPLAY=${DISPLAY:-:99}
export BROWSER_PROFILE_DIR=${BROWSER_PROFILE_DIR:-/browser-profile}
export CDP_PORT=${CDP_PORT:-9222}
export CHROME_CDP_PORT=${CHROME_CDP_PORT:-9223}
export VNC_PORT=${VNC_PORT:-5900}
export NOVNC_PORT=${NOVNC_PORT:-6080}
export VNC_PASSWORD_FILE=${VNC_PASSWORD_FILE:-/vnc-auth/passwd}

mkdir -p /tmp/.X11-unix "$BROWSER_PROFILE_DIR"
rm -f /tmp/.X99-lock

Xvfb :99 -screen 0 1920x1080x24 &

echo "Waiting for X server..."
for i in $(seq 1 30); do
    if xdpyinfo -display :99 >/dev/null 2>&1; then
        echo "X server is ready."
        break
    fi

    if [ "$i" -eq 30 ]; then
        echo "X server failed to start."
        exit 1
    fi

    sleep 0.5
done

if [ ! -f "$VNC_PASSWORD_FILE" ]; then
  echo "VNC password file not found: $VNC_PASSWORD_FILE"
  exit 1
fi

fluxbox &
x11vnc -display :99 -forever -shared -localhost -rfbport "$VNC_PORT" -rfbauth "$VNC_PASSWORD_FILE" &
websockify --web=/usr/share/novnc/ "$NOVNC_PORT" localhost:"$VNC_PORT" &

CHROMIUM_BIN=$(find /ms-playwright -type f \( -name chrome -o -name chromium \) -path '*chromium*' -perm -111 2>/dev/null | head -n 1)

if [ -z "$CHROMIUM_BIN" ]; then
    echo "Could not locate Chromium executable under /ms-playwright."
    find /ms-playwright -maxdepth 4 -type f -perm -111 2>/dev/null | sort
    exit 1
fi

echo "Using Chromium executable: ${CHROMIUM_BIN}"
echo "Starting CDP reverse proxy on 0.0.0.0:${CDP_PORT} -> 127.0.0.1:${CHROME_CDP_PORT}..."
nginx

echo "Starting Chromium with private CDP on port ${CHROME_CDP_PORT}..."
exec "$CHROMIUM_BIN" \
    --user-data-dir="$BROWSER_PROFILE_DIR" \
    --remote-debugging-port="$CHROME_CDP_PORT" \
    --disable-blink-features=AutomationControlled \
    --no-sandbox \
    --disable-dev-shm-usage \
    --window-size=1280,720 \
    about:blank
