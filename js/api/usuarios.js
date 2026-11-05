import { API_USUARIOS_URL } from '../config.js';
import { createClient } from './http.js';

// API de Usuarios. Rutas y contratos según API-frontend.md (sección "API de usuarios").
// Los usuarios traen el id en `_id`. Las respuestas traen el usuario (o la lista) directamente.
const api = createClient(API_USUARIOS_URL);

// ---------- Sesión ----------

/** POST /sesiones { email, password } -> 200 { token } | 401 | 403 cuenta deshabilitada */
export function login(email, password) {
  return api.post('/sesiones', { email: email.trim(), password }, { auth: false });
}

/** DELETE /sesiones -> 204. Invalida el token en el servidor. */
export function cerrarSesion() {
  return api.del('/sesiones');
}

/** POST /usuarios { nombre, apellido, email, password } -> 201 { token } (registro de cliente) */
export function register({ nombre, apellido, email, password }) {
  return api.post(
    '/usuarios',
    { nombre: nombre.trim(), apellido: apellido.trim(), email: email.trim(), password },
    { auth: false }
  );
}

/** GET /usuarios/me -> usuario logueado */
export async function getMe() {
  const data = await api.get('/usuarios/me');
  return data ?? null;
}

// ---------- Administrador ----------

/** GET /usuarios -> usuarios activos de cualquier rol (sin filtros: se filtra en el front) */
export async function listarUsuarios() {
  const data = await api.get('/usuarios');
  return Array.isArray(data) ? data : [];
}

/** GET /usuarios/:id */
export async function obtenerUsuario(id) {
  const data = await api.get(`/usuarios/${encodeURIComponent(id)}`);
  return data ?? null;
}

/** DELETE /usuarios/:id -> baja lógica (activo: false). No se puede reactivar. */
export function desactivarUsuario(id) {
  return api.del(`/usuarios/${encodeURIComponent(id)}`);
}

/** POST /admin/usuarios { nombre, apellido, email, rol } -> 201 (rol: profesional | administrador) */
export async function crearUsuario({ nombre, apellido, email, rol }) {
  const data = await api.post('/admin/usuarios', {
    nombre: nombre.trim(),
    apellido: apellido.trim(),
    email: email.trim(),
    rol,
  });
  return data ?? null;
}

/** Extrae el token de la respuesta de login/registro ({ token }). */
export function extraerToken(data) {
  return data?.token ?? null;
}
