# API de Turnos: guía para el frontend

Este documento describe qué rutas ofrece la API de Turnos y qué pantallas y funcionalidades tiene que construir el frontend con ellas.

---

## 1. Datos generales

| | |
|---|---|
| **URL base (producción)** | `https://backendturnos.vercel.app` *(a completar)* |
| **URL base (local)** | `http://localhost:3001` |
| **Formato** | JSON. Enviar `Content-Type: application/json` en los `POST` y `PATCH`. |
| **CORS** | Abierto. Se puede llamar desde cualquier origen. |
| **Fechas** | Texto `YYYY-MM-DD` (ej. `2026-11-03`). |
| **Horas** | Texto `HH:MM:SS` (ej. `09:00:00`). Zona horaria: Argentina. |
| **IDs numéricos** | En los body van como **número** (`1`), no como texto (`"1"`). Si van como texto, la API responde `400`. |

---

## 2. Autenticación

Esta API **no tiene login**. El usuario inicia sesión en la **API de Usuarios** (`https://backend-usuarios.vercel.app`), que devuelve un token JWT. Ese mismo token se envía a esta API en cada ruta protegida:

```
Authorization: Bearer <token>
```

El token trae (se puede leer decodificándolo, sin verificar):

```json
{
  "id": "665f1c2a9b3e4d0012a7c3f1",
  "rol": "administrador",
  "exp": 1793562282
}
```

- `rol` sirve para mostrar u ocultar funciones de administrador (`"administrador"`).
- `exp` es el vencimiento, en segundos desde 1970. Hoy los tokens duran **1 hora**.

| Respuesta | Qué hacer en el frontend |
|---|---|
| `401` | Falta el token, es inválido o venció. Redirigir al login. |
| `403` | El usuario no tiene permiso (ej. no es administrador). Mostrar un mensaje y no reintentar. |

---

## 3. Formato de errores

Todas las respuestas de error tienen esta forma:

```json
{
  "mensaje": "Texto legible para mostrar al usuario",
  "error": "Detalle técnico (a veces)"
}
```

Se puede mostrar `mensaje` directamente al usuario. `error` es para depurar.

---

## 4. Modelos de datos

**Servicio**

```json
{
  "id": 1,
  "nombre": "Limpieza facial",
  "categoria": "Tratamiento facial",
  "descripcion": "Punta de diamante, extracciones manuales...",
  "duracion": 60,
  "precio": 50000,
  "activo": true
}
```

`duracion` está en minutos y `precio` en pesos, sin decimales. Todos los servicios duran 60 minutos.

**Profesional**

```json
{
  "id": 7,
  "nombre": "Martín",
  "apellido": "Sosa",
  "especialidad": "Tratamientos faciales y corporales",
  "activo": true,
  "usuario_id": "665f1d7b2c8a4e0019b5d2e4",
  "servicios": [
    { "id": 2, "nombre": "Masaje descontracturante", "categoria": "Tratamiento corporal", "duracion": 60, "precio": 35000 }
  ]
}
```

`servicios` trae los servicios activos que hace el profesional, ordenados por `id`.

**Turno** (una franja horaria de un profesional)

```json
{
  "id": 1501,
  "profesional_id": 7,
  "servicio_id": null,
  "usuario_id": null,
  "fecha": "2026-11-03",
  "hora_inicio": "10:00:00",
  "hora_fin": "11:00:00",
  "estado": "disponible"
}
```

- `estado` es `"disponible"` o `"reservado"`.
- Mientras está disponible, `servicio_id` y `usuario_id` son `null`. Al reservarse, se completan.

---

## 5. Rutas

### Resumen

| Método | Ruta | Requiere token | Para qué |
|---|---|---|---|
| `GET` | `/api/servicios` | No | Catálogo de servicios |
| `GET` | `/api/profesionales` | No | Profesionales con los servicios que hacen (con filtro) |
| `GET` | `/api/turnos` | No | Franjas disponibles (con filtros) |
| `GET` | `/api/reservas` | Sí | Mis reservas |
| `POST` | `/api/reservas` | Sí | Reservar una franja |
| `PATCH` | `/api/reservas/:id` | Sí | Cambiar una reserva a otra franja |
| `DELETE` | `/api/reservas/:id` | Sí | Cancelar una reserva |
| `POST` | `/api/turnos/generar` | Sí, administrador | Generar franjas de un día |
| `POST` | `/api/profesionales` | Sí, administrador | Dar de alta un profesional |

