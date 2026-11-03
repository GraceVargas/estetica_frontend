import { getServicios } from '../../api/turnos.js';
import { esc, loader, showAlert, formatPrecio } from '../../utils/dom.js';

// Catálogo de servicios: GET /api/servicios, agrupado y filtrable por categoría.

export default {
  title: 'Servicios',
  async render(root) {
    root.innerHTML = `
      <div class="page-header">
        <h1>Servicios</h1>
        <div class="filters">
          <select id="f-categoria" aria-label="Filtrar por categoría">
            <option value="">Todas las categorías</option>
          </select>
        </div>
      </div>
      <div id="servicios-list">${loader()}</div>
    `;

    const fCategoria = root.querySelector('#f-categoria');
    const list = root.querySelector('#servicios-list');

    let servicios = [];
    try {
      servicios = (await getServicios()) ?? [];
    } catch (err) {
      return showAlert(list, err.message);
    }

    const categorias = [...new Set(servicios.map((s) => s.categoria).filter(Boolean))].sort();
    fCategoria.innerHTML += categorias
      .map((c) => `<option value="${esc(c)}">${esc(c)}</option>`)
      .join('');

    function pintar() {
      const filtro = fCategoria.value;
      const visibles = categorias.filter((c) => !filtro || c === filtro);
      if (!servicios.length) {
        list.innerHTML = '<p class="muted">Todavía no hay servicios cargados.</p>';
        return;
      }
      list.innerHTML = visibles
        .map(
          (cat) => `
          <section class="categoria">
            <h2>${esc(cat)}</h2>
            <div class="features">
              ${servicios
                .filter((s) => s.categoria === cat)
                .map(
                  (s) => `
                <article class="card servicio">
                  <h3>${esc(s.nombre)}</h3>
                  <p class="muted">${esc(s.descripcion ?? '')}</p>
                  <div class="servicio-meta">
                    <span>${esc(s.duracion)} min</span>
                    <strong>${esc(formatPrecio(s.precio))}</strong>
                  </div>
                  <a class="btn btn-outline btn-sm" href="#/reservar?servicio=${esc(s.id)}">Reservar</a>
                </article>`
                )
                .join('')}
            </div>
          </section>`
        )
        .join('');
    }

    fCategoria.addEventListener('change', pintar);
    pintar();
  },
};
