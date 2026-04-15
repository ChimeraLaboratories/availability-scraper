#!/bin/sh
set -eu

export DISPLAY=:99
export PORT="${PORT:-3004}"

echo "Cleaning old X files..."
rm -f /tmp/.X99-lock
rm -f /tmp/.X11-unix/X99 || true
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

echo "Killing stale processes..."
pkill -f "Xvfb :99" || true
pkill -f "fluxbox" || true
pkill -f "x11vnc" || true
pkill -f "websockify" || true
pkill -f "novnc" || true

echo "Starting Xvfb..."
Xvfb :99 -screen 0 1400x900x24 -ac +extension RANDR &
XVFB_PID=$!
sleep 2

echo "Starting fluxbox..."
fluxbox &
FLUXBOX_PID=$!
sleep 1

echo "Starting x11vnc..."
x11vnc -display :99 -forever -shared -rfbport 5900 -nopw -bg -o /tmp/x11vnc.log

echo "Checking x11vnc port..."
for i in 1 2 3 4 5; do
  if netstat -tulpn 2>/dev/null | grep -q ':5900 '; then
    echo "x11vnc is listening on 5900"
    break
  fi
  sleep 1
done

echo "Starting noVNC/websockify..."
websockify --web /usr/share/novnc 6080 localhost:5900 &
NOVNC_PID=$!
sleep 1

echo "Starting app on port ${PORT}..."
exec npm run dev