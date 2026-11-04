# Kiosko "El Rápido"

Tienda online de un kiosco: catálogo de productos con filtro por categoría, detalle de cada producto, carrito y pedido con control de stock. Incluye KioscoBot, un chat de ayuda que responde preguntas sobre productos, precios, stock, horarios y cómo comprar.

**Equipo:** Salica Santiago Emanuel, Lobo Hector Hernan y Villalba Mara Patricia.

## Stack

- **Frontend:** React 19, TypeScript, Vite, React Router y Context API. Tests con Vitest y Testing Library.
- **Backend:** FastAPI, SQLAlchemy, Pydantic y SQLite. Tests con Pytest.

## Requisitos previos

| Herramienta | Versión |
|---|---|
| Python | Probado con 3.13.7 |
| Node.js | 22 (22.22.2 o más) o 24 (24.15.0 o más), con npm. Probado con Node 24.15.0 y npm 11.12.1 |
| Git | Probado con 2.42.0 |

La versión de Node sale de lo que piden Vitest y jsdom (las herramientas de test). El repositorio no fija una versión de Python.

## Estructura de carpetas

```
kiosco-el-rapido/
├── backend/
│   ├── main.py            app FastAPI: CORS, routers y seed al arrancar
│   ├── database.py        conexión a SQLite
│   ├── models.py          tablas products, orders y order_items
│   ├── schemas.py         esquemas Pydantic (ver docs/CONTRATO.md)
│   ├── seed.py            los 10 productos iniciales
│   ├── bot_ai.py          capa de IA opcional de KioscoBot
│   ├── routers/           products, orders y chat
│   ├── tests/             tests de Pytest
│   ├── requirements.txt   dependencias con versión fija
│   └── .env.example       variables de entorno de ejemplo
├── frontend/
│   ├── src/               componentes, páginas, contexto, hooks y services/api.ts
│   ├── package.json       scripts (dev, build, lint, test, coverage)
│   ├── vitest.config.ts   configuración de tests y cobertura
│   └── .env.example       variables de entorno de ejemplo
└── docs/                  contrato, API, KioscoBot y guía de Git
```

## Backend: instalación y ejecución

Todo se corre **desde la carpeta `backend/`**.

**1. Crear y activar el entorno virtual**

Windows (PowerShell):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
```

macOS / Linux:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
```

**2. Instalar las dependencias**

```bash
pip install -r requirements.txt
```

**3. Crear el `.env`**