---

### `GET /api/servicios`

Devuelve los servicios activos.

```
200 → [ Servicio, ... ]
```

### `GET /api/profesionales`

Devuelve los profesionales activos, cada uno con los servicios que hace (`servicios`). Filtro opcional:

| Parámetro | Ejemplo | Filtra por |
|---|---|---|
| `servicio_id` | `2` | Solo los profesionales que hacen ese servicio |

```
GET /api/profesionales?servicio_id=2

200 → [ Profesional, ... ]   (lista vacía si nadie hace ese servicio)
400 → servicio_id con formato incorrecto
```

> La ruta `/api/profesionalServicio` ya no existe: usar esta.

### `GET /api/turnos`

Devuelve las franjas **disponibles** desde hoy, ordenadas por fecha y hora. Todos los filtros son opcionales y se pueden combinar:

| Parámetro | Ejemplo | Filtra por |
|---|---|---|
| `fecha` | `2026-11-03` | Un día |
| `profesional_id` | `7` | Un profesional |
| `servicio_id` | `2` | Profesionales que hacen ese servicio |

```
GET /api/turnos?servicio_id=2&fecha=2026-11-03

200 → [ Turno, ... ]
400 → algún filtro con formato incorrecto
```

> ⚠️ El filtro es por **día**: hoy se devuelven también las franjas de horas que ya pasaron. El frontend debe ocultar las de hoy cuya `hora_inicio` ya pasó.

> 💡 Sin filtros, la respuesta trae todo el mes (cientos de franjas). Conviene pedir siempre por `servicio_id` y `fecha`.

---

### `GET /api/reservas`

Devuelve las reservas vigentes del usuario del token: desde hoy, ordenadas por fecha y hora. Cada reserva es un Turno, con los datos del servicio y del profesional incluidos, lista para mostrar.

```json
[
  {
    "id": 1244,
    "profesional_id": 10,
    "servicio_id": 13,
    "usuario_id": "665f1c2a9b3e4d0012a7c3f1",
    "fecha": "2026-11-30",
    "hora_inicio": "17:00:00",
    "hora_fin": "18:00:00",
    "estado": "reservado",
    "servicio": {
      "id": 13,
      "nombre": "Radiofrecuencia",
      "categoria": "Tratamiento corporal",
      "duracion": 60,
      "precio": 45000
    },
    "profesional": {
      "id": 10,
      "nombre": "Nicolás",
      "apellido": "Herrera",
      "especialidad": "Tratamientos faciales y corporales"
    }
  }
]
```

| Código | Significado |
|---|---|
| `200` | Lista de reservas. Si no tiene ninguna, `[]`. |
| `401` | Sin sesión. |

> Igual que en `/api/turnos`, hoy se incluyen también las reservas de horas que ya pasaron.

### `POST /api/reservas`

Reserva una franja para un servicio. El usuario se toma del token.

```json
{
  "turno_id": 1501,
  "servicio_id": 2
}
```

| Código | Significado | Qué hacer |
|---|---|---|
| `201` | Reservado. Devuelve el Turno ya reservado. | Mostrar confirmación. |
| `400` | Datos con formato incorrecto. | Error de programación: revisar el body. |
| `401` | Sin sesión. | Ir al login. |
| `404` | La franja no existe, ya no está disponible o es de una fecha pasada. | Avisar y recargar las franjas. |
| `409` | Otro usuario la reservó un instante antes. | Avisar ("Ese horario acaba de ser tomado") y recargar las franjas. |
| `422` | El profesional de esa franja no hace ese servicio. | Error de programación: la franja no corresponde al servicio elegido. |

### `PATCH /api/reservas/:id`

Cambia una reserva del usuario a **otra franja del mismo profesional**. `:id` es el `id` del turno reservado actualmente. El servicio se mantiene.

```json
{
  "nuevo_turno_id": 1505
}
```

| Código | Significado |
|---|---|
| `200` | Modificada. Devuelve el Turno de la **nueva** franja. La anterior queda libre. |
| `400` | Formato incorrecto, o la nueva franja es la misma que la actual. |
| `401` | Sin sesión. |
| `404` | La reserva no existe o no es del usuario. |
| `409` | La nueva franja no está disponible, es de otro profesional o es de una fecha pasada. Recargar las franjas. |

