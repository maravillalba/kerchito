# Kiosko "El Rápido"

Tienda online de un kiosco: catálogo de productos con filtro por categoría, detalle de cada producto, carrito y pedido con control de stock.

**Integrantes:** Lobo Hector Hernan, Salica Santiago Emanuel, Villalba Mara Patricia

## Tecnologías

- **Frontend:** React 19, TypeScript, Vite, React Router y Context API.
- **Backend:** FastAPI, SQLAlchemy y SQLite.
- **Tests:** Vitest y Testing Library (frontend), Pytest (backend).

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `frontend/` | Aplicación React. Ver [`frontend/README.md`](frontend/README.md). |
| `backend/` | API FastAPI y base SQLite. Ver [`backend/README.md`](backend/README.md). |
| `docs/` | Documentación: [`CONTRATO.md`](docs/CONTRATO.md), [`API.md`](docs/API.md) y [`GIT.md`](docs/GIT.md). |

## Requisitos

- **Python** 3.13 o superior.
- **Node.js** `^20.19.0` o `>=22.12.0`, con npm.

## Cómo correrlo

Hacen falta dos terminales: una para el backend y otra para el frontend. Los comandos son para Windows (PowerShell).

**1. Backend** (desde la raíz del repositorio):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

- API: http://localhost:8000
- Documentación interactiva: http://localhost:8000/docs
- Al arrancar crea la base `kiosco.db` y carga 10 productos de ejemplo. Hay que correrlo siempre desde `backend/`.

**2. Frontend** (desde la raíz del repositorio, en otra terminal):

```powershell
cd frontend
npm ci
npm run dev
```

- Aplicación: http://localhost:5173
- Por defecto el frontend llama a `http://localhost:8000`. Si el backend está en otra dirección, definí `VITE_API_URL` (ver [`frontend/README.md`](frontend/README.md)).

El carrito vive en memoria: si recargás la página (F5), se vacía.

## Tests

```powershell
# Backend (desde backend/, con el entorno virtual activado)
python -m pytest -v

# Frontend (desde frontend/)
npm run lint
npm run build
npm test
```

## Documentación

- [`docs/CONTRATO.md`](docs/CONTRATO.md): contrato de datos entre el frontend (TypeScript) y el backend (Pydantic). Es la fuente de verdad: si hay que cambiar un campo, se cambia primero ahí.
- [`docs/API.md`](docs/API.md): endpoints, ejemplos de pedidos y respuestas, y códigos de error (404, 409, 422 y 500).
- [`docs/GIT.md`](docs/GIT.md): guía de Git del equipo.

## Flujo de trabajo

- Una rama por tarea, creada desde `develop` actualizada.
- Pull request hacia `develop`, que se mergea con *Squash and merge*.
- Commits con formato Conventional Commits, por ejemplo `feat(front): agregar CartContext`.
- Antes de subir cambios tienen que pasar los tests, el lint y el build.

Más detalle en [`docs/GIT.md`](docs/GIT.md).

