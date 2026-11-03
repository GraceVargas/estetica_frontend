import { getUser, getToken, logout } from '../auth/session.js';
import { cerrarSesion, getMe } from '../api/usuarios.js';
import { ROLES } from '../constants/roles.js';
import { esc } from '../utils/dom.js';

// Links visibles según la sesión y el rol
const PUBLICOS = [
  { path: '/servicios', label: 'Servicios' },
  { path: '/equipo', label: 'Equipo' },
  { path: '/reservar', label: 'Reservar turno' },
];

const INVITADO = [
  { path: '/login', label: 'Ingresar' },
  { path: '/registro', label: 'Registrarme' },
];

const CON_SESION = [{ path: '/mis-turnos', label: 'Mis turnos' }];

const ADMIN = [{ path: '/admin', label: 'Administración' }];

export function renderNavbar(currentPath) {
  const nav = document.getElementById('navbar');
  const user = getUser();
  const links = !user
    ? [...PUBLICOS, ...INVITADO]
    : [...PUBLICOS, ...CON_SESION, ...(user.rol === ROLES.ADMIN ? ADMIN : [])];

  nav.innerHTML = `
    <nav class="navbar container">
      <a href="#/" class="brand">Natura Balance</a>
      <ul class="nav-links">
        ${links
          .map(
            (l) => `<li><a href="#${l.path}" class="${l.path === currentPath || (l.path === '/admin' && currentPath.startsWith('/admin/')) ? 'active' : ''}">${esc(l.label)}</a></li>`
          )
          .join('')}
        ${user ? `<li id="nav-saludo" class="muted"></li>` : ''}
        ${user ? `<li><button id="logout-btn" class="btn btn-link">Salir</button></li>` : ''}
      </ul>
    </nav>
  `;

  if (user) pintarSaludo(nav.querySelector('#nav-saludo'));

  nav.querySelector('#logout-btn')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    // DELETE /sesiones invalida el token en el servidor; si falla, igual se cierra localmente
    try {
      await cerrarSesion();
    } catch {
      /* token ya vencido o sin conexión */
    }
    perfilCache = null;
    logout();
    window.location.hash = '#/login';
  });
}

// Perfil del usuario logueado (GET /usuarios/me), cacheado por token
let perfilCache = null;

async function pintarSaludo(el) {
  const token = getToken();
  if (!perfilCache || perfilCache.token !== token) {
    perfilCache = { token, promesa: getMe() };
  }
  try {
    const perfil = await perfilCache.promesa;
    if (perfil?.nombre && el.isConnected) el.textContent = `Hola, ${perfil.nombre}`;
  } catch (err) {
    perfilCache = null;
    // 404: el usuario fue desactivado después de iniciar sesión -> tratar como logout
    if (err.status === 404) {
      logout();
      window.location.hash = '#/login';
    }
  }
}