Es opcional: todas las variables tienen un valor por defecto (ver [Variables de entorno](#variables-de-entorno)). Hace falta, por ejemplo, para usar KioscoBot con IA.

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

**4. Levantar el servidor**

```bash
python -m uvicorn main:app --reload
```

- API: http://localhost:8000
- Documentación interactiva (Swagger): http://localhost:8000/docs
- Prueba rápida: http://localhost:8000/health responde `{"status":"ok"}`.
- Al arrancar, crea la base `kiosco.db` y carga los 10 productos de ejemplo si la tabla de productos está vacía. La base se crea en la carpeta desde donde se arranca el servidor: por eso hay que correrlo siempre desde `backend/`.
- Para volver al stock original: frená el servidor (`Ctrl+C`), borrá `backend/kiosco.db` y volvé a arrancarlo.

## Frontend: instalación y ejecución

En otra terminal, **desde la carpeta `frontend/`**:

```bash
cd frontend
npm ci
npm run dev -- --strictPort
```

- Aplicación: http://localhost:5173
- `npm ci` instala exactamente las versiones de `package-lock.json`. Usá `npm install` solo si estás agregando una dependencia.
- Hay que abrir la app en **http://localhost:5173**: el backend solo acepta pedidos (CORS) de `http://localhost:5173` y `http://127.0.0.1:5173`. Con `--strictPort`, si el puerto 5173 está ocupado Vite se frena con un error en lugar de pasarse a otro puerto.
- El `.env` del frontend es opcional: por defecto la app llama a `http://localhost:8000`. Solo hace falta si el backend corre en otra dirección:

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env
```

```bash
# macOS / Linux
cp .env.example .env
```

El carrito vive en memoria: si recargás la página, se vacía.

## Variables de entorno

| Variable | Dónde va | Valor por defecto | Para qué sirve |
|---|---|---|---|
| `DATABASE_URL` | `backend/.env` | `sqlite:///./kiosco.db` | Base de datos de la API. La ruta es relativa a la carpeta desde donde se arranca el servidor. |
| `FRONTEND_ORIGIN` | `backend/.env` | `http://localhost:5173` | Origen del frontend que CORS deja llamar a la API (además de `http://127.0.0.1:5173`). |
| `BOT_API_KEY` | `backend/.env` | vacía | Clave de la API de Anthropic. Si está definida, KioscoBot responde con IA. Es secreta. |
| `BOT_MODEL` | `backend/.env` | `claude-haiku-5-5` | Modelo que usa KioscoBot cuando hay `BOT_API_KEY`. |
| `VITE_API_URL` | `frontend/.env` | `http://localhost:8000` | URL base del backend que usa el frontend. |

Los archivos `.env` están en el `.gitignore`. Al repositorio solo se suben los `.env.example`, con valores de ejemplo. En el backend, las variables definidas en la terminal tienen prioridad sobre las del `.env`.

## KioscoBot

KioscoBot es el chat de ayuda (el botón flotante "Abrir chat de KioscoBot", en todas las páginas). Usa `POST /api/chat`.

- **Sin `BOT_API_KEY`**, responde con reglas: precios, stock, productos por categoría, categorías, horarios, medios de pago y cómo hacer un pedido. Los datos de productos salen de la base.
- **Con `BOT_API_KEY`**, la respuesta la genera un modelo de IA con los datos de la tienda. Si la IA falla (error, timeout, respuesta vacía o un error inesperado), vuelve a responder con las reglas, así que el chat sigue respondiendo con 200.
- Es solo de consulta: no crea pedidos ni modifica el stock.

La clave va **solo** en `backend/.env`. Nunca la pongas en el frontend (todo lo que empieza con `VITE_` termina en el código que descarga el navegador) ni la subas a git. Más detalles en [`docs/KIOSCOBOT.md`](docs/KIOSCOBOT.md).

## Tests

**Backend** (desde `backend/`, con el entorno virtual activado):

```bash
python -m pytest -v
python -m pytest --cov=. --cov-report=term-missing
```

**Frontend** (desde `frontend/`):

```bash
npm test
npm run lint
npm run build
npm run coverage
```

| | Tests | Cobertura |
|---|---|---|
| Backend | 84 | 93% |
| Frontend | 127 | 97% (sentencias) |

Los tests del backend usan una base SQLite en memoria (no tocan `kiosco.db`) y nunca llaman a la API real de IA. Los del frontend reemplazan la API, así que no hace falta tener el backend levantado. `npm run coverage` además deja un reporte HTML en `frontend/coverage/`.

## Documentación

- [`docs/CONTRATO.md`](docs/CONTRATO.md): contrato de datos entre el frontend (TypeScript) y el backend (Pydantic). Es la fuente de verdad: si hay que cambiar un campo, se cambia primero ahí.
- [`docs/API.md`](docs/API.md): endpoints, ejemplos de pedidos y respuestas, y códigos de error.
- [`docs/KIOSCOBOT.md`](docs/KIOSCOBOT.md): diseño de KioscoBot (intenciones, límites y seguridad de la API key).
- [`docs/GIT.md`](docs/GIT.md): ramas, flujo de trabajo y Conventional Commits del equipo.
- [`backend/README.md`](backend/README.md) y [`frontend/README.md`](frontend/README.md): detalle de cada parte.

## Problemas comunes

**`No module named uvicorn`**
El entorno virtual no está activado (o no se instalaron las dependencias). Desde `backend/`, activalo (`.venv\Scripts\Activate.ps1` en Windows, `source .venv/bin/activate` en macOS/Linux) y corré `pip install -r requirements.txt`.

**"No se pudo conectar con el servidor. Revisá que el backend esté funcionando."**
El frontend no llega al backend. Fijate que el backend esté levantado (http://localhost:8000/health tiene que responder) y, si usás `VITE_API_URL`, que apunte a la dirección correcta.

**Error de CORS en la consola del navegador**
La app está abierta en un puerto distinto de 5173 (por ejemplo, 5174 porque el 5173 estaba ocupado). Cerrá el otro proceso que usa el 5173 y levantá el frontend con `npm run dev -- --strictPort`. En la app se ve el mismo mensaje de "No se pudo conectar con el servidor".

**`npm error Missing script: "dev"` (o cualquier `npm run`)**
El comando se corrió fuera de `frontend/`. Entrá a la carpeta (`cd frontend`) y repetilo.