Para elegir la nueva franja, pedir `GET /api/turnos?profesional_id=<profesional de la reserva>`.

### `DELETE /api/reservas/:id`

Cancela una reserva del usuario. La franja vuelve a quedar disponible.

| Código | Significado |
|---|---|
| `200` | Cancelada. Devuelve el Turno liberado (`estado: "disponible"`). |
| `400` | `:id` con formato incorrecto. |
| `401` | Sin sesión. |
| `404` | La reserva no existe o no es del usuario. |

---

### `POST /api/turnos/generar` (administrador)

Genera las franjas disponibles de **un día** para los profesionales que hacen un servicio. Las franjas son de lunes a viernes, de 09:00 a 18:00, de una hora cada una. Si ya existen, no se duplican.

```json
{
  "fecha": "2026-12-01",
  "servicio_id": 1
}
```

| Código | Significado |
|---|---|
| `201` | Generadas. Devuelve `[Turno, ...]` con las franjas generadas. |
| `200` | No había nada para generar (ya existían, o ningún profesional hace ese servicio). Devuelve `{ mensaje }`. |
| `400` | Formato incorrecto, o la fecha cae sábado o domingo. |
| `401` / `403` | Sin sesión / no es administrador. |
| `404` | El servicio no existe. |

> Para generar un día completo para todos los profesionales, llamar una vez por cada servicio. Las franjas repetidas se saltean solas.

### `POST /api/profesionales` (administrador)

Da de alta como profesional a un usuario que ya existe en la API de Usuarios con rol `profesional`. El nombre y el apellido se toman de esa API.

```json
{
  "usuario_id": "665f1d7b2c8a4e0019b5d2e4",
  "especialidad": "Tratamientos faciales"
}
```

| Código | Significado |
|---|---|
| `201` | Creado. Devuelve el Profesional creado. |
| `400` | Faltan datos. |
| `401` / `403` | Sin sesión / no es administrador. |
| `404` | El usuario no existe en la API de Usuarios. |
| `409` | Ese usuario ya es profesional. |
| `422` | El usuario no tiene rol `profesional` o está inactivo. |

---

## 6. Funcionalidades a construir

### Para cualquier visitante (sin sesión)

**Catálogo de servicios**
- Lista de servicios con nombre, categoría, descripción, duración y precio (`GET /api/servicios`).
- Agrupar o filtrar por `categoria` ("Tratamiento facial", "Tratamiento corporal").

**Equipo**
- Lista de profesionales con su especialidad (`GET /api/profesionales`).
- Opcional: mostrar qué servicios hace cada uno (vienen en `servicios` de cada profesional).

### Para usuarios con sesión

**Reservar un turno.** Flujo sugerido:

```
1. Elegir servicio            → GET /api/servicios
2. (Opcional) elegir profesional
                              → GET /api/profesionales?servicio_id=X
                                (solo los que hacen ese servicio)
3. Elegir día                 → calendario de lunes a viernes, desde hoy
4. Elegir horario             → GET /api/turnos?servicio_id=X&fecha=Y[&profesional_id=Z]
                                Mostrar hora_inicio–hora_fin y el nombre del profesional.
                                Ocultar horarios de hoy que ya pasaron.
5. Confirmar                  → POST /api/reservas { turno_id, servicio_id }
6. Pantalla de confirmación con servicio, profesional, fecha y hora.
```

- Si el usuario no tiene sesión al confirmar, enviarlo al login y volver al paso 5.
- Ante `404` o `409`, avisar y volver al paso 4 con las franjas recargadas.
- Deshabilitar el botón de confirmar mientras se envía, para evitar doble envío.

**Mis turnos**
- Lista de reservas vigentes (`GET /api/reservas`) con servicio, profesional, fecha, horario y precio.
- Si la lista está vacía, mostrar un acceso directo a "Reservar un turno".
- Cada reserva tiene dos acciones: **Cambiar horario** y **Cancelar**.
- Después de reservar, modificar o cancelar, volver a pedir `GET /api/reservas` para refrescar la lista.

**Cambiar el horario de una reserva** (desde "Mis turnos")
- Mostrar las franjas del mismo profesional (`GET /api/turnos?profesional_id=<reserva.profesional_id>`).
- Confirmar con `PATCH /api/reservas/<reserva.id> { nuevo_turno_id }`.

