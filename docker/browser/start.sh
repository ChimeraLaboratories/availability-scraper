#!/bin/bash
set -e

export DISPLAY=${DISPLAY:-:99}
export BROWSER_PROFILE_DIR=${BROWSER_PROFILE_DIR:-/browser-profile}
export CDP_PORT=${CDP_PORT:-9222}
export VNC_PORT=${VNC_PORT:-5900}
export NOVNC_PORT=${NOVNC_PORT:-6080}

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

fluxbox &
x11vnc -display :99 -forever -shared -rfbport "$VNC_PORT" &
websockify --web=/usr/share/novnc/ "$NOVNC_PORT" localhost:"$VNC_PORT" &

CHROMIUM="/ms-playwright/chromium-*/chrome-linux/chrome"
CHROMIUM_BIN=$(echo $CHROMIUM)

echo "Starting Chromium with CDP on port ${CDP_PORT}..."
exec "$CHROMIUM_BIN" \
    --user-data-dir="$BROWSER_PROFILE_DIR" \
    --remote-debugging-address=0.0.0.0 \
    --remote-debugging-port="$CDP_PORT" \
    --disable-blink-features=AutomationControlled \
    --no-sandbox \
    --disable-dev-shm-usage \
    --window-size=1280,720 \
    about:blank
