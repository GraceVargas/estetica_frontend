import * as turnosApi from '../../api/turnos.js';
import { esc, loader, showAlert, hoyISO, formatFecha } from '../../utils/dom.js';

export default {
  title: 'Mi agenda',
  render(root) {
    root.innerHTML = `
      <div class="page-header">
        <h1>Mi agenda</h1>
        <input id="agenda-fecha" type="date" value="${hoyISO()}" />
      </div>
      <div id="agenda-list"></div>
    `;

    const inpFecha = root.querySelector('#agenda-fecha');
    const list = root.querySelector('#agenda-list');

    async function cargar() {
      list.innerHTML = loader();
      try {
        const turnos = (await turnosApi.getAgenda(inpFecha.value)) ?? [];
        list.innerHTML = turnos.length
          ? `<table class="table">
              <thead><tr><th>Horario</th><th>Clienta</th><th>Tratamiento</th><th>Gabinete</th><th>Estado</th></tr></thead>
              <tbody>
                ${turnos
                  .map(
                    (t) => `<tr>
                      <td>${formatFecha(t.fecha_hora)}</td>
                      <td>${esc(t.cliente?.nombre ?? t.cliente ?? '')}</td>
                      <td>${esc(t.servicio?.nombre ?? t.servicio ?? '')}</td>
                      <td>${esc(t.gabinete?.nombre ?? t.gabinete ?? '')}</td>
                      <td><span class="badge badge-${esc(t.estado)}">${esc(t.estado)}</span></td>
                    </tr>`
                  )
                  .join('')}
              </tbody>
            </table>`
          : '<p class="muted">No tenés turnos para este día.</p>';
      } catch (err) {
        showAlert(list, err.message);
      }
    }

    inpFecha.addEventListener('change', cargar);
    cargar();
  },
};
