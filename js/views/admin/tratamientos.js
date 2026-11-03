import { tratamientos } from '../../api/turnos.js';
import { renderSimpleCrud } from '../../components/simpleCrud.js';

// TODO: ajustar campos según el esquema de la tabla servicio en Supabase
export default {
  title: 'Tratamientos',
  render(root) {
    return renderSimpleCrud(root, {
      title: 'Tratamientos',
      fields: [
        { name: 'nombre', label: 'Nombre', required: true },
        { name: 'duracion_min', label: 'Duración (min)', type: 'number', required: true },
        { name: 'precio', label: 'Precio', type: 'number' },
      ],
      columns: [
        { key: 'nombre', label: 'Nombre' },
        { key: 'duracion_min', label: 'Duración (min)' },
        { key: 'precio', label: 'Precio' },
      ],
      listar: tratamientos.listar,
      crear: tratamientos.crear,
      eliminar: tratamientos.eliminar,
    });
  },
};
