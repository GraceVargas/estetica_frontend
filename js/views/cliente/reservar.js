import * as turnosApi from '../../api/turnos.js';
import { getUser, setRedirect } from '../../auth/session.js';
import {
  esc, loader, showAlert, hoyISO, toISODate, parseISODate, withLoading,
  formatDia, formatHora, formatPrecio, esDiaHabil, yaPaso, nombreCompleto,
} from '../../utils/dom.js';

// Flujo de reserva (API-frontend.md §6):
// filtros (servicio / profesional / día, todos opcionales) -> grilla día × horario -> confirmar.
// Si no hay sesión al confirmar, se guarda la selección, se va al login y se vuelve acá.
//
// Los filtros se mandan a GET /api/turnos (servicio_id, profesional_id, fecha). Sin fecha,
// la API devuelve todos los días desde hoy y la grilla muestra la semana elegida.
// Además se vuelve a filtrar en el frontend por las dudas, y se ocultan las franjas de hoy
// que ya pasaron (la API las incluye).

const PENDIENTE_KEY = 'nb_reserva_pendiente';
const HORAS_DEFAULT = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

function guardarPendiente(data) {
  sessionStorage.setItem(PENDIENTE_KEY, JSON.stringify(data));
}

function tomarPendiente() {
  try {
    const data = JSON.parse(sessionStorage.getItem(PENDIENTE_KEY) ?? 'null');
    sessionStorage.removeItem(PENDIENTE_KEY);
    return data;
  } catch {
    return null;
  }
}

function queryParams() {
  const qs = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(qs);
}

/** La API puede devolver 'YYYY-MM-DD' o un ISO con hora: nos quedamos con el día */
const diaDe = (t) => String(t.fecha ?? '').slice(0, 10);

function sumarDias(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Lunes de la semana que contiene `iso` */
function lunesDe(iso) {
  const d = parseISODate(iso);
  const dia = d.getDay() || 7; // domingo = 7
  d.setDate(d.getDate() - (dia - 1));
  return toISODate(d);
}

/** Semana inicial: la del próximo día hábil (un sábado muestra la semana siguiente) */
function semanaActual() {
  let iso = hoyISO();
  while (!esDiaHabil(iso)) iso = sumarDias(iso, 1);
  return lunesDe(iso);
}

const formatCorto = (iso) =>
  parseISODate(iso).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'numeric' });

