# Proyecto Cursos Online

Proyecto fullstack con backend en Node.js/Express y frontend estático. Está pensado para desplegar en Vercel y conectarse a MongoDB Atlas mediante variables de entorno.

---

## 🧩 Descripción

- Backend: `backend/` con API REST usando Express y MongoDB.
- Frontend: `frontend/` con páginas HTML, CSS y JS estáticas.
- Despliegue: preparado para Vercel con `vercel.json`.
- Conexión a MongoDB Atlas a través de `MONGODB_URI`.

---

## 📁 Estructura del proyecto

```
Mongo/
├─ backend/
│  ├─ assets/
│  ├─ certificados/
│  ├─ middleware/
│  │  └─ auth.js
│  ├─ routes/
│  │  ├─ admin.js
│  │  ├─ auth.js
│  │  ├─ certificados.js
│  │  ├─ consultas.js
│  │  ├─ cursos.js
│  │  ├─ estudiantes.js
│  │  ├─ progreso.js
│  │  └─ resenas.js
│  ├─ config.js
│  ├─ package.json
│  ├─ package-lock.json
│  └─ server.js
├─ frontend/
│  ├─ app.js
│  ├─ certificados.html
│  ├─ consultas.html
│  ├─ curso.html
│  ├─ dashboard-admin.html
│  ├─ estudiantes.html
│  ├─ index-cards.html
│  ├─ index-sidebar.html
│  ├─ index.html
│  ├─ login.html
│  ├─ logs-admin.html
│  ├─ mis-cursos.html
│  ├─ register.html
│  └─ style.css
├─ .gitignore
├─ .env.example
├─ vercel.json
└─ README.md
```

---

## ⚙️ Backend

- `backend/server.js` arranca el servidor Express.
- `backend/config.js` maneja la conexión a MongoDB usando variables de entorno.
- `backend/middleware/auth.js` valida JWT y permisos de administrador.
- `backend/routes/` define todas las rutas de la API.
- `backend/package.json` incluye dependencias del backend.

---

## 📌 Variables de entorno

Este proyecto usa variables de entorno para no guardar datos sensibles en el repositorio.

Crea un archivo `.env` localmente o agrega estas variables en Vercel:

```env
MONGODB_URI=mongodb+srv://<usuario>:<password>@cluster0.huh4a86.mongodb.net/cursos_online?retryWrites=true&w=majority
MONGODB_DBNAME=cursos_online
JWT_SECRET=una_clave_muy_secreta_o_generada_segura
CLIENT_ORIGIN=https://tu-app.vercel.app
PORT=3000
```

> No subas `.env` al repositorio. Usa `.env.example` como referencia.

---

## 🚀 Configuración en Vercel

El proyecto ya incluye `vercel.json` para desplegar el backend desde `backend/server.js`.

Variables de entorno que debes agregar en Vercel:

- `MONGODB_URI`
- `MONGODB_DBNAME`
- `JWT_SECRET`
- `CLIENT_ORIGIN`

### Pasos en Vercel

1. Conecta el repositorio a Vercel.
2. Ve a `Settings > Environment Variables`.
3. Añade las variables listadas arriba.
4. Despliega el proyecto.

---

## 💻 Instalación local

Desde la raíz del proyecto:

```bash
cd backend
npm install
```

Crea un archivo `.env` basado en `.env.example` y completa los valores.

Para ejecutar localmente:

```bash
npm start
```

Luego abre el frontend en un navegador con `http://localhost:3000` o usa las rutas del backend en `http://localhost:3000/api/...`.

---

## 🌐 Rutas importantes

- `/api/auth`
- `/api/cursos`
- `/api/admin`
- `/api/estudiantes`
- `/api/consultas`
- `/api/progreso`
- `/api/resenas`
- `/api/certificados`

---

## 🔒 Seguridad y recomendaciones

- Usa `JWT_SECRET` fuerte en producción.
- Mantén el URI de MongoDB privado.
- No expongas `backend/certificados/` en el repositorio si contiene archivos privados.
- Asegúrate de que MongoDB Atlas permita conexiones desde la IP de Vercel o habilita acceso público correctamente.

---

## 📌 Notas finales

- El frontend es estático y se sirve desde `frontend/`.
- El backend está listo para Vercel como función Node.
- Para producción, revisa la gestión de CORS y las políticas de seguridad adicionales que necesites.

¡Listo! Este README cubre la estructura, variables de entorno, despliegue y uso del proyecto.
