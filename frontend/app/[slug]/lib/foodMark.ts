import type { MenuItem } from '../../lib/api';

export function foodMark(type?: MenuItem['foodType']) {
  if (type === 'NON_VEG') return { color: '#e11d2e', label: 'Non-vegetarian' };
  if (type === 'EGG') return { color: '#c9a227', label: 'Contains egg' };
  if (type === 'VEGAN') return { color: '#14804a', label: 'Vegan' };
  if (type === 'VEG') return { color: '#14804a', label: 'Vegetarian' };
  return null;
}