**Cancelar una reserva** (desde "Mis turnos")
- Pedir confirmación ("¿Seguro que querés cancelar?") y llamar a `DELETE /api/reservas/<reserva.id>`.

### Para administradores (`rol = "administrador"`)

**Generar agenda**
- Formulario con rango de fechas. Por cada día hábil del rango y por cada servicio, llamar a `POST /api/turnos/generar`.
- Mostrar cuántos turnos se crearon en total (sumar `turnos.length` de las respuestas `201`).

**Alta de profesional**
- Formulario con `usuario_id` (ID del usuario en la API de Usuarios) y `especialidad`.
- Si la API de Usuarios ofrece una búsqueda de usuarios con rol `profesional`, conviene un selector en lugar de pedir el ID a mano.

---

## 7. Limitaciones actuales

| Limitación | Impacto en el frontend |
|---|---|
| **`PATCH /api/reservas/:id` todavía no está habilitado en la base.** | Hasta que se habilite responde `500`. *Pendiente en el backend.* |
| No hay rutas para editar o desactivar servicios y profesionales, ni para asignar servicios a profesionales. | Esas tareas se hacen hoy directamente en la base de datos. |
| Las respuestas de `/api/turnos` traen solo `profesional_id` y `servicio_id` (`/api/reservas` sí incluye los nombres). | Para mostrar nombres en la selección de horarios, cruzar con `/api/profesionales` y `/api/servicios` (se pueden pedir una vez y guardar en memoria). |
| "Mis turnos" muestra solo las reservas desde hoy. | No hay historial de turnos pasados. |

# API de usuarios: guía para el frontend

Rutas que puede usar el frontend, qué hay que enviar y qué devuelve cada una.

## Datos generales

- **Formato:** los bodies se envían y se reciben en JSON. Hay que mandar el header `Content-Type: application/json`.
- **CORS:** está habilitado para cualquier origen.
- **URL base:** la del despliegue en Vercel. En local es `http://localhost:5000`, o el `PORT` que esté configurado.

## Autenticación

Las rutas protegidas piden el JWT en el header `Authorization`:

```
Authorization: Bearer <token>
```

- **Cómo se obtiene:** con `POST /sesiones` (login) o `POST /usuarios` (registro).
- **Vencimiento:** a la hora. No hay refresh token: cuando vence, el usuario tiene que volver a iniciar sesión.
- **Logout:** `DELETE /sesiones` invalida el token en el servidor. Después de llamarlo, conviene borrarlo también del lado del frontend.
- **Contenido:** el token es un JWT estándar. Su payload trae el `id` y el `rol` del usuario, así que el frontend lo puede decodificar (por ejemplo con `jwt-decode`) para saber qué pantallas mostrar. Para el resto de los datos (nombre, email, etc.) está `GET /usuarios/me`.

```json
{ "id": "6ae761442b19072bbffa20c2", "rol": "administrador", "iat": 1793548800, "exp": 1793552400, "jti": "..." }
```

> El rol del token sirve para mostrar u ocultar cosas en la interfaz. Quien controla los permisos de verdad es el backend: si el rol no alcanza, responde `403`.

### Roles

| Rol | Qué puede hacer |
|---|---|
| `cliente` | Iniciar y cerrar sesión, ver su perfil. Es el rol de todo el que se registra desde `POST /usuarios`. |
| `profesional` | Lo mismo que el cliente. Solo lo puede crear un administrador. |
| `administrador` | Además, listar, ver y desactivar usuarios, y crear profesionales y administradores. |

## Respuestas de error comunes

Todas las rutas protegidas pueden devolver estos errores:

| Status | Body | Cuándo |
|---|---|---|
| `401` | Texto plano `Unauthorized` (no es JSON) | Falta el token, es inválido, venció o la sesión fue cerrada. Lo que corresponde es mandar al usuario al login. |
| `403` | `{ "message": "Acceso denegado" }` | El token es válido, pero el rol no tiene permiso para esa ruta. |
| `500` | `{ "message": "error interno del servidor" }` | Error inesperado del servidor. |

Además, cualquier ruta que no exista devuelve `404` con el texto plano `Ruta inválida.`

> **Ojo:** el `401` de las rutas protegidas no trae JSON. Hay que revisar `response.status` antes de hacer `response.json()`.

## Modelo de usuario

Así viene un usuario en las respuestas:

