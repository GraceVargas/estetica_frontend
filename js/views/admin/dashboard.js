export default {
  title: 'Administración',
  render(root) {
    const items = [
      { path: '/admin/agenda', title: 'Generar agenda', desc: 'Crear las franjas disponibles de un rango de días hábiles.' },
      { path: '/admin/profesionales', title: 'Profesionales', desc: 'Dar de alta como profesional a un usuario existente.' },
      { path: '/admin/usuarios', title: 'Usuarios', desc: 'Ver, crear y desactivar cuentas de usuarios.' },
    ];

    root.innerHTML = `
      <h1>Administración</h1>
      <section class="features">
        ${items
          .map(
            (i) => `
          <a class="card card-link" href="#${i.path}">
            <h3>${i.title}</h3>
            <p>${i.desc}</p>
          </a>`
          )
          .join('')}
      </section>
      <p class="muted small">
        Editar o desactivar servicios y profesionales, y asignar servicios a profesionales,
        todavía se hace directamente en la base de datos.
      </p>
    `;
  },
};
