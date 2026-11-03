import { register, extraerToken } from '../../api/usuarios.js';
import { saveToken, popRedirect } from '../../auth/session.js';
import { showAlert, formData, withLoading } from '../../utils/dom.js';

export default {
  title: 'Registro',
  render(root) {
    root.innerHTML = `
      <section class="card card-narrow">
        <h1>Crear cuenta</h1>
        <form id="register-form" class="form">
          <label>Nombre <input name="nombre" required /></label>
          <label>Apellido <input name="apellido" required /></label>
          <label>Email <input name="email" type="email" required autocomplete="email" /></label>
          <label>Contraseña <input name="password" type="password" minlength="6" required autocomplete="new-password" /></label>
          <label>Repetir contraseña <input name="password2" type="password" required autocomplete="new-password" /></label>
          <button class="btn btn-primary" type="submit">Registrarme</button>
        </form>
        <div id="register-msg"></div>
        <p class="muted">¿Ya tenés cuenta? <a href="#/login">Ingresá</a></p>
      </section>
    `;

    const form = root.querySelector('#register-form');
    const msg = root.querySelector('#register-msg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { password2, ...datos } = formData(form);
      if (datos.password !== password2) return showAlert(msg, 'Las contraseñas no coinciden');

      try {
        const data = await withLoading(form.querySelector('button'), () => register(datos));
        const token = extraerToken(data);
        if (token) {
          const destino = popRedirect();
          saveToken(token);
          window.location.hash = '#' + (destino ?? '/reservar');
        } else {
          window.location.hash = '#/login';
        }
      } catch (err) {
        const texto =
          err.status === 409 ? 'Ese email ya está registrado'
          : err.status === 400 ? 'Revisá los datos: todos los campos son obligatorios.'
          : err.message;
        showAlert(msg, texto);
      }
    });
  },
};
