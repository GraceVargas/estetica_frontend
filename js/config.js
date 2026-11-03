// Configuración de URLs de los backends (ver API-frontend.md).
const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

// true: el front corriendo en localhost usa los backends locales.
// false: usa siempre las APIs de producción (útil para probar sin levantar los backends).
const USAR_BACKEND_LOCAL = false;
const local = isLocal && USAR_BACKEND_LOCAL;

// API de Usuarios: login (/sesiones), registro y administración de usuarios. Emite el JWT.
export const API_USUARIOS_URL = local
  ? 'http://localhost:5000'
  : 'https://backend-usuarios.vercel.app';

// API de Turnos: servicios, profesionales, franjas y reservas.
export const API_TURNOS_URL = local
  ? 'http://localhost:3001'
  : 'https://backendturnos.vercel.app';

export const TOKEN_STORAGE_KEY = 'nb_token';
