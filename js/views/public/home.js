import { getUser } from '../../auth/session.js';

export default {
  title: 'Inicio',
  render(root) {
    const user = getUser();
    const cta = `<a class="btn btn-primary" href="#/reservar">Reservá tu turno</a>
      ${user
        ? `<a class="btn btn-outline" href="#/mis-turnos">Mis turnos</a>`
        : `<a class="btn btn-outline" href="#/servicios">Ver servicios</a>`}`;

    root.innerHTML = `
      <section class="hero">
        <h1>Estética Natura Balance</h1>
        <p>Elegí tu tratamiento, tu profesional y el horario que mejor te quede. Sin esperar respuestas por mensaje.</p>
        <div class="hero-actions">${cta}</div>
      </section>
      <section class="features">
        <a class="card card-link" href="#/servicios"><h3>1. Elegí el servicio</h3><p>Conocé todos los tratamientos faciales y corporales.</p></a>
        <a class="card card-link" href="#/equipo"><h3>2. Elegí la profesional</h3><p>Conocé al equipo y qué hace cada una.</p></a>
        <a class="card card-link" href="#/reservar"><h3>3. Reservá el horario</h3><p>Ves la disponibilidad real y confirmás al instante.</p></a>
      </section>
    `;
  },
};
