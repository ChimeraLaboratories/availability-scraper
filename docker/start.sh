#!/bin/bash
set -e

export PORT=${PORT:-3004}

mkdir -p /app/data

echo "Starting scraper app on port ${PORT}..."
exec node /app/dist/server.js
