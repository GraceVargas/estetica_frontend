import { esc, loader, showAlert, formData, withLoading } from '../utils/dom.js';

/**
 * Vista genérica de ABM: tabla + formulario de alta + botón eliminar.
 * Se reutiliza para tratamientos, gabinetes, etc.
 *
 * @param {HTMLElement} root
 * @param {{ title, fields: {name,label,type?,required?}[], columns: {key,label}[],
 *           listar: () => Promise<any[]>, crear: (data) => Promise, eliminar?: (id) => Promise }} cfg
 */
export async function renderSimpleCrud(root, cfg) {
  root.innerHTML = `
    <h1>${esc(cfg.title)}</h1>
    <section class="card">
      <h2>Agregar</h2>
      <form id="crud-form" class="form-grid">
        ${cfg.fields
          .map(
            (f) => `
          <label>${esc(f.label)}
            <input name="${f.name}" type="${f.type ?? 'text'}" ${f.required ? 'required' : ''} />
          </label>`
          )
          .join('')}
        <button class="btn btn-primary" type="submit">Guardar</button>
      </form>
      <div id="crud-msg"></div>
    </section>
    <section class="card">
      <div id="crud-list">${loader()}</div>
    </section>
  `;

  const msg = root.querySelector('#crud-msg');
  const list = root.querySelector('#crud-list');

  async function cargar() {
    list.innerHTML = loader();
    try {
      const items = (await cfg.listar()) ?? [];
      if (!items.length) {
        list.innerHTML = '<p class="muted">No hay registros.</p>';
        return;
      }
      list.innerHTML = `
        <table class="table">
          <thead><tr>${cfg.columns.map((c) => `<th>${esc(c.label)}</th>`).join('')}<th></th></tr></thead>
          <tbody>
            ${items
              .map(
                (it) => `
              <tr>
                ${cfg.columns.map((c) => `<td>${esc(it[c.key])}</td>`).join('')}
                <td>${cfg.eliminar ? `<button class="btn btn-danger btn-sm" data-id="${esc(it.id)}">Eliminar</button>` : ''}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`;
    } catch (err) {
      showAlert(list, err.message);
    }
  }

  root.querySelector('#crud-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    try {
      await withLoading(form.querySelector('button'), () => cfg.crear(formData(form)));
      form.reset();
      showAlert(msg, 'Guardado correctamente', 'success');
      cargar();
    } catch (err) {
      showAlert(msg, err.message);
    }
  });

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn || !confirm('¿Eliminar este registro?')) return;
    try {
      await cfg.eliminar(btn.dataset.id);
      cargar();
    } catch (err) {
      showAlert(msg, err.message);
    }
  });

  cargar();
}
