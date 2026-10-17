#!/usr/bin/env bash
# Creates a stall account. The vendor then signs in to the vendor app with this mobile number (WhatsApp code) and
# sets location, colours and opening hours in Settings; customers can't order until hours are set.
#
#   API_BASE=https://api.suprmama.in ADMIN_TOKEN='…' ops/create-vendor.sh "Raju Momos" 9876543210 [raju-momos]
#
# The store link (third argument) defaults to one made from the name. Needs curl and jq. Keep ADMIN_TOKEN in a
# password manager and pass it through the environment, never as an argument (arguments show up in `ps`).
set -euo pipefail

if [ $# -lt 2 ] || [ $# -gt 3 ] || [ -z "${API_BASE:-}" ] || [ -z "${ADMIN_TOKEN:-}" ]; then
  echo "usage: API_BASE=<api url> ADMIN_TOKEN=<token> $0 <business name> <10-digit mobile> [store-link]" >&2
  exit 2
fi

body=$(jq -n --arg name "$1" --arg mobile "$2" --arg slug "${3:-}" '{name: $name, mobile: $mobile, slug: (if $slug == "" then null else $slug end)}')
# The token goes to curl on a file descriptor, so it never appears in the process list.
response=$(curl -sS -w '\n%{http_code}' -X POST "${API_BASE%/}/api/admin/vendors" \
  -H 'Content-Type: application/json' -H @<(printf 'X-Admin-Token: %s\n' "$ADMIN_TOKEN") --data "$body")
status=${response##*$'\n'}
json=${response%$'\n'*}

if [ "$status" != 201 ]; then
  echo "failed ($status): $(jq -r '.error // .' <<<"$json" 2>/dev/null || echo "$json")" >&2
  exit 1
fi
jq -r '"Created \(.name) for \(.mobile)\nStore    \(.storeUrl)\nNext     the vendor signs in with \(.mobile) and fills Settings (location, colours, hours)."' <<<"$json"
