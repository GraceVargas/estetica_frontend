import { getServicios, generarTurnos } from '../../api/turnos.js';
import { esc, showAlert, hoyISO, toISODate, parseISODate, esDiaHabil, formatDia } from '../../utils/dom.js';

// Generar agenda (API-frontend.md §6):
// por cada día hábil del rango y por cada servicio -> POST /api/turnos/generar { fecha, servicio_id }.
// Total creado = suma de turnos.length de las respuestas 201. Las franjas repetidas se saltean solas.

const MAX_DIAS = 62;

function diasHabiles(desde, hasta) {
  const dias = [];
  const d = parseISODate(desde);
  const fin = parseISODate(hasta);
  while (d <= fin) {
    const iso = toISODate(d);
    if (esDiaHabil(iso)) dias.push(iso);
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

export default {
  title: 'Generar agenda',
  render(root) {
    const hoy = hoyISO();
    root.innerHTML = `
      <h1>Generar agenda</h1>
      <section class="card">
        <p class="muted">
          Se crean franjas de una hora, de 09:00 a 18:00, de lunes a viernes, para todos los
          profesionales de cada servicio. Si ya existen, no se duplican.
        </p>
        <form id="agenda-form" class="form-grid">
          <label>Desde <input name="desde" type="date" min="${hoy}" value="${hoy}" required /></label>
          <label>Hasta <input name="hasta" type="date" min="${hoy}" value="${hoy}" required /></label>
          <button class="btn btn-primary" type="submit">Generar</button>
        </form>
        <div id="agenda-msg"></div>
        <div id="agenda-progreso" class="muted"></div>
      </section>
    `;

    const form = root.querySelector('#agenda-form');
    const msg = root.querySelector('#agenda-msg');
    const progreso = root.querySelector('#agenda-progreso');
    const btn = form.querySelector('button');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      showAlert(msg, '');
      progreso.innerHTML = '';
      const desde = form.desde.value;
      const hasta = form.hasta.value;

      if (hasta < desde) return showAlert(msg, 'La fecha "hasta" no puede ser anterior a "desde".');
      const dias = diasHabiles(desde, hasta);
      if (!dias.length) return showAlert(msg, 'El rango no tiene días hábiles (lunes a viernes).');
      if (dias.length > MAX_DIAS) return showAlert(msg, `Elegí un rango de hasta ${MAX_DIAS} días hábiles.`);

      btn.disabled = true;
      btn.textContent = 'Generando...';
      let total = 0;
      const errores = [];

      try {
        const servicios = (await getServicios()) ?? [];
        if (!servicios.length) throw new Error('No hay servicios activos.');

        const pasos = dias.length * servicios.length;
        let hechos = 0;

        for (const fecha of dias) {
          for (const s of servicios) {
            try {
              const res = await generarTurnos(fecha, s.id);
              // 201 -> [Turno] generados; 200 -> { mensaje } (no había nada nuevo)
              total += Array.isArray(res) ? res.length : 0;
            } catch (err) {
              if (err.status === 401 || err.status === 403) throw err;
              errores.push(`${formatDia(fecha)} · ${s.nombre}: ${err.message}`);
            }
            hechos++;
            progreso.textContent = `Procesando ${hechos} de ${pasos}...`;
          }
        }

        progreso.textContent = '';
        showAlert(
          msg,
          total
            ? `Listo: se crearon ${total} turnos en ${dias.length} día(s) hábil(es).`
            : 'No había franjas nuevas para generar (ya existían).',
          'success'
        );
        if (errores.length) {
          progreso.innerHTML = `
            <div class="alert alert-error">
              <strong>Hubo ${errores.length} error(es):</strong>
              <ul>${errores.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>`;
        }
      } catch (err) {
        progreso.textContent = '';
        if (err.status !== 401) showAlert(msg, err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Generar';
      }
    });
  },
};
