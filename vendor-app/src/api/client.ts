import { Platform } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export function getApiUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return BACKEND_URL;
}

export const API_URL = BACKEND_URL;

export function mediaUrl(path?: string | null) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiUrl().replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function isAuthFailure(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 403) return false;
  return /Authentication required|Invalid session|Session expired/i.test(error.message);
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, body, headers: extraHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string> | undefined),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, { ...rest, headers, body: payload });
  } catch {
    throw new ApiError('Cannot reach the FoodCart API. Confirm the backend is running on port 8080.', 0);
  }

  const text = await response.text();
  let data: { error?: string } | undefined;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    throw new ApiError(text?.trim() || 'Something went wrong', response.status);
  }

  if (!response.ok) {
    throw new ApiError(data?.error || 'Something went wrong', response.status);
  }

  return data as T;
}