```json
{
  "_id": "6ae761442b19072bbffa20c3",
  "nombre": "Martín",
  "apellido": "Sosa",
  "email": "martin.sosa@example.com",
  "rol": "profesional",
  "activo": true,
  "fecha_registro": "2026-11-01T14:00:00.000Z"
}
```

- El id viene en `_id`, no en `id`.
- `fecha_registro` es una fecha ISO 8601 en UTC.
- La contraseña nunca viene en las respuestas.

## Resumen de rutas

| Método | Ruta | Requiere | Para qué sirve |
|---|---|---|---|
| `POST` | `/sesiones` | Nada | Iniciar sesión |
| `DELETE` | `/sesiones` | Token | Cerrar sesión |
| `POST` | `/usuarios` | Nada | Registrarse como cliente |
| `GET` | `/usuarios/me` | Token | Ver el perfil propio |
| `GET` | `/usuarios` | Token de administrador | Listar usuarios activos |
| `GET` | `/usuarios/:id` | Token de administrador | Ver un usuario |
| `DELETE` | `/usuarios/:id` | Token de administrador | Desactivar un usuario |
| `POST` | `/admin/usuarios` | Token de administrador | Crear un profesional o administrador |

---

## `POST /sesiones`: iniciar sesión

**Body:**

```json
{ "email": "ana@mail.com", "password": "secreta123" }
```

**Respuestas:**

| Status | Body | Cuándo |
|---|---|---|
| `200` | `{ "token": "eyJhbGciOi..." }` | Credenciales correctas. |
| `401` | `{ "message": "Usuario no autorizado" }` | Email inexistente o contraseña incorrecta (las dos dan la misma respuesta). |
| `403` | `{ "message": "Cuenta deshabilitada" }` | Credenciales correctas, pero la cuenta fue desactivada por un administrador. |

El email no distingue mayúsculas de minúsculas.

**Ejemplo:**

```js
const res = await fetch(`${API_URL}/sesiones`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password })
});

if (res.ok) {
  const { token } = await res.json();
  localStorage.setItem("token", token);
} else {
  const { message } = await res.json();
  // mostrar message al usuario
}
```

## `DELETE /sesiones`: cerrar sesión

**Headers:** `Authorization: Bearer <token>`. No lleva body.

**Respuestas:**

| Status | Body | Cuándo |
|---|---|---|
| `204` | Sin contenido | Sesión cerrada. Ese token ya no sirve en ninguna ruta. |
| `401` | Texto plano | Falta el token, es inválido o la sesión ya estaba cerrada. |

Solo cierra la sesión del token enviado: si el usuario inició sesión en otro dispositivo, esa sesión sigue activa.

**Ejemplo:**

```js
await fetch(`${API_URL}/sesiones`, {
  method: "DELETE",
  headers: { Authorization: `Bearer ${token}` }
});
localStorage.removeItem("token");
```

## `POST /usuarios`: registro de cliente

Crea un usuario con rol `cliente` y devuelve un token, así que el usuario queda con la sesión iniciada sin pasar por el login.

**Body** (los cuatro campos son obligatorios):

```json
{ "nombre": "Ana", "apellido": "Pérez", "email": "ana@mail.com", "password": "secreta123" }
```

**Respuestas:**

| Status | Body | Cuándo |
|---|---|---|
| `201` | `{ "token": "eyJhbGciOi..." }` | Usuario creado. |
| `400` | `{ "message": "Datos inválidos", "error": "..." }` | Falta algún campo. `error` es un detalle técnico en inglés: conviene mostrar un mensaje propio. |
| `409` | `{ "message": "El email ya está registrado" }` | Ya existe un usuario con ese email. |

- El rol no se puede elegir: si se manda `rol` en el body, se ignora.
- El backend no valida largo de contraseña ni formato de email: si se quieren esas reglas, hay que validarlas en el formulario.

## `GET /usuarios/me`: perfil propio

Disponible para cualquier rol.

**Headers:** `Authorization: Bearer <token>`

**Respuestas:**

| Status | Body | Cuándo |
|---|---|---|
| `200` | `{ ...usuario }` | El usuario existe y está activo. |
| `401` | Texto plano | Token faltante, inválido o vencido. |
| `404` | `{ "message": "Usuario no encontrado" }` | El usuario fue desactivado después de iniciar sesión. Conviene tratarlo como un logout. |

**Ejemplo de respuesta `200`:**

