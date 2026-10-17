#!/usr/bin/env bash
# Reviews stalls that signed up themselves. Customers can't see a stall until it is approved.
#
#   API_BASE=https://api.suprmama.in ADMIN_TOKEN='…' ops/review-vendors.sh list
#   … ops/review-vendors.sh approve chotus-chai
#   … ops/review-vendors.sh changes chotus-chai "Add a clear photo of the stall front"
#
# Before approving: call the number, check the FSSAI number at foscos.fssai.gov.in, and that the payout account is in
# the stall's or owner's name. "changes" sends it back; the vendor sees the note in the app. Needs curl and jq.
set -euo pipefail

usage() { echo "usage: API_BASE=<api url> ADMIN_TOKEN=<token> $0 list | approve <stall-link> | changes <stall-link> \"<what to fix>\"" >&2; exit 2; }
[ -n "${API_BASE:-}" ] && [ -n "${ADMIN_TOKEN:-}" ] || usage
base="${API_BASE%/}/api/admin/vendors"

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
  list)
    call "$base/review"
    if [ "$(jq length <<<"$body")" = 0 ]; then echo "No stalls waiting for review."; exit 0; fi
    jq -r '.[] |
      "\(.name)  suprmama.in/\(.slug)\n  Mobile    \(.mobile)\n  Address   \(.address // "-")\n  Submitted \(.submittedAt)\n" +
      "  Steps     " + ([.steps[] | (if .done then "✓ " else "✗ " end) + .label] | join(" · ")) + "\n" +
      (if .business then
        "  FSSAI     \(.business.fssai // "-")\n  PAN       \(.business.pan // "-")\n  Payout    " +
        (if .business.payoutMethod == "UPI" then "UPI \(.business.upiId // "-")"
         elif .business.payoutMethod == "BANK" then "Bank \(.business.accountName // "-") · \(.business.accountNumber // "-") · \(.business.ifsc // "-")"
         else "-" end)
       else "  Business  not given" end) + "\n"' <<<"$body"
    ;;
  approve)
    [ $# -eq 2 ] || usage
    call -X POST "$base/$2/review" -H 'Content-Type: application/json' --data '{"approve":true}'
    jq -r '"Approved \(.name): live at \(.storeUrl)"' <<<"$body"
    ;;
  changes)
    [ $# -eq 3 ] || usage
    call -X POST "$base/$2/review" -H 'Content-Type: application/json' --data "$(jq -n --arg note "$3" '{approve: false, note: $note}')"
    jq -r '"Sent back to \(.name); they see your note in the app."' <<<"$body"
    ;;
  *) usage ;;
esac
