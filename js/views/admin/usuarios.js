import { listarUsuarios, crearUsuario, desactivarUsuario } from '../../api/usuarios.js';
import { getUser } from '../../auth/session.js';
import { ROLES } from '../../constants/roles.js';
import { esc, loader, showAlert, formData, withLoading, nombreCompleto } from '../../utils/dom.js';

// Administración de usuarios (API de Usuarios):
// - GET /usuarios            -> usuarios activos (se filtra por rol en el front)
// - POST /admin/usuarios     -> alta de profesional o administrador
// - DELETE /usuarios/:id     -> baja lógica (no se puede reactivar)

const ETIQUETA_ROL = {
  [ROLES.CLIENTE]: 'Cliente',
  [ROLES.PROFESIONAL]: 'Profesional',
  [ROLES.ADMIN]: 'Administrador',
};

export default {
  title: 'Usuarios',
  render(root) {
    root.innerHTML = `
      <h1>Usuarios</h1>
      <section class="card">
        <h2>Alta de profesional o administrador</h2>
        <form id="usuario-form" class="form-grid">
          <label>Nombre <input name="nombre" required /></label>
          <label>Apellido <input name="apellido" required /></label>
          <label>Email <input name="email" type="email" required /></label>
          <label>Rol
            <select name="rol" required>
              <option value="${ROLES.PROFESIONAL}">Profesional</option>
              <option value="${ROLES.ADMIN}">Administrador</option>
            </select>
          </label>
          <button class="btn btn-primary" type="submit">Crear usuario</button>
        </form>
        <p class="muted small">
          El servidor genera una contraseña temporal. Por ahora todavía no se envía por mail,
          así que estos usuarios no pueden iniciar sesión hasta que se resuelva en el backend.
          Para que un profesional aparezca en la agenda, después hay que darlo de alta en
          <a href="#/admin/profesionales">Profesionales</a>.
        </p>
        <div id="usuario-msg"></div>
      </section>

      <section class="card">
        <div class="page-header">
          <h2>Usuarios activos</h2>
          <select id="f-rol" aria-label="Filtrar por rol">
            <option value="">Todos los roles</option>
            ${Object.entries(ETIQUETA_ROL).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
          </select>
        </div>
        <div id="usuarios-msg"></div>
        <div id="usuarios-list">${loader()}</div>
      </section>
    `;

    const form = root.querySelector('#usuario-form');
    const msg = root.querySelector('#usuario-msg');
    const listMsg = root.querySelector('#usuarios-msg');
    const list = root.querySelector('#usuarios-list');
    const fRol = root.querySelector('#f-rol');
    const yo = getUser()?.id;
    let usuarios = [];

    function pintar() {
      const visibles = usuarios.filter((u) => !fRol.value || u.rol === fRol.value);
      list.innerHTML = visibles.length
        ? `<table class="table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>ID</th><th></th></tr></thead>
            <tbody>
              ${visibles
                .map(
                  (u) => `<tr>
                    <td>${esc(nombreCompleto(u))}</td>
                    <td>${esc(u.email)}</td>
                    <td>${esc(ETIQUETA_ROL[u.rol] ?? u.rol)}</td>
                    <td><code>${esc(u._id)}</code></td>
                    <td>${u._id === yo
                      ? '<span class="muted small">Vos</span>'
                      : `<button class="btn btn-danger btn-sm" data-desactivar="${esc(u._id)}">Desactivar</button>`}</td>
                  </tr>`
                )
                .join('')}
            </tbody>
          </table>`
        : '<p class="muted">No hay usuarios con ese filtro.</p>';
    }

    async function cargar() {
      list.innerHTML = loader();
      try {
        usuarios = await listarUsuarios();
        pintar();
      } catch (err) {
        if (err.status !== 401) showAlert(list, err.message);
      }
    }

    fRol.addEventListener('change', pintar);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await withLoading(form.querySelector('button'), () => crearUsuario(formData(form)));
        form.reset();
        showAlert(msg, 'Usuario creado.', 'success');
        cargar();
      } catch (err) {
        const texto =
          err.status === 409 ? 'Ese email ya está registrado'
          : err.status === 400 ? 'Revisá los datos: todos los campos son obligatorios.'
          : err.message;
        if (err.status !== 401) showAlert(msg, texto);
      }
    });

    list.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-desactivar]');
      if (!btn) return;
      const u = usuarios.find((x) => x._id === btn.dataset.desactivar);
      if (!confirm(`¿Desactivar a ${nombreCompleto(u) || 'este usuario'}? No va a poder iniciar sesión y no se puede reactivar.`)) return;
      try {
        await withLoading(btn, () => desactivarUsuario(btn.dataset.desactivar));
        showAlert(listMsg, 'Usuario desactivado.', 'success');
      } catch (err) {
        if (err.status !== 401) showAlert(listMsg, err.message);
      }
      cargar();
    });

    cargar();
  },
};
