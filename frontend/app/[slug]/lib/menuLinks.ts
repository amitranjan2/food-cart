import type { MenuCategory, MenuItem } from '../../lib/api';

/**
 * Seeded items are not stored with categoryId. Until the menu API
 * links every dish to a category, match by name so category browsing
 * has somewhere to land. An item that already has a known categoryId
 * is left untouched.
 */
const CATEGORY_ALIASES: Record<string, string[]> = {
  drinks: ['coffee', 'tea', 'juice', 'shake', 'lassi', 'soda', 'water'],
  beverages: ['coffee', 'tea', 'juice', 'shake', 'lassi', 'soda'],
};

function score(itemName: string, categoryName: string) {
  const category = categoryName.toLowerCase();
  const stem = category.endsWith('s') ? category.slice(0, -1) : category;
  if (stem.length > 2 && itemName.includes(stem)) return 2;
  const aliases = CATEGORY_ALIASES[category] ?? [];
  if (aliases.some(alias => itemName.includes(alias))) return 1;
  return 0;
}

function matchCategory(itemName: string, categories: MenuCategory[]) {
  let best: MenuCategory | undefined;
  let bestScore = 0;
  for (const category of categories) {
    const value = score(itemName.toLowerCase(), category.name);
    if (value > bestScore) {
      best = category;
      bestScore = value;
    }
  }
  return best?.id;
}

export function linkItemsToCategories(categories: MenuCategory[], items: MenuItem[]): MenuItem[] {
  if (categories.length === 0) return items;
  const known = new Set(categories.map(category => category.id));
  return items.map(item => {
    if (item.categoryId && known.has(item.categoryId)) return item;
    const categoryId = matchCategory(item.name, categories);
    return categoryId ? { ...item, categoryId } : item;
  });
}
