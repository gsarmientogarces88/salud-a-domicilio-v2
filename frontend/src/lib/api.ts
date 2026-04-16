/**
 * Origen de la API, siempre con sufijo `/api` (sin barra final).
 * Acepta `NEXT_PUBLIC_API_URL` con o sin `/api` para evitar llamadas a rutas como `/auth/login` en el puerto del backend.
 */
export function getApiBaseUrl(): string {
  const trimmed = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/+$/, '');
  if (trimmed.toLowerCase().endsWith('/api')) return trimmed;
  return `${trimmed}/api`;
}

const BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...opts,
      // Evita 304 sin body en fetch del navegador y asegura polling correcto.
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        ...opts.headers,
      },
    });
  } catch (e) {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
  }

  let json: any = {};
  try {
    const text = await res.text();
    if (text) json = JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error('Error de servidor');
  }
  if (!res.ok) throw new ApiError(json?.message || `Error ${res.status}`, res.status, json);
  return json;
}

export async function apiFetchForm<T = unknown>(path: string, form: FormData): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  let json: unknown = {};
  try {
    const text = await res.text();
    if (text) json = JSON.parse(text);
  } catch {
    if (!res.ok) throw new Error('Error de servidor');
  }
  const j = json as { message?: string };
  if (!res.ok) throw new Error(j?.message || `Error ${res.status}`);
  return json as T;
}
