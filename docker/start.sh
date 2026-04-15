#!/bin/bash
set -e

export DISPLAY=:99
export PORT=${PORT:-3001}
export BROWSER_PROFILE_DIR=${BROWSER_PROFILE_DIR:-/app/data/browser-profile}

mkdir -p /tmp/.X11-unix
mkdir -p /app/data/browser-profile

Xvfb :99 -screen 0 1920x1080x24 &
fluxbox &
x11vnc -display :99 -forever -shared -rfbport 5900 &
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &

echo "Starting app on port ${PORT}..."
exec npm run dev