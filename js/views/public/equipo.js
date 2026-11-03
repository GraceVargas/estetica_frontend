import { getCatalogo } from '../../api/turnos.js';
import { esc, loader, showAlert, nombreCompleto } from '../../utils/dom.js';

// Equipo: GET /api/profesionales, cruzado con /api/profesionalServicio y /api/servicios
// para mostrar qué servicios hace cada profesional.

export default {
  title: 'Equipo',
  async render(root) {
    root.innerHTML = `
      <h1>Nuestro equipo</h1>
      <div id="equipo-list">${loader()}</div>
    `;
    const list = root.querySelector('#equipo-list');

    try {
      const { servicios, profesionales, relaciones } = await getCatalogo();
      const servicioPorId = new Map(servicios.map((s) => [s.id, s]));

      if (!profesionales.length) {
        list.innerHTML = '<p class="muted">Todavía no hay profesionales cargados.</p>';
        return;
      }

      list.innerHTML = `
        <div class="features">
          ${profesionales
            .map((p) => {
              const hace = relaciones
                .filter((r) => r.profesional_id === p.id)
                .map((r) => servicioPorId.get(r.servicio_id))
                .filter(Boolean);
              return `
              <article class="card">
                <h3>${esc(nombreCompleto(p))}</h3>
                <p class="muted">${esc(p.especialidad ?? '')}</p>
                ${hace.length
                  ? `<ul class="tags">${hace.map((s) => `<li>${esc(s.nombre)}</li>`).join('')}</ul>`
                  : ''}
              </article>`;
            })
            .join('')}
        </div>`;
    } catch (err) {
      showAlert(list, err.message);
    }
  },
};
