import { apiFetch } from './api';

export function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function removeToken() {
  localStorage.removeItem('token');
}

export function decodeToken(token: string): { userId: string; iat: number; exp: number } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export async function loginRequest(email: string, password: string) {
  return apiFetch<{ data: { token: string; user: any } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function registerRequest(data: {
  email: string; password: string; firstName: string; lastName: string;
  phone?: string; role?: string; specialty?: string; licenseNumber?: string; baseFee?: number;
}) {
  return apiFetch<{ data: { token: string; user: any } }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
