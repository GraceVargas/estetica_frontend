import { getToken, logout } from '../auth/session.js';

export class ApiError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

/**
 * Wrapper de fetch común a los dos backends.
 * - Agrega Authorization: Bearer {JWT} si hay sesión (auth: true)
 * - Serializa body a JSON y agrega query params
 * - Ante 401 cierra la sesión y manda al login
 */
export async function request(baseUrl, path, { method = 'GET', body, query, auth = true } = {}) {
  const url = new URL(baseUrl + path);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }

  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    // 401: falta el token, es inválido o venció -> al login
    if (response.status === 401 && auth && token) {
      logout();
      window.location.hash = '#/login';
    }
    // Formato de errores: { mensaje, error? }. `mensaje` se puede mostrar al usuario.
    const message =
      (data && typeof data === 'object' && (data.mensaje || data.mensaje_error || data.message || data.error)) ||
      (response.status === 403 ? 'No tenés permiso para realizar esta acción' : `Error ${response.status}`);
    throw new ApiError(response.status, message, data);
  }

  return data;
}

/** Crea un cliente HTTP atado a una URL base. */
export function createClient(baseUrl) {
  return {
    get: (path, opts) => request(baseUrl, path, { ...opts, method: 'GET' }),
    post: (path, body, opts) => request(baseUrl, path, { ...opts, method: 'POST', body }),
    put: (path, body, opts) => request(baseUrl, path, { ...opts, method: 'PUT', body }),
    patch: (path, body, opts) => request(baseUrl, path, { ...opts, method: 'PATCH', body }),
    del: (path, opts) => request(baseUrl, path, { ...opts, method: 'DELETE' }),
  };
}
