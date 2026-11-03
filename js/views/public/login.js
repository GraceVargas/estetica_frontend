import { login, extraerToken } from '../../api/usuarios.js';
import { saveToken, getUser, popRedirect } from '../../auth/session.js';
import { HOME_POR_ROL } from '../../constants/roles.js';
import { showAlert, formData, withLoading } from '../../utils/dom.js';

export default {
  title: 'Ingresar',
  render(root) {
    root.innerHTML = `
      <section class="card card-narrow">
        <h1>Ingresar</h1>
        <form id="login-form" class="form">
          <label>Email <input name="email" type="email" required autocomplete="email" /></label>
          <label>Contraseña <input name="password" type="password" required autocomplete="current-password" /></label>
          <button class="btn btn-primary" type="submit">Ingresar</button>
        </form>
        <div id="login-msg"></div>
        <p class="muted">¿No tenés cuenta? <a href="#/registro">Registrate</a></p>
      </section>
    `;

    const form = root.querySelector('#login-form');
    const msg = root.querySelector('#login-msg');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { email, password } = formData(form);
      try {
        const data = await withLoading(form.querySelector('button'), () => login(email, password));
        const token = extraerToken(data);
        if (!token) throw new Error('Respuesta de login inválida');
        // Si venía de confirmar una reserva, volver ahí
        const destino = popRedirect();
        saveToken(token);
        window.location.hash = '#' + (destino ?? HOME_POR_ROL[getUser()?.rol] ?? '/');
      } catch (err) {
        const texto =
          err.status === 401 ? 'Email o contraseña incorrectos'
          : err.status === 403 ? 'Tu cuenta está deshabilitada'
          : err.message;
        showAlert(msg, texto);
      }
    });
  },
};
