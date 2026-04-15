#!/bin/bash
set -e

mkdir -p /tmp/.X11-unix
mkdir -p /app/data/browser-profile

Xvfb :99 -screen 0 1440x900x24 &
fluxbox &
x11vnc -display :99 -forever -shared -rfbport 5900 -nopw &
websockify --web=/usr/share/novnc/ 6080 localhost:5900 &

npm run dev