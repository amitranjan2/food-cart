/** Same rule as the API's StoreSlugs.fromName: "Raju's Momos & Rolls" → "rajus-momos-rolls". */
export function linkFromName(name: string) {
  const plain = name.normalize('NFD').replace(/\p{M}/gu, '');
  const link = plain.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return link.length > 40 ? link.slice(0, 40).replace(/-+$/, '') : link;
}

/** Self sign-ups start with a placeholder link ("new-…") until they pick theirs. */
export function isPlaceholderLink(slug?: string | null) {
  return !slug || slug.startsWith('new-');
}
