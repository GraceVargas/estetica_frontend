import { getUser } from './auth/session.js';
import { ROLES, HOME_POR_ROL } from './constants/roles.js';
import { renderNavbar } from './components/navbar.js';

// Tabla de rutas. Las vistas se cargan bajo demanda con import().
// auth: requiere sesión (cualquier rol) | roles: solo esos roles | guestOnly: solo sin sesión
const routes = {
  // Cualquier visitante
  '/':                     { view: () => import('./views/public/home.js') },
  '/servicios':            { view: () => import('./views/public/servicios.js') },
  '/equipo':               { view: () => import('./views/public/equipo.js') },
  // La reserva se puede armar sin sesión; al confirmar se pide login (ver reservar.js)
  '/reservar':             { view: () => import('./views/cliente/reservar.js') },
  '/login':                { view: () => import('./views/public/login.js'), guestOnly: true },
  '/registro':             { view: () => import('./views/public/register.js'), guestOnly: true },

  // Usuarios con sesión
  '/mis-turnos':           { view: () => import('./views/cliente/misTurnos.js'), auth: true },

  // Administradores
  '/admin':                { view: () => import('./views/admin/dashboard.js'), roles: [ROLES.ADMIN] },
  '/admin/agenda':         { view: () => import('./views/admin/generarAgenda.js'), roles: [ROLES.ADMIN] },
  '/admin/profesionales':  { view: () => import('./views/admin/profesionales.js'), roles: [ROLES.ADMIN] },
  '/admin/usuarios':       { view: () => import('./views/admin/usuarios.js'), roles: [ROLES.ADMIN] },
};

const notFound = { view: () => import('./views/public/notFound.js') };

export function navigate(path) {
  window.location.hash = '#' + path;
}

function currentPath() {
  const path = window.location.hash.slice(1).split('?')[0];
  return path || '/';
}

async function render() {
  const app = document.getElementById('app');
  const path = currentPath();
  const route = routes[path] ?? notFound;
  const user = getUser();

  // Guards
  if (route.guestOnly && user) return navigate(HOME_POR_ROL[user.rol] ?? '/');
  if ((route.auth || route.roles) && !user) return navigate('/login');
  if (route.roles && !route.roles.includes(user.rol)) return navigate(HOME_POR_ROL[user.rol] ?? '/');

  renderNavbar(path);

  try {
    const module = await route.view();
    const view = module.default;
    document.title = `${view.title ?? 'Turnos'} · Natura Balance`;
    app.innerHTML = '';
    await view.render(app);
  } catch (err) {
    console.error(err);
    app.innerHTML = '<div class="alert alert-error">Ocurrió un error al cargar la página.</div>';
  }
}

export function initRouter() {
  window.addEventListener('hashchange', render);
  window.addEventListener('session-change', render);
  render();
}
