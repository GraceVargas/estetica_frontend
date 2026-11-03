import { getProfesionales, crearProfesional } from '../../api/turnos.js';
import { listarUsuarios } from '../../api/usuarios.js';
import { ROLES } from '../../constants/roles.js';
import { esc, loader, showAlert, formData, withLoading, nombreCompleto } from '../../utils/dom.js';

// Alta de profesional (API-frontend.md §6): POST /api/profesionales { usuario_id, especialidad }.
// El usuario tiene que existir en la API de Usuarios con rol "profesional".
// El selector se arma con GET /usuarios (API de Usuarios) filtrando rol "profesional".
// Si esa llamada falla, se pide el ID a mano.

async function usuariosProfesionales() {
  try {
    const lista = await listarUsuarios();
    return lista.filter((u) => u.rol === ROLES.PROFESIONAL && u.activo !== false);
  } catch {
    return null;
  }
}

export default {
  title: 'Profesionales',
  async render(root) {
    root.innerHTML = `
      <h1>Profesionales</h1>
      <section class="card">
        <h2>Alta de profesional</h2>
        <p class="muted small">
          El usuario tiene que estar creado antes en la API de Usuarios con rol <em>profesional</em>.
          El nombre y el apellido se toman de ahí.
        </p>
        <form id="prof-form" class="form-grid">
          <label id="campo-usuario">Usuario ${loader()}</label>
          <label>Especialidad <input name="especialidad" required placeholder="Tratamientos faciales" /></label>
          <button class="btn btn-primary" type="submit">Dar de alta</button>
        </form>
        <div id="prof-msg"></div>
      </section>
      <section class="card">
        <h2>Profesionales activos</h2>
        <div id="prof-list">${loader()}</div>
      </section>
    `;

    const form = root.querySelector('#prof-form');
    const msg = root.querySelector('#prof-msg');
    const list = root.querySelector('#prof-list');
    const campoUsuario = root.querySelector('#campo-usuario');

    let profesionales = [];

    async function cargarLista() {
      list.innerHTML = loader();
      try {
        profesionales = (await getProfesionales()) ?? [];
        list.innerHTML = profesionales.length
          ? `<table class="table">
              <thead><tr><th>Nombre</th><th>Especialidad</th><th>ID de usuario</th></tr></thead>
              <tbody>
                ${profesionales
                  .map((p) => `<tr><td>${esc(nombreCompleto(p))}</td><td>${esc(p.especialidad ?? '')}</td><td><code>${esc(p.usuario_id ?? '')}</code></td></tr>`)
                  .join('')}
              </tbody>
            </table>`
          : '<p class="muted">Todavía no hay profesionales.</p>';
      } catch (err) {
        showAlert(list, err.message);
      }
    }

    async function pintarCampoUsuario() {
      const usuarios = await usuariosProfesionales();
      const yaSon = new Set(profesionales.map((p) => p.usuario_id));
      const candidatos = (usuarios ?? []).filter((u) => !yaSon.has(u._id));

      if (usuarios && candidatos.length) {
        campoUsuario.innerHTML = `Usuario
          <select name="usuario_id" required>
            <option value="">Elegí un usuario</option>
            ${candidatos
              .map((u) => `<option value="${esc(u._id)}">${esc(nombreCompleto(u) || u._id)}${u.email ? ` · ${esc(u.email)}` : ''}</option>`)
              .join('')}
          </select>`;
      } else if (usuarios) {
        campoUsuario.innerHTML = `Usuario
          <select name="usuario_id" required disabled>
            <option value="">No hay usuarios profesionales pendientes de alta</option>
          </select>
          <span class="muted small">Crealos primero en <a href="#/admin/usuarios">Usuarios</a>.</span>`;
      } else {
        campoUsuario.innerHTML = `ID de usuario
          <input name="usuario_id" required placeholder="6ae761442b19072bbffa20c3" />`;
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { usuario_id, especialidad } = formData(form);
      try {
        await withLoading(form.querySelector('button'), () =>
          crearProfesional({ usuario_id: usuario_id.trim(), especialidad: especialidad.trim() })
        );
        form.reset();
        showAlert(msg, 'Profesional dado de alta.', 'success');
        await cargarLista();
        pintarCampoUsuario();
      } catch (err) {
        const textos = {
          404: 'Ese usuario no existe en la API de Usuarios.',
          409: 'Ese usuario ya es profesional.',
          422: 'El usuario no tiene rol "profesional" o está inactivo.',
        };
        if (err.status !== 401) showAlert(msg, textos[err.status] ?? err.message);
      }
    });

    await cargarLista();
    pintarCampoUsuario();
  },
};