const view = {
  title: 'Reservar turno',
  async render(root) {
    root.innerHTML = `<h1>Reservar turno</h1><div id="reserva-body">${loader()}</div>`;
    const body = root.querySelector('#reserva-body');

    let catalogo;
    try {
      catalogo = await turnosApi.getCatalogo();
    } catch (err) {
      return showAlert(body, err.message);
    }
    const { servicios, profesionales } = catalogo;
    const servicioPorId = new Map(servicios.map((s) => [s.id, s]));
    const profesionalPorId = new Map(profesionales.map((p) => [p.id, p]));
    // Cada profesional trae `servicios` (los que hace)
    const profesHacen = (servicioId) =>
      new Set(profesionales.filter((p) => p.servicios.some((s) => s.id === servicioId)).map((p) => p.id));
    const serviciosDe = (profesionalId) =>
      new Set((profesionalPorId.get(profesionalId)?.servicios ?? []).map((s) => s.id));

    const pendiente = tomarPendiente();
    const params = queryParams();
    const state = {
      servicioId: pendiente?.servicioId ?? (Number(params.get('servicio')) || null),
      profesionalId: pendiente?.profesionalId ?? null,
      fecha: pendiente?.fecha ?? '', // vacío = semana completa
      semana: pendiente?.semana ?? semanaActual(),
      turnoId: pendiente?.turnoId ?? null,
      todos: [], // franjas que devolvió la API para los filtros actuales
    };
    let pedidoActual = 0; // para descartar respuestas viejas si el usuario cambia rápido los filtros

    body.innerHTML = `
      <div id="reserva-msg"></div>

      <section class="card">
        <h2>Filtrar</h2>
        <div class="filtros">
          <label>Servicio
            <select id="sel-servicio"></select>
          </label>
          <label>Profesional
            <select id="sel-profesional"></select>
          </label>
          <label>Día
            <input id="inp-fecha" type="date" min="${hoyISO()}" />
          </label>
        </div>
        <p class="muted small">Atendemos de lunes a viernes, de 9 a 18 h.</p>
      </section>

      <section class="card">
        <div class="grilla-header">
          <button id="btn-semana-ant" type="button" class="btn btn-outline btn-sm">&larr; Anterior</button>
          <h2 id="grilla-titulo"></h2>
          <button id="btn-semana-sig" type="button" class="btn btn-outline btn-sm">Siguiente &rarr;</button>
          <button id="btn-ver-semana" type="button" class="btn btn-outline btn-sm" hidden>Ver toda la semana</button>
        </div>
        <div id="horarios">${loader('Buscando horarios...')}</div>
      </section>

      <section class="card">
        <h2>Confirmar</h2>
        <div id="resumen" class="muted">Elegí un horario en la grilla.</div>
        <button id="btn-confirmar" class="btn btn-primary" disabled>Confirmar reserva</button>
      </section>
    `;

    const msg = body.querySelector('#reserva-msg');
    const selServicio = body.querySelector('#sel-servicio');
    const selProfesional = body.querySelector('#sel-profesional');
    const inpFecha = body.querySelector('#inp-fecha');
    const horarios = body.querySelector('#horarios');
    const titulo = body.querySelector('#grilla-titulo');
    const btnAnt = body.querySelector('#btn-semana-ant');
    const btnSig = body.querySelector('#btn-semana-sig');
    const btnVerSemana = body.querySelector('#btn-ver-semana');
    const resumen = body.querySelector('#resumen');
    const btnConfirmar = body.querySelector('#btn-confirmar');

    // ---------- Filtros ----------

    function pintarFiltros() {
      // Servicios: si hay profesional elegido, solo los que hace
      const servPermitidos = state.profesionalId ? serviciosDe(state.profesionalId) : null;
      const listaServ = servicios.filter((s) => !servPermitidos || servPermitidos.has(s.id));
      if (state.servicioId && !listaServ.some((s) => s.id === state.servicioId)) state.servicioId = null;
      selServicio.innerHTML =
        '<option value="">Todos los servicios</option>' +
        listaServ
          .map((s) => `<option value="${esc(s.id)}">${esc(s.nombre)} · ${esc(formatPrecio(s.precio))}</option>`)
          .join('');
      selServicio.value = state.servicioId ?? '';

      // Profesionales: si hay servicio elegido, solo los que lo hacen
      const profPermitidos = state.servicioId ? profesHacen(state.servicioId) : null;
      const listaProf = profesionales.filter((p) => !profPermitidos || profPermitidos.has(p.id));
      if (state.profesionalId && !listaProf.some((p) => p.id === state.profesionalId)) state.profesionalId = null;
      selProfesional.innerHTML =
        '<option value="">Cualquier profesional</option>' +
        listaProf.map((p) => `<option value="${esc(p.id)}">${esc(nombreCompleto(p))}</option>`).join('');
      selProfesional.value = state.profesionalId ?? '';

      inpFecha.value = state.fecha;
    }

    /** Días (columnas) que muestra la grilla */
    function diasVisibles() {
      if (state.fecha) return [state.fecha];
      const hoy = hoyISO();
      return [0, 1, 2, 3, 4].map((i) => sumarDias(state.semana, i)).filter((d) => d >= hoy);
    }

    /** Franjas que cumplen todos los filtros, dentro de los días visibles */
    function turnosFiltrados() {
      const dias = new Set(diasVisibles());
      const profPermitidos = state.servicioId ? profesHacen(state.servicioId) : null;
      return state.todos.filter(
        (t) =>
          dias.has(diaDe(t)) &&
          (!state.profesionalId || t.profesional_id === state.profesionalId) &&
          (!profPermitidos || profPermitidos.has(t.profesional_id))
      );
    }

    const turnoElegido = () => state.todos.find((t) => t.id === state.turnoId) ?? null;

    // ---------- Grilla ----------

    function pintarGrilla() {
      const dias = diasVisibles();
      const turnos = turnosFiltrados();

      // Si la franja elegida quedó fuera de los filtros, se deselecciona
      if (state.turnoId && !turnos.some((t) => t.id === state.turnoId)) state.turnoId = null;

      // Encabezado y navegación
      const enSemana = !state.fecha;
      btnAnt.hidden = btnSig.hidden = !enSemana;
      btnVerSemana.hidden = enSemana;
      btnAnt.disabled = state.semana <= semanaActual();
      titulo.textContent = enSemana
        ? `Semana del ${parseISODate(state.semana).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
        : formatDia(state.fecha);

      if (state.fecha && !esDiaHabil(state.fecha)) {
        horarios.innerHTML = '<p class="muted">Ese día no atendemos. Elegí un día de lunes a viernes.</p>';
        // (cargarTurnos no consulta la API para sábados y domingos)
        actualizarResumen();
        return;
      }
      if (!dias.length) {
        horarios.innerHTML = '<p class="muted">No quedan días hábiles en esta semana.</p>';
        actualizarResumen();
        return;
      }

      // Índice día|hora -> franjas
      const celdas = new Map();
      const horas = new Set(HORAS_DEFAULT);
      for (const t of turnos) {
        const hora = formatHora(t.hora_inicio);
        horas.add(hora);
        const key = `${diaDe(t)}|${hora}`;
        if (!celdas.has(key)) celdas.set(key, []);
        celdas.get(key).push(t);
      }
      const filas = [...horas].sort();

      const boton = (t) => {
        const prof = profesionalPorId.get(t.profesional_id);
        const label = state.profesionalId ? 'Libre' : (prof?.nombre ?? nombreCompleto(prof));
        return `<button type="button" class="slot slot-celda ${t.id === state.turnoId ? 'selected' : ''}"
          data-turno="${esc(t.id)}" title="${esc(nombreCompleto(prof))} · ${esc(formatHora(t.hora_inicio))}–${esc(formatHora(t.hora_fin))}">${esc(label)}</button>`;
      };

      horarios.innerHTML = `
        ${turnos.length ? '' : `<p class="muted">No hay horarios disponibles ${state.fecha ? 'ese día' : 'esta semana'} con los filtros elegidos.</p>`}
        <div class="grilla-wrap">
          <table class="grilla">
            <thead>
              <tr>
                <th scope="col">Hora</th>
                ${dias.map((d) => `<th scope="col">${esc(formatCorto(d))}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${filas
                .map(
                  (h) => `
                <tr>
                  <th scope="row">${esc(h)}</th>
                  ${dias
                    .map((d) => {
                      const lista = (celdas.get(`${d}|${h}`) ?? []).sort((a, b) =>
                        nombreCompleto(profesionalPorId.get(a.profesional_id))
                          .localeCompare(nombreCompleto(profesionalPorId.get(b.profesional_id)))
                      );
                      return `<td>${lista.length ? lista.map(boton).join('') : '<span class="celda-vacia">—</span>'}</td>`;
                    })
                    .join('')}
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`;
      actualizarResumen();
    }

    function actualizarResumen() {
      const turno = turnoElegido();
      const servicio = servicioPorId.get(state.servicioId);
      btnConfirmar.disabled = !(turno && servicio);
      if (!turno) {
        resumen.innerHTML = 'Elegí un horario en la grilla.';
        return;
      }
      const prof = profesionalPorId.get(turno.profesional_id);
      resumen.innerHTML = `
        <p><strong>${esc(servicio?.nombre ?? 'Servicio sin elegir')}</strong> con <strong>${esc(nombreCompleto(prof) || 'profesional')}</strong></p>
        <p>${esc(formatDia(diaDe(turno)))}, de ${esc(formatHora(turno.hora_inicio))} a ${esc(formatHora(turno.hora_fin))}</p>
        ${servicio
          ? `<p>${esc(formatPrecio(servicio.precio))}</p>`
          : '<p class="alert alert-info">Elegí un servicio en los filtros para poder confirmar.</p>'}`;
    }

    async function cargarTurnos() {
      const pedido = ++pedidoActual;
      if (state.fecha && !esDiaHabil(state.fecha)) {
        state.todos = [];
        pintarGrilla();
        return true;
      }
      horarios.innerHTML = loader('Buscando horarios...');
      try {
        const lista = (await turnosApi.getTurnosDisponibles({
          servicio_id: state.servicioId ?? undefined,
          profesional_id: state.profesionalId ?? undefined,
          fecha: state.fecha || undefined,
        })) ?? [];
        if (pedido !== pedidoActual) return false; // llegó una respuesta más nueva
        // Solo franjas libres, futuras, de profesionales activos y en días hábiles
        state.todos = lista.filter(
          (t) =>
            t.estado === 'disponible' &&
            profesionalPorId.has(t.profesional_id) &&
            diaDe(t) >= hoyISO() &&
            esDiaHabil(diaDe(t)) &&
            !yaPaso({ ...t, fecha: diaDe(t) })
        );
      } catch (err) {
        if (pedido !== pedidoActual) return false;
        state.todos = [];
        showAlert(horarios, err.message);
        return false;
      }
      pintarGrilla();
      return true;
    }

    function mostrarConfirmacion(reserva) {
      const servicio = servicioPorId.get(reserva.servicio_id) ?? servicioPorId.get(state.servicioId);
      const prof = profesionalPorId.get(reserva.profesional_id);
      body.innerHTML = `
        <section class="card confirmacion">
          <h2>¡Turno reservado!</h2>
          <dl class="detalle">
            <dt>Servicio</dt><dd>${esc(servicio?.nombre ?? '')}</dd>
            <dt>Profesional</dt><dd>${esc(nombreCompleto(prof))}</dd>
            <dt>Fecha</dt><dd>${esc(formatDia(diaDe(reserva)))}</dd>
            <dt>Horario</dt><dd>${esc(formatHora(reserva.hora_inicio))} a ${esc(formatHora(reserva.hora_fin))}</dd>
            ${servicio ? `<dt>Precio</dt><dd>${esc(formatPrecio(servicio.precio))}</dd>` : ''}
          </dl>
          <div class="hero-actions">
            <a class="btn btn-primary" href="#/mis-turnos">Ver mis turnos</a>
            <button id="btn-otro" class="btn btn-outline">Reservar otro turno</button>
          </div>
        </section>`;
      body.querySelector('#btn-otro').addEventListener('click', () => view.render(root));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ---------- Eventos ----------

    selServicio.addEventListener('change', () => {
      state.servicioId = Number(selServicio.value) || null;
      pintarFiltros();
      cargarTurnos();
    });

    selProfesional.addEventListener('change', () => {
      state.profesionalId = Number(selProfesional.value) || null;
      pintarFiltros();
      cargarTurnos();
    });

    inpFecha.addEventListener('change', () => {
      state.fecha = inpFecha.value;
      if (state.fecha) state.semana = lunesDe(state.fecha);
      cargarTurnos();
    });

    btnVerSemana.addEventListener('click', () => {
      state.fecha = '';
      inpFecha.value = '';
      cargarTurnos();
    });

    btnAnt.addEventListener('click', () => {
      state.semana = sumarDias(state.semana, -7);
      pintarGrilla();
    });

    btnSig.addEventListener('click', () => {
      state.semana = sumarDias(state.semana, 7);
      pintarGrilla();
    });

    horarios.addEventListener('click', (e) => {
      const btn = e.target.closest('.slot');
      if (!btn) return;
      horarios.querySelectorAll('.slot.selected').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.turnoId = Number(btn.dataset.turno);
      actualizarResumen();
    });

    btnConfirmar.addEventListener('click', async () => {
      const turno = turnoElegido();
      if (!turno || !state.servicioId) return;

      // Sin sesión: guardar la selección, ir al login y volver acá
      if (!getUser()) {
        guardarPendiente({
          servicioId: state.servicioId,
          profesionalId: state.profesionalId,
          fecha: state.fecha,
          semana: state.semana,
          turnoId: state.turnoId,
        });
        setRedirect('/reservar');
        window.location.hash = '#/login';
        return;
      }

      try {
        // 201 -> devuelve el Turno ya reservado
        const reservado = await withLoading(btnConfirmar, () => turnosApi.crearReserva(turno.id, state.servicioId));
        mostrarConfirmacion(reservado?.id ? reservado : { ...turno, servicio_id: state.servicioId });
      } catch (err) {
        if (err.status === 404 || err.status === 409 || err.status === 422) {
          const textos = {
            404: 'Ese horario ya no está disponible. Elegí otro.',
            409: 'Ese horario acaba de ser tomado. Elegí otro.',
            422: 'Ese profesional no realiza el servicio elegido. Elegí otro horario.',
          };
          showAlert(msg, textos[err.status]);
          state.turnoId = null;
          cargarTurnos();
        } else if (err.status !== 401) {
          showAlert(msg, err.message);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // ---------- Estado inicial ----------

    if (state.servicioId && !servicioPorId.has(state.servicioId)) state.servicioId = null;
    if (state.fecha && state.fecha < hoyISO()) state.fecha = '';
    if (state.semana < semanaActual()) state.semana = semanaActual();
    pintarFiltros();
    const ok = await cargarTurnos();

    if (pendiente && ok) {
      showAlert(
        msg,
        turnoElegido()
          ? 'Revisá los datos y confirmá tu reserva.'
          : 'El horario que habías elegido ya no está disponible. Elegí otro.',
        turnoElegido() ? 'info' : 'error'
      );
    }
  },
};

export default view;
