import { mediaUrl, request } from './client';
import type { MenuItem, MenuItemInput, VendorMenu } from '../types';

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
