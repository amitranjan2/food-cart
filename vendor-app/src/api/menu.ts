import { mediaUrl, request } from './client';
import type { MenuCategory, MenuItem, MenuItemInput, VendorMenu } from '../types';

export function getVendorMenu(token: string) {
  return request<VendorMenu>('/api/vendor/menu', { token });
}

export function createMenuItem(token: string, body: MenuItemInput) {
  return request<MenuItem>('/api/vendor/menu/items', {
    method: 'POST',
    token,
    body,
  });
}

export function updateMenuItem(token: string, itemId: string, body: MenuItemInput) {
  return request<MenuItem>(`/api/vendor/menu/items/${itemId}`, {
    method: 'PUT',
    token,
    body,
  });
}

export function patchItemAvailability(token: string, itemId: string, available: boolean) {
  return request<MenuItem>(`/api/vendor/menu/items/${itemId}/availability`, {
    method: 'PATCH',
    token,
    body: { available },
  });
}

export function patchItemSpecial(token: string, itemId: string, special: boolean) {
  return request<MenuItem>(`/api/vendor/menu/items/${itemId}/special`, {
    method: 'PATCH',
    token,
    body: { special },
  });
}

/** Category ids top to bottom, as the storefront should show them. */
export function putCategoryOrder(token: string, categoryIds: string[]) {
  return request<string[]>('/api/vendor/menu/category-order', {
    method: 'PUT',
    token,
    body: { categoryIds },
  });
}

/** One category's dish ids, top to bottom. */
export function putItemOrder(token: string, itemIds: string[]) {
  return request<void>('/api/vendor/menu/item-order', {
    method: 'PUT',
    token,
    body: { itemIds },
  });
}

/** Adds a category to the shared list, or returns the existing one with the same name. */
export function addCatalogCategory(token: string, name: string) {
  return request<{ category: MenuCategory; created: boolean }>('/api/vendor/menu/catalog-categories', {
    method: 'POST',
    token,
    body: { name },
  });
}

export function deleteMenuItem(token: string, itemId: string) {
  return request<void>(`/api/vendor/menu/items/${itemId}`, {
    method: 'DELETE',
    token,
  });
}

export async function uploadMenuImage(token: string, file: FormData) {
  const result = await request<{ url: string }>('/api/vendor/uploads', {
    method: 'POST',
    token,
    body: file,
  });
  return mediaUrl(result.url);
}
