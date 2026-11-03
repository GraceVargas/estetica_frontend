import { getTodosLosTurnos } from '../../api/turnos.js';
import { esc, loader, showAlert, hoyISO, formatFecha } from '../../utils/dom.js';

export default {
  title: 'Turnos',
  render(root) {
    root.innerHTML = `
      <div class="page-header">
        <h1>Turnos</h1>
        <div class="filters">
          <input id="f-fecha" type="date" value="${hoyISO()}" />
          <select id="f-estado">
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>
      <div id="turnos-list"></div>
    `;

    const fFecha = root.querySelector('#f-fecha');
    const fEstado = root.querySelector('#f-estado');
    const list = root.querySelector('#turnos-list');

    async function cargar() {
      list.innerHTML = loader();
      try {
        const turnos = (await getTodosLosTurnos({ fecha: fFecha.value, estado: fEstado.value })) ?? [];
        list.innerHTML = turnos.length
          ? `<table class="table">
              <thead><tr><th>Fecha</th><th>Clienta</th><th>Profesional</th><th>Tratamiento</th><th>Gabinete</th><th>Estado</th></tr></thead>
              <tbody>
                ${turnos
                  .map(
                    (t) => `<tr>
                      <td>${formatFecha(t.fecha_hora)}</td>
                      <td>${esc(t.cliente?.nombre ?? t.cliente ?? '')}</td>
                      <td>${esc(t.profesional?.nombre ?? t.profesional ?? '')}</td>
                      <td>${esc(t.servicio?.nombre ?? t.servicio ?? '')}</td>
                      <td>${esc(t.gabinete?.nombre ?? t.gabinete ?? '')}</td>
                      <td><span class="badge badge-${esc(t.estado)}">${esc(t.estado)}</span></td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>`
          : '<p class="muted">No hay turnos con esos filtros.</p>';
      } catch (err) {
        showAlert(list, err.message);
      }
    }

    fFecha.addEventListener('change', cargar);
    fEstado.addEventListener('change', cargar);
    cargar();
  },
};
