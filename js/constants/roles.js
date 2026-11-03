// Roles definidos en la API de Usuarios
export const ROLES = Object.freeze({
  CLIENTE: 'cliente',
  PROFESIONAL: 'profesional',
  ADMIN: 'administrador',
});

// Pantalla de inicio de cada rol después del login
export const HOME_POR_ROL = {
  [ROLES.CLIENTE]: '/mis-turnos',
  [ROLES.PROFESIONAL]: '/mis-turnos',
  [ROLES.ADMIN]: '/admin',
};
