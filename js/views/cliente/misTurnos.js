import * as turnosApi from '../../api/turnos.js';
import {
  esc, loader, showAlert, withLoading,
  formatDia, formatHora, formatPrecio, yaPaso, nombreCompleto,
} from '../../utils/dom.js';

// Mis turnos (API-frontend.md §6):
// - GET /api/reservas            -> reservas vigentes, con servicio y profesional
// - PATCH /api/reservas/:id      -> cambiar a otra franja del mismo profesional
// - DELETE /api/reservas/:id     -> cancelar
// Después de cada acción se vuelve a pedir GET /api/reservas.

export default {
  title: 'Mis turnos',
  async render(root) {
    root.innerHTML = `
      <div class="page-header">
        <h1>Mis turnos</h1>
        <a class="btn btn-primary" href="#/reservar">Reservar un turno</a>
      </div>
      <div id="turnos-msg"></div>
      <div id="turnos-list">${loader()}</div>
    `;

    const msg = root.querySelector('#turnos-msg');
    const list = root.querySelector('#turnos-list');
    let reservas = [];

    async function cargar() {
      list.innerHTML = loader();
      try {
        reservas = (await turnosApi.getMisReservas()) ?? [];
      } catch (err) {
        if (err.status !== 401) showAlert(list, err.message);
        return;
      }

      if (!reservas.length) {
        list.innerHTML = `
          <section class="card center">
            <p class="muted">Todavía no tenés turnos reservados.</p>
            <a class="btn btn-primary" href="#/reservar">Reservar un turno</a>
          </section>`;
        return;
      }

      list.innerHTML = reservas
        .map(
          (r) => `
          <article class="card turno" data-reserva="${esc(r.id)}">
            <div class="turno-info">
              <h3>${esc(r.servicio?.nombre ?? 'Servicio')}</h3>
              <p>${esc(formatDia(r.fecha))} · ${esc(formatHora(r.hora_inicio))} a ${esc(formatHora(r.hora_fin))}</p>
              <p class="muted">con ${esc(nombreCompleto(r.profesional))}</p>
              ${r.servicio?.precio != null ? `<p>${esc(formatPrecio(r.servicio.precio))}</p>` : ''}
            </div>
            <div class="turno-actions">
              ${yaPaso(r)
                ? '<span class="badge">En curso / finalizado</span>'
                : `<button class="btn btn-outline btn-sm" data-cambiar="${esc(r.id)}">Cambiar horario</button>
                   <button class="btn btn-danger btn-sm" data-cancelar="${esc(r.id)}">Cancelar</button>`}
            </div>
            <div class="cambio" hidden></div>
          </article>`
        )
        .join('');
    }

    async function abrirCambio(card, reserva) {
      const panel = card.querySelector('.cambio');
      // Cerrar otros paneles abiertos
      list.querySelectorAll('.cambio').forEach((p) => {
        if (p !== panel) { p.hidden = true; p.innerHTML = ''; }
      });
      if (!panel.hidden) { panel.hidden = true; panel.innerHTML = ''; return; }

      panel.hidden = false;
      panel.innerHTML = loader('Buscando horarios del mismo profesional...');

      let franjas;
      try {
        franjas = ((await turnosApi.getTurnosDisponibles({ profesional_id: reserva.profesional_id })) ?? [])
          .filter((t) => t.estado === 'disponible' && t.id !== reserva.id && !yaPaso(t));
      } catch (err) {
        return showAlert(panel, err.message);
      }

      if (!franjas.length) {
        panel.innerHTML = '<p class="muted">No hay otros horarios disponibles con este profesional.</p>';
        return;
      }

      const fechas = [...new Set(franjas.map((t) => t.fecha))];
      panel.innerHTML = `
        <h4>Elegí el nuevo horario</h4>
        <select class="cambio-fecha">
          ${fechas.map((f) => `<option value="${esc(f)}">${esc(formatDia(f))}</option>`).join('')}
        </select>
        <div class="slots cambio-slots"></div>
        <div class="cambio-acciones">
          <button class="btn btn-primary btn-sm cambio-confirmar" disabled>Confirmar cambio</button>
          <button class="btn btn-link cambio-cerrar">Cerrar</button>
        </div>
        <div class="cambio-msg"></div>`;

      const selFecha = panel.querySelector('.cambio-fecha');
      const slots = panel.querySelector('.cambio-slots');
      const btnOk = panel.querySelector('.cambio-confirmar');
      const panelMsg = panel.querySelector('.cambio-msg');
      let elegido = null;

      function pintarSlots() {
        elegido = null;
        btnOk.disabled = true;
        slots.innerHTML = franjas
          .filter((t) => t.fecha === selFecha.value)
          .map((t) => `<button class="slot" data-turno="${esc(t.id)}">${esc(formatHora(t.hora_inicio))}–${esc(formatHora(t.hora_fin))}</button>`)
          .join('');
      }

      selFecha.addEventListener('change', pintarSlots);
      slots.addEventListener('click', (e) => {
        const b = e.target.closest('.slot');
        if (!b) return;
        slots.querySelectorAll('.slot').forEach((x) => x.classList.remove('selected'));
        b.classList.add('selected');
        elegido = Number(b.dataset.turno);
        btnOk.disabled = false;
      });
      panel.querySelector('.cambio-cerrar').addEventListener('click', () => {
        panel.hidden = true;
        panel.innerHTML = '';
      });
      btnOk.addEventListener('click', async () => {
        if (!elegido) return;
        try {
          await withLoading(btnOk, () => turnosApi.modificarReserva(reserva.id, elegido));
          showAlert(msg, 'Tu turno fue modificado.', 'success');
          cargar();
        } catch (err) {
          if (err.status === 409) {
            // Recargar las franjas y avisar
            panel.hidden = true;
            await abrirCambio(card, reserva);
            const nuevoMsg = panel.querySelector('.cambio-msg');
            if (nuevoMsg) showAlert(nuevoMsg, 'Ese horario ya no está disponible. Elegí otro.');
          } else if (err.status === 500) {
            showAlert(panelMsg, 'El cambio de horario todavía no está disponible. Podés cancelar y reservar de nuevo.');
          } else if (err.status !== 401) {
            showAlert(panelMsg, err.message);
          }
        }
      });

      pintarSlots();
    }

    list.addEventListener('click', async (e) => {
      const btnCambiar = e.target.closest('[data-cambiar]');
      if (btnCambiar) {
        const reserva = reservas.find((r) => String(r.id) === btnCambiar.dataset.cambiar);
        if (reserva) abrirCambio(btnCambiar.closest('.turno'), reserva);
        return;
      }

      const btnCancelar = e.target.closest('[data-cancelar]');
      if (!btnCancelar || !confirm('¿Seguro que querés cancelar?')) return;
      try {
        await withLoading(btnCancelar, () => turnosApi.cancelarReserva(btnCancelar.dataset.cancelar));
        showAlert(msg, 'Turno cancelado.', 'success');
      } catch (err) {
        if (err.status !== 401) showAlert(msg, err.message);
      }
      cargar();
    });

    cargar();
  },
};
