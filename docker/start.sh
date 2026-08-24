#!/bin/bash
set -e

export DISPLAY=:99
export PORT=${PORT:-3004}
export BROWSER_PROFILE_DIR=${BROWSER_PROFILE_DIR:-/app/data/browser-profile}

mkdir -p /tmp/.X11-unix
mkdir -p /app/data/browser-profile

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
x11vnc -display :99 -forever -shared -rfbport 5900 &
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &

echo "Starting app on port ${PORT}..."
exec node /app/dist/server.js
