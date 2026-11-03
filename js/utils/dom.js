// Helpers chicos para trabajar con el DOM

/** Escapa texto para insertarlo en innerHTML sin riesgo de XSS. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Muestra un mensaje en un contenedor. type: 'error' | 'success' | 'info' */
export function showAlert(container, message, type = 'error') {
  container.innerHTML = message ? `<div class="alert alert-${type}">${esc(message)}</div>` : '';
}

export function loader(text = 'Cargando...') {
  return `<p class="loader">${esc(text)}</p>`;
}

/** Lee un <form> como objeto { name: value } */
export function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

/** Deshabilita el botón submit mientras corre una promesa */
export async function withLoading(button, fn) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = 'Procesando...';
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

export function formatFecha(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return esc(value);
  return d.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function hoyISO() {
  return toISODate(new Date());
}

/** Date -> 'YYYY-MM-DD' en hora local */
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 'YYYY-MM-DD' -> Date local (sin corrimiento por zona horaria) */
export function parseISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 'YYYY-MM-DD' -> 'martes 3 de noviembre' */
export function formatDia(iso) {
  const d = parseISODate(iso);
  if (Number.isNaN(d.getTime())) return String(iso ?? '');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** 'HH:MM:SS' -> 'HH:MM' */
export function formatHora(hora) {
  return String(hora ?? '').slice(0, 5);
}

/** 50000 -> '$ 50.000' */
export function formatPrecio(valor) {
  const n = Number(valor);
  if (Number.isNaN(n)) return '';
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

/** Lunes a viernes */
export function esDiaHabil(iso) {
  const dia = parseISODate(iso).getDay();
  return dia >= 1 && dia <= 5;
}

/**
 * true si la franja ya empezó. La API devuelve también las franjas de hoy
 * cuya hora ya pasó, así que el front las oculta.
 */
export function yaPaso(turno) {
  const hoy = hoyISO();
  if (turno.fecha < hoy) return true;
  if (turno.fecha > hoy) return false;
  const ahora = new Date();
  const hhmm = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
  return formatHora(turno.hora_inicio) <= hhmm;
}

export function nombreCompleto(p) {
  return p ? `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() : '';
}
