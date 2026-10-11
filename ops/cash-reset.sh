#!/usr/bin/env bash
# Turns pay at the stall back on for a customer's number after 2 orders were marked as not collected (tracker S2.19).
# Check with the stall first that the no-shows were a misunderstanding, then:
#
#   API_BASE=https://api.suprmama.in ADMIN_TOKEN='…' ops/cash-reset.sh 9876543210
#
# Needs curl and jq.
set -euo pipefail

if [ $# -ne 1 ] || [ -z "${API_BASE:-}" ] || [ -z "${ADMIN_TOKEN:-}" ]; then
  echo "usage: API_BASE=<api url> ADMIN_TOKEN=<token> $0 <customer mobile>" >&2
  exit 2
fi

# The token goes to curl on a file descriptor, so it never appears in the process list.
response=$(curl -sS -w '\n%{http_code}' -H @<(printf 'X-Admin-Token: %s\n' "$ADMIN_TOKEN") -H 'Content-Type: application/json' \
  -X POST "${API_BASE%/}/api/admin/customers/cash-reset" --data "$(jq -n --arg m "$1" '{mobile: $m}')")
status=${response##*$'\n'}
body=${response%$'\n'*}
if [ "$status" != 200 ]; then
  echo "failed ($status): $(jq -r '.error // .' <<<"$body" 2>/dev/null || echo "$body")" >&2
  exit 1
fi
jq -r '"Pay at the stall is back on for \(.mobile) (\(.noShowsCleared) not-collected orders cleared)."' <<<"$body"
