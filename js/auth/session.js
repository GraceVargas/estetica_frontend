import { TOKEN_STORAGE_KEY } from '../config.js';

// Manejo de la sesión: guarda el JWT (emitido por la API de Usuarios) y lo decodifica
// para leer { id, rol, exp }. El mismo token se manda a la API de Turnos.
// La validación real de la firma la hacen los backends.

export function saveToken(token) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.dispatchEvent(new Event('session-change'));
}

export function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function logout() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event('session-change'));
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Devuelve el usuario logueado ({ id, rol, exp }) o null. */
export function getUser() {
  const token = getToken();
  if (!token) return null;

  const payload = decodeJwt(token);
  if (!payload) return null;

  // exp viene en segundos
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    logout();
    return null;
  }
  return payload;
}

// Ruta a la que volver después del login (ej. confirmar una reserva sin sesión)
const REDIRECT_KEY = 'nb_redirect';

export function setRedirect(path) {
  sessionStorage.setItem(REDIRECT_KEY, path);
}

export function popRedirect() {
  const path = sessionStorage.getItem(REDIRECT_KEY);
  sessionStorage.removeItem(REDIRECT_KEY);
  return path;
}

export function isLoggedIn() {
  return getUser() !== null;
}

export function hasRole(...roles) {
  const user = getUser();
  return !!user && roles.includes(user.rol);
}
