import type { MenuCategory } from '../types';

/** Same rule as the server's CategoryNames.key: case, spaces, punctuation and a plural ending don't matter. */
export function categoryKey(name: string) {
  const key = name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (key.length > 3 && key.endsWith('ies')) return key.slice(0, -3) + 'y';
  if (key.length > 3 && key.endsWith('s') && !key.endsWith('ss')) return key.slice(0, -1);
  return key;
}

/** Display form the server will save: tidy spaces, capitalise each word. */
export function categoryTitle(input: string) {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/**
 * Categories matching what the vendor typed: names starting with it first, then containing it, then close
 * misspellings ("momso" finds Momos), so a near-duplicate is offered before a new category is made.
 */
export function searchCategories(categories: MenuCategory[], query: string) {
  const wanted = categoryKey(query);
  if (!wanted) return { matches: categories, exact: undefined as MenuCategory | undefined };
  const scored = categories
    .map(category => {
      const key = categoryKey(category.name);
      const words = category.name.toLowerCase().split(/[\s&'-]+/).map(categoryKey);
      const score = key === wanted ? 0
        : key.startsWith(wanted) || words.some(word => word.startsWith(wanted)) ? 1
        : key.includes(wanted) ? 2
        : wanted.length >= 4 && distance(key, wanted) <= (wanted.length >= 7 ? 2 : 1) ? 3
        : -1;
      return { category, score };
    })
    .filter(entry => entry.score >= 0)
    .sort((a, b) => a.score - b.score || a.category.name.localeCompare(b.category.name));
  return { matches: scored.map(entry => entry.category), exact: scored.find(entry => entry.score === 0)?.category };
}
