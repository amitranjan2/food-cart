#!/usr/bin/env bash
# Login-code delivery over WhatsApp (tracker N3), from Meta's delivery webhook.
#
#   API_BASE=https://api.suprmama.in ADMIN_TOKEN='…' ops/whatsapp-stats.sh            # last 7 days
#   API_BASE=… ADMIN_TOKEN='…' ops/whatsapp-stats.sh 30                               # last 30 days
#   API_BASE=… ADMIN_TOKEN='…' ops/whatsapp-stats.sh lookup 9876543210                # "my code never came"
#
# Needs curl and jq. Records are kept 30 days.
set -euo pipefail

if [ -z "${API_BASE:-}" ] || [ -z "${ADMIN_TOKEN:-}" ]; then
  echo "usage: API_BASE=<api url> ADMIN_TOKEN=<token> $0 [days | lookup <mobile>]" >&2
  exit 2
fi

call() { # path, then curl -G data arguments
  local path=$1; shift
  # The token goes to curl on a file descriptor, so it never appears in the process list.
  response=$(curl -sS -G -w '\n%{http_code}' -H @<(printf 'X-Admin-Token: %s\n' "$ADMIN_TOKEN") "${API_BASE%/}$path" "$@")
  status=${response##*$'\n'}
  body=${response%$'\n'*}
  if [ "$status" != 200 ]; then
    echo "failed ($status): $(jq -r '.error // .' <<<"$body" 2>/dev/null || echo "$body")" >&2
    exit 1
  fi
}

if [ "${1:-}" = lookup ]; then
  [ $# -eq 2 ] || { echo "usage: $0 lookup <mobile>" >&2; exit 2; }
  call /api/admin/whatsapp/messages --data-urlencode "mobile=$2"
  jq -r '"Last codes sent to \(.mobile) (times in UTC; India is +5:30):",
    (if (.messages | length) == 0 then "  none in the last 30 days" else
      (.messages[] | "  \(.sentAt)  \(.status)" + (if .errorCode then "  (Meta \(.errorCode): \(.errorTitle))" else "" end)) end)' <<<"$body"
  exit 0
fi

days=${1:-7}
call /api/admin/whatsapp/stats --data-urlencode "days=$days"
jq -r '
  def pct: if . == null then "-" else "\(.)%" end;
  "Login codes, last \(.days) days: \(.total.sent) sent, \(.total.delivered) delivered (\(.total.deliveredPercent | pct)), \(.total.read) read, \(.total.failed) failed, \(.total.pending) no answer yet",
  "",
  "day         sent  delivered  read  failed  pending",
  (.byDay[] | "\(.day)  \(.sent|tostring|.[0:5]|(" " * (4 - length)) + .)  \(.delivered|tostring|(" " * (9 - length)) + .)  \(.read|tostring|(" " * (4 - length)) + .)  \(.failed|tostring|(" " * (6 - length)) + .)  \(.pending|tostring|(" " * (7 - length)) + .)"),
  (if (.failures | length) > 0 then "", "Why codes failed (Meta error code):", (.failures | to_entries[] | "  \(.value) × \(.key)") else empty end)' <<<"$body"
