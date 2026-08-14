import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getToken, clearToken } from './storage';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function debuggerHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
  if (!hostUri) return null;
  return hostUri.split(':')[0] || null;
}

/** Base URL without trailing slash, including `/api`. */
export function getApiBaseUrl(): string {
  const env = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (env) {
    return env.toLowerCase().endsWith('/api') ? env : `${env}/api`;
  }

  const host = debuggerHost();
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:4000/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:4000/api';
  }

  return 'http://localhost:4000/api';
}

export async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((opts.headers as Record<string, string>) || {}),
  };

  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers });
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en :4000 y EXPO_PUBLIC_API_URL.',
    );
  }

  let json: { message?: string; error?: boolean; data?: unknown } = {};
  try {
    const text = await res.text();
    if (text) json = JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error('Error de servidor');
  }

  if (res.status === 401) {
    await clearToken();
  }

  if (!res.ok) {
    throw new ApiError(json?.message || `Error ${res.status}`, res.status, json);
  }
  return json as T;
}
