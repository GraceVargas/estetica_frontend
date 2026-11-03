import { gabinetes } from '../../api/turnos.js';
import { renderSimpleCrud } from '../../components/simpleCrud.js';

// TODO: ajustar campos según el esquema de la tabla gabinete en Supabase
export default {
  title: 'Gabinetes',
  render(root) {
    return renderSimpleCrud(root, {
      title: 'Gabinetes',
      fields: [
        { name: 'nombre', label: 'Nombre', required: true },
        { name: 'descripcion', label: 'Descripción' },
      ],
      columns: [
        { key: 'nombre', label: 'Nombre' },
        { key: 'descripcion', label: 'Descripción' },
      ],
      listar: gabinetes.listar,
      crear: gabinetes.crear,
      eliminar: gabinetes.eliminar,
    });
  },
};
