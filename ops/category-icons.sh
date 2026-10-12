#!/usr/bin/env bash
# Icons for the shared category list (tracker S2.20). New categories get an icon drawn by Claude in the background;
# this checks them, draws one again, or takes a bad one down (the generic plate comes back).
#
#   API_BASE=https://api.suprmama.in ADMIN_TOKEN='…' ops/category-icons.sh list
#   … ops/category-icons.sh regenerate "Mini Rice Bowl"     # waits up to a minute for the drawing
#   … ops/category-icons.sh reject "Mini Rice Bowl"
#
# Needs curl and jq. The icon is at $API_BASE/category-art/<key>.svg?ink=<hex> (the vendor's dark colour).
set -euo pipefail

usage() { echo "usage: API_BASE=<api url> ADMIN_TOKEN=<token> $0 list | regenerate \"<name>\" | reject \"<name>\"" >&2; exit 2; }
[ $# -ge 1 ] && [ -n "${API_BASE:-}" ] && [ -n "${ADMIN_TOKEN:-}" ] || usage
base="${API_BASE%/}/api/admin/category-art"

# The token goes to curl on a file descriptor, so it never appears in the process list.
call() {
  local response status
  response=$(curl -sS --max-time 180 -w '\n%{http_code}' -H @<(printf 'X-Admin-Token: %s\n' "$ADMIN_TOKEN") "$@")
  status=${response##*$'\n'}
  body=${response%$'\n'*}
  if [ "$status" != 200 ]; then
    echo "failed ($status): $(jq -r '.error // .' <<<"$body" 2>/dev/null || echo "$body")" >&2
    exit 1
  fi
}

case "$1" in
  list)
    call "$base"
    jq -r '.[] | "\(.status | .[0:8] | . + "        " | .[0:8])  \(.name)\(if .error then "   (" + .error + ")" else "" end)"' <<<"$body"
    ;;
  regenerate)
    [ $# -eq 2 ] || usage
    call -X POST "$base/regenerate" -H 'Content-Type: application/json' --data "$(jq -n --arg n "$2" '{name: $n}')"
    jq -r '"\(.name): \(.status)"' <<<"$body"
    ;;
  reject)
    [ $# -eq 2 ] || usage
    call -X POST "$base/reject" -H 'Content-Type: application/json' --data "$(jq -n --arg n "$2" '{name: $n}')"
    jq -r '"\(.name): icon taken down, the generic plate is back"' <<<"$body"
    ;;
  *) usage ;;
esac
