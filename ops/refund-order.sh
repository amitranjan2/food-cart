#!/usr/bin/env bash
# Cancels and fully refunds a paid order the stall can't make (a dish ran out, the gas finished). Vendors can't
# cancel once they accept, so this is support's job. Call the stall first, then:
#
#   API_BASE=https://api.suprmama.in ADMIN_TOKEN='…' ops/refund-order.sh raju-momos 1043 "Ran out of momos, confirmed on call"
#
# It shows the order and asks you to type the order number again before refunding. The reason is kept in the
# supportActions collection; the customer and the vendor don't see it. Needs curl and jq.
set -euo pipefail

if [ $# -ne 3 ] || [ -z "${API_BASE:-}" ] || [ -z "${ADMIN_TOKEN:-}" ]; then
  echo "usage: API_BASE=<api url> ADMIN_TOKEN=<token> $0 <stall-link> <order-number> \"<why>\"" >&2
  exit 2
fi
case "$2" in ''|*[!0-9]*) echo "order number must be digits" >&2; exit 2 ;; esac
base="${API_BASE%/}/api/admin/orders"

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

call -G "$base" --data-urlencode "slug=$1" --data-urlencode "number=$2"
jq -r '"Order    #\(.orderNumber) at \(.vendor) (\(.status), payment \(.payment))\nCustomer \(.customer // "-") · \(.mobile // "-")\nItems    \(.items | join(", "))\nTotal    ₹\(.total)"' <<<"$body"
if [ "$(jq -r .refundable <<<"$body")" != true ]; then
  echo "Can't refund: $(jq -r .why <<<"$body")" >&2
  exit 1
fi

read -r -p "Refund ₹$(jq -r .total <<<"$body") in full? Type the order number again to confirm: " again
if [ "$again" != "$2" ]; then
  echo "Not refunded." >&2
  exit 1
fi
call -X POST "$base/refund" -H 'Content-Type: application/json' \
  --data "$(jq -n --arg slug "$1" --argjson number "$2" --arg reason "$3" '{slug: $slug, orderNumber: $number, reason: $reason}')"
echo "Refunded: order #$2 is cancelled, payment $(jq -r .payment <<<"$body"). Tell the customer it reaches them in 3–5 business days."