```json
{
  "_id": "6ae761442b19072bbffa20c4",
  "nombre": "Sofía",
  "apellido": "Ramírez",
  "email": "sofia.ramirez@example.com",
  "rol": "cliente",
  "activo": true,
  "fecha_registro": "2026-11-01T14:00:00.000Z"
}
```

## `GET /usuarios`: listar usuarios

Solo administradores. Devuelve todos los usuarios activos, de cualquier rol. No tiene paginación ni filtros: si hace falta filtrar (por ejemplo, solo profesionales), se hace en el frontend.

**Headers:** `Authorization: Bearer <token>`

**Respuestas:**

| Status | Body | Cuándo |
|---|---|---|
| `200` | `[ ...usuarios ]` | Siempre que el token sea de un administrador. Si no hay usuarios, devuelve `[]`. |
| `401` | Texto plano | Token faltante, inválido o vencido. |
| `403` | `{ "message": "Acceso denegado" }` | El token no es de un administrador. |

**Ejemplo de respuesta `200`:**

```json
[
  { "_id": "6ae761442b19072bbffa20c2", "nombre": "Laura", "apellido": "Méndez", "email": "laura.mendez@example.com", "rol": "administrador", "activo": true, "fecha_registro": "2026-11-01T14:00:00.000Z" },
  { "_id": "6ae761442b19072bbffa20c3", "nombre": "Martín", "apellido": "Sosa", "email": "martin.sosa@example.com", "rol": "profesional", "activo": true, "fecha_registro": "2026-11-01T14:00:00.000Z" }
]
```

## `GET /usuarios/:id`: ver un usuario

Solo administradores. `:id` es el `_id` del usuario.

**Headers:** `Authorization: Bearer <token>`

**Respuestas:**

| Status | Body | Cuándo |
|---|---|---|
| `200` | `{ ...usuario }` | El usuario existe y está activo. |
| `401` | Texto plano | Token faltante, inválido o vencido. |
| `403` | `{ "message": "Acceso denegado" }` | El token no es de un administrador. |
| `404` | `{ "message": "Usuario no encontrado" }` | No existe, está desactivado o el id no tiene un formato válido. |

## `DELETE /usuarios/:id`: desactivar un usuario

Solo administradores. Es una **baja lógica**: el usuario no se borra, queda con `activo: false`. Desde ese momento no puede iniciar sesión (recibe `403 Cuenta deshabilitada`) y deja de aparecer en los listados. No hay ruta para reactivarlo.

**Headers:** `Authorization: Bearer <token>`. No lleva body.

**Respuestas:**

| Status | Body | Cuándo |
|---|---|---|
| `200` | `{ ...usuario, "activo": false }` | El usuario se desactivó. |
| `401` | Texto plano | Token faltante, inválido o vencido. |
| `403` | `{ "message": "Acceso denegado" }` | El token no es de un administrador. |
| `404` | `{ "message": "Usuario no encontrado" }` | No existe o ya estaba desactivado. |

> El backend no impide que un administrador se desactive a sí mismo. Conviene que la interfaz no ofrezca esa opción sobre el usuario logueado.

## `POST /admin/usuarios`: crear profesional o administrador

Solo administradores. El usuario se crea con una contraseña temporal generada por el servidor, que no se devuelve en la respuesta.

**Headers:** `Authorization: Bearer <token>`

**Body** (los cuatro campos son obligatorios):

```json
{ "nombre": "Laura", "apellido": "Gómez", "email": "laura@mail.com", "rol": "profesional" }
```

`rol` tiene que ser `"profesional"` o `"administrador"`.

**Respuestas:**

| Status | Body | Cuándo |
|---|---|---|
| `201` | `{ ...usuario }` | Usuario creado. |
| `400` | `{ "message": "Datos inválidos", "error": "..." }` | Falta algún campo o `rol` no es válido. |
| `401` | Texto plano | Token faltante, inválido o vencido. |
| `403` | `{ "message": "Acceso denegado" }` | El token no es de un administrador. |
| `409` | `{ "message": "El email ya está registrado" }` | Ya existe un usuario con ese email. |

> **Pendiente en el backend:** la contraseña temporal todavía no se envía por mail, así que los usuarios creados desde esta ruta todavía no pueden iniciar sesión.

---

## Rutas que no son para el frontend

`GET /interno/usuarios/:id` es solo para comunicación entre servicios (la usa la API de turnos). Se autentica con una clave interna que nunca debe estar en el frontend.
