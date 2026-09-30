#!/bin/bash

set -e

BASE_URL="${BASE_URL:-http://localhost:3004}"

echo "Testing public dashboard..."

STATUS=$(
  curl \
    -s \
    -o /dev/null \
    -w "%{http_code}" \
    "$BASE_URL/api/dashboard"
)

if [ "$STATUS" != "200" ]; then
  echo "FAIL: dashboard returned $STATUS"
  exit 1
fi

echo "PASS: dashboard public"

echo "Testing protected browser endpoint..."

STATUS=$(
  curl \
    -s \
    -o /dev/null \
    -w "%{http_code}" \
    "$BASE_URL/api/open-browser"
)

if [ "$STATUS" != "401" ]; then
  echo "FAIL: open-browser returned $STATUS"
  exit 1
fi

echo "PASS: browser endpoint protected"

echo "Testing invalid TOTP..."

STATUS=$(
  curl \
    -s \
    -o /dev/null \
    -w "%{http_code}" \
    -X POST \
    "$BASE_URL/api/admin/auth" \
    -H 'Content-Type: application/json' \
    -d '{"code":"000000"}'
)

if [ "$STATUS" != "401" ] &&
   [ "$STATUS" != "429" ]; then
  echo "FAIL: invalid login returned $STATUS"
  exit 1
fi

echo "PASS: invalid authentication rejected"

echo ""
echo "Admin security smoke tests passed."