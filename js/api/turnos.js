import { API_TURNOS_URL } from '../config.js';
import { createClient } from './http.js';

// API de Turnos. Rutas y contratos según API-frontend.md.
const api = createClient(API_TURNOS_URL);

// ---------- Públicas (sin token) ----------

/** GET /api/servicios -> [Servicio] (activos) */
export function getServicios() {
  return api.get('/api/servicios', { auth: false });
}

/**
 * GET /api/profesionales[?servicio_id] -> [Profesional] activos, cada uno con
 * `servicios: [{ id, nombre, categoria, duracion, precio }]` (los que hace).
 */
export function getProfesionales({ servicio_id } = {}) {
  return api.get('/api/profesionales', { auth: false, query: { servicio_id } });
}

/**
 * GET /api/turnos?fecha&profesional_id&servicio_id -> [Turno] disponibles desde hoy.
 * Todos los filtros son opcionales.
 */
export function getTurnosDisponibles({ fecha, profesional_id, servicio_id } = {}) {
  return api.get('/api/turnos', { auth: false, query: { fecha, profesional_id, servicio_id } });
}

// ---------- Reservas (requieren token) ----------

/** GET /api/reservas -> reservas vigentes del usuario, con servicio y profesional incluidos */
export function getMisReservas() {
  return api.get('/api/reservas');
}

/** POST /api/reservas { turno_id, servicio_id } -> 201 Turno reservado | 404 | 409 | 422 */
export function crearReserva(turnoId, servicioId) {
  return api.post('/api/reservas', { turno_id: Number(turnoId), servicio_id: Number(servicioId) });
}

/** PATCH /api/reservas/:id { nuevo_turno_id } -> 200 Turno de la nueva franja */
export function modificarReserva(reservaId, nuevoTurnoId) {
  return api.patch(`/api/reservas/${Number(reservaId)}`, { nuevo_turno_id: Number(nuevoTurnoId) });
}

/** DELETE /api/reservas/:id -> 200 Turno liberado (estado "disponible") */
export function cancelarReserva(reservaId) {
  return api.del(`/api/reservas/${Number(reservaId)}`);
}

// ---------- Administrador ----------

/** POST /api/turnos/generar { fecha, servicio_id } -> 201 [Turno] generados | 200 { mensaje } (nada nuevo) */
export function generarTurnos(fecha, servicioId) {
  return api.post('/api/turnos/generar', { fecha, servicio_id: Number(servicioId) });
}

/** POST /api/profesionales { usuario_id, especialidad } -> 201 Profesional creado */
export function crearProfesional({ usuario_id, especialidad }) {
  return api.post('/api/profesionales', { usuario_id, especialidad });
}

// ---------- Helpers ----------

// Servicios y profesionales cambian poco: se piden una vez y se guardan en memoria
// (las respuestas de /api/turnos traen solo IDs).
let catalogoCache = null;

/**
 * Devuelve { servicios, profesionales } cacheados en memoria.
 * Cada profesional trae `servicios` (los que hace).
 */
export async function getCatalogo() {
  if (!catalogoCache) {
    catalogoCache = Promise.all([getServicios(), getProfesionales()])
      .then(([servicios, profesionales]) => ({
        servicios: servicios ?? [],
        profesionales: (profesionales ?? []).map((p) => ({ ...p, servicios: p.servicios ?? [] })),
      }))
      .catch((err) => {
        catalogoCache = null;
        throw err;
      });
  }
  return catalogoCache;
}
