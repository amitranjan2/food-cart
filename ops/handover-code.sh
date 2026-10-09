#!/usr/bin/env bash
# Looks up an order's handover code for support, e.g. when the customer's phone died at the counter.
# Confirm you are talking to the customer (name and number below) before sharing the code with the vendor.
#
#   MONGODB_URI='mongodb+srv://…' ops/handover-code.sh raju-momos 1042
#
# Needs mongosh (https://www.mongodb.com/try/download/shell) and read access to the database.
set -euo pipefail

if [ $# -ne 2 ] || [ -z "${MONGODB_URI:-}" ]; then
  echo "usage: MONGODB_URI=<connection string> $0 <vendor-slug> <order-number>" >&2
  exit 2
fi
case "$2" in ''|*[!0-9]*) echo "order number must be digits" >&2; exit 2 ;; esac

# Arguments reach mongosh as environment variables, never as part of the script text.
VENDOR_SLUG="$1" ORDER_NUMBER="$2" mongosh "$MONGODB_URI" --quiet --eval '
  const vendor = db.vendors.findOne({ slug: process.env.VENDOR_SLUG });
  if (!vendor) { print("No vendor with that link name."); quit(1); }
  const number = parseInt(process.env.ORDER_NUMBER, 10);
  const order = db.orders.findOne({ vendorId: vendor._id.toString(), orderNumber: { $in: [number, NumberLong(process.env.ORDER_NUMBER)] } });
  if (!order) { print("No order #" + number + " at " + vendor.name + "."); quit(1); }
  print("Order    #" + order.orderNumber + " at " + vendor.name + " (" + order.status + ")");
  print("Customer " + (order.customerName || "-") + " · " + (order.customerMobile || "-"));
  if (!order.handover) print("Code     none yet: the vendor has not marked this order ready.");
  else if (order.handover.verifiedAt) print("Code     already used, handed over at " + order.handover.verifiedAt.toISOString());
  else print("Code     " + order.handover.code);
'
