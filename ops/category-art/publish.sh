#!/usr/bin/env bash
# Publishes an approved category icon: normalises it, copies it into the backend's static files and points the
# category at it. Commit the copied SVG and deploy the backend afterwards. See README.md.
#
#   MONGODB_URI='mongodb+srv://…' ops/category-art/publish.sh "Mini Rice Bowl" mini-rice-bowl.svg
#
# Needs node 18+ and mongosh, and write access to the catalogCategories collection.
set -euo pipefail

if [ $# -ne 2 ] || [ -z "${MONGODB_URI:-}" ]; then
  echo "usage: MONGODB_URI=<connection string> $0 \"<category name>\" <icon.svg>" >&2
  exit 2
fi
here="$(cd "$(dirname "$0")" && pwd)"
static="$here/../../backend/src/main/resources/static/category-art"

# The category's key names the file, so "Mini Rice Bowl" and "mini rice bowls" share one icon.
key="$(CATEGORY_NAME="$1" mongosh "$MONGODB_URI" --quiet --eval '
  const wanted = process.env.CATEGORY_NAME.trim().toLowerCase();
  const found = db.catalogCategories.find({}, { name: 1, nameKey: 1 }).toArray().filter(c => (c.name || "").toLowerCase() === wanted);
  if (found.length !== 1 || !found[0].nameKey) { print("NOT_FOUND"); quit(0); }
  print(found[0].nameKey);
')"
if [ "$key" = "NOT_FOUND" ] || ! printf '%s' "$key" | grep -Eq '^[[:alnum:]]+$'; then
  echo "No category called \"$1\" (check the exact name in the vendor app)." >&2
  exit 1
fi

mkdir -p "$static"
node "$here/normalize-svg.mjs" "$2" "$static/$key.svg"

CATEGORY_KEY="$key" mongosh "$MONGODB_URI" --quiet --eval '
  const key = process.env.CATEGORY_KEY;
  const result = db.catalogCategories.updateOne({ nameKey: key }, { $set: { imageUrl: "/category-art/" + key + ".svg" } });
  print(result.modifiedCount === 1 ? "imageUrl set to /category-art/" + key + ".svg" : "imageUrl already set");
'
echo "Next: commit backend/src/main/resources/static/category-art/$key.svg and deploy the backend."
