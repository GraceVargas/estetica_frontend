export default {
  title: 'No encontrado',
  render(root) {
    root.innerHTML = `
      <section class="card card-narrow center">
        <h1>404</h1>
        <p>La página que buscás no existe.</p>
        <a class="btn btn-primary" href="#/">Volver al inicio</a>
      </section>
    `;
  },
};
