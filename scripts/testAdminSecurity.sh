#!/bin/bash

set -e

BASE_URL="${BASE_URL:-http://localhost:3004}"

check_status() {
  local description="$1"
  local expected="$2"
  shift 2

  local status

  status=$(
    curl       -s       -o /dev/null       -w "%{http_code}"       "$@"
  )

  if [ "$status" != "$expected" ]; then
    echo "FAIL: $description returned $status (expected $expected)"
    exit 1
  fi

  echo "PASS: $description"
}

echo "Testing public surfaces..."

check_status   "dashboard public"   "200"   "$BASE_URL/api/dashboard"

check_status   "admin page available"   "200"   "$BASE_URL/admin/"

check_status   "manual availability read public"   "200"   "$BASE_URL/api/manual-availability"

echo ""
echo "Testing protected admin surfaces..."

check_status   "browser endpoint protected"   "401"   "$BASE_URL/api/open-browser"

check_status   "admin diagnostics protected"   "401"   "$BASE_URL/api/admin/diagnostics"

check_status   "manual availability mutation protected"   "401"   -X PUT   "$BASE_URL/api/manual-availability/mecs"   -H 'Content-Type: application/json'   -d '{"nextAvailableDate":"2026-10-01","nextAvailableTime":"09:00"}'

check_status   "debug cookies protected"   "401"   "$BASE_URL/api/debug-cookies"

echo ""
echo "Testing invalid TOTP..."

STATUS=$(
  curl     -s     -o /dev/null     -w "%{http_code}"     -X POST     "$BASE_URL/api/admin/auth"     -H 'Content-Type: application/json'     -d '{"code":"000000"}'
)

if [ "$STATUS" != "401" ] &&
   [ "$STATUS" != "429" ]; then
  echo "FAIL: invalid login returned $STATUS"
  exit 1
fi

echo "PASS: invalid authentication rejected"

echo ""
echo "Admin security and console regression tests passed."
