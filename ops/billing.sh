#!/usr/bin/env bash
# Vendor billing (tracker S4.24). The API issues invoices every night at 00:30 India time; this script runs it by hand,
# lists what is unpaid, and records UPI or bank payments.
#
#   API_BASE=https://api.suprmama.in ADMIN_TOKEN='…' ops/billing.sh due
#   … ops/billing.sh paid SMV/26-27/000012 "UPI 412345678901"   # also SMC/… GST statements (pay-at-stall orders)
#   … ops/billing.sh run [yyyy-mm-dd]        # safe to repeat; a date issues what is due by that day
#
# Needs curl and jq.
set -euo pipefail

usage() { echo "usage: API_BASE=<api url> ADMIN_TOKEN=<token> $0 due | paid <invoice-number> \"<reference>\" | run [yyyy-mm-dd]" >&2; exit 2; }
[ -n "${API_BASE:-}" ] && [ -n "${ADMIN_TOKEN:-}" ] || usage
base="${API_BASE%/}/api/admin/billing"

# The token goes to curl on a file descriptor, so it never appears in the process list.
call() {
  local response status
  response=$(curl -sS -w '\n%{http_code}' -H @<(printf 'X-Admin-Token: %s\n' "$ADMIN_TOKEN") "$@")
  status=${response##*$'\n'}
  body=${response%$'\n'*}
  if [ "$status" != 200 ]; then
    echo "failed ($status): $(jq -r '.error // .' <<<"$body" 2>/dev/null || echo "$body")" >&2
    exit 1
  fi
}

case "${1:-}" in
  due)
    call "$base/due"
    if [ "$(jq length <<<"$body")" = 0 ]; then echo "Nothing unpaid."; exit 0; fi
    jq -r '.[] | "\(.number)  ₹\(.total)  due \(.dueOn)  \(.stall) · \(.mobile // "-")  \(.plan) \(.period)"' <<<"$body"
    jq -r '"Total unpaid: ₹\(map(.total) | add)"' <<<"$body"
    ;;
  paid)
    [ $# -eq 3 ] || usage
    call -X POST "$base/paid" -H 'Content-Type: application/json' --data "$(jq -n --arg n "$2" --arg r "$3" '{number: $n, ref: $r}')"
    jq -r '"Marked \(.number) paid (₹\(.total))."' <<<"$body"
    ;;
  run)
    [ $# -le 2 ] || usage
    if [ $# -eq 2 ]; then call -X POST -G "$base/run" --data-urlencode "date=$2"; else call -X POST "$base/run"; fi
    jq -r '"Billing run for \(.date): \(.issued) invoice(s) issued."' <<<"$body"
    ;;
  *) usage ;;
esac
