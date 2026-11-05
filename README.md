# Frontend · Estética Natura Balance

Frontend del sistema de gestión de turnos. **HTML + CSS + JavaScript vanilla** (ES modules), sin build. Se deploya como sitio estático en Vercel.

## Arquitectura

```
Frontend (este repo, Vercel)
  ├── Backend Usuarios (Express + MongoDB)   → login, registro, alta de usuarios
  └── Backend Turnos   (Express + Supabase)  → servicios, profesionales, disponibilidad, reservas
```

El login devuelve un JWT con `{ usuario_id, rol }`. El front lo guarda en `localStorage` y lo manda como `Authorization: Bearer <JWT>` a los dos backends.

## Estructura

```
index.html              Shell de la SPA (navbar + <main id="app">)
css/styles.css
assets/
js/
  main.js               Punto de entrada
  config.js             URLs de los backends (local / producción)
  router.js             Router por hash + guards por rol
  api/
    http.js             Wrapper de fetch (JWT, errores, 401 → login)
    usuarios.js         Endpoints del backend de Usuarios
    turnos.js           Endpoints del backend de Turnos
  auth/session.js       Guardar/leer/decodificar el JWT
  constants/roles.js    cliente | profesional | administrador
  components/
    navbar.js           Menú según rol
  utils/dom.js          Helpers (escape, alertas, formularios)
  views/
    public/             home, servicios, equipo, login, register, notFound
    cliente/            reservar, misTurnos
    admin/              dashboard, generarAgenda, profesionales, usuarios
```

Cada vista exporta `{ title, render(root) }`. Para agregar una pantalla: crear el archivo en `js/views/` y registrarla en `routes` dentro de `js/router.js`.

## Rutas

El contrato con la API de Turnos está en [`API-frontend.md`](API-frontend.md).

| Ruta | Acceso | Endpoints |
|---|---|---|
| `#/` | público | — |
| `#/servicios` | público | `GET /api/servicios` |
| `#/equipo` | público | `GET /api/profesionales` (cada uno trae sus `servicios`) |
| `#/reservar` | público (al confirmar pide login y vuelve) | `GET /api/turnos`, `POST /api/reservas` |
| `#/login`, `#/registro` | solo sin sesión | Usuarios: `POST /sesiones`, `POST /usuarios` |
| `#/mis-turnos` | con sesión (cualquier rol) | `GET /api/reservas`, `PATCH` y `DELETE /api/reservas/:id` |
| `#/admin` | administrador | — |
| `#/admin/agenda` | administrador | `POST /api/turnos/generar` |
| `#/admin/profesionales` | administrador | `POST /api/profesionales` + Usuarios: `GET /usuarios` |
| `#/admin/usuarios` | administrador | Usuarios: `GET /usuarios`, `POST /admin/usuarios`, `DELETE /usuarios/:id` |

Además, el menú usa `GET /usuarios/me` para saludar al usuario y "Salir" llama a `DELETE /sesiones`.

## Correr en local

Hay que servirlo por HTTP (los ES modules no funcionan con `file://`):

```bash
npx serve .
# o la extensión "Live Server" de VS Code
```

Por defecto el front usa las APIs de producción (`https://backendturnos.vercel.app` y `https://backend-usuarios.vercel.app`), también en local. Para usar los backends locales (Turnos en `http://localhost:3001`, Usuarios en `http://localhost:5000`), poner `USAR_BACKEND_LOCAL = true`. Se cambia en `js/config.js`. Los backends tienen que habilitar CORS para el dominio del front.

## Deploy en Vercel

1. Subir el repo a GitHub.
2. En Vercel: *Add New → Project* → importar el repo.
3. Framework preset: **Other**. Sin build command ni output directory.
4. Cargar las URLs de producción de los backends en `js/config.js`.
