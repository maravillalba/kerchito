# Backend – Kiosko El Rápido

API hecha con FastAPI y SQLite.

## Requisitos
- Python 3.13 o superior (probado con 3.13.7 y 3.14.4)
- pip

## Instalación (Windows, PowerShell)
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Variables de entorno
El backend lee seis variables del entorno. Todas son opcionales: si no las definís, usa estos valores por defecto (los mismos de `.env.example`).

| Variable | Valor por defecto | Qué hace |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./kiosco.db` | Base de datos que usa la API. La ruta es relativa a la carpeta desde donde se arranca el servidor. |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Origen del frontend al que CORS le permite llamar a la API. También se permite `http://127.0.0.1:5173`. |
| `BOT_API_KEY` | vacía | Clave de la API de Anthropic. Si está definida, KioscoBot responde con IA; si falta o la IA falla, responde con las reglas de siempre. Es secreta: va solo en tu `.env`, nunca en git. |
| `BOT_MODEL` | `claude-haiku-5-5` | Modelo de Claude que usa KioscoBot cuando hay `BOT_API_KEY`. |
| `ADMIN_EMAIL` | vacía | Correo del administrador. Sin esta variable y `ADMIN_PASSWORD` no se crea ningún admin y no se puede entrar al panel. |
| `ADMIN_PASSWORD` | vacía | Contraseña del administrador, de 8 caracteres o más. Es secreta. Se usa solo para crearlo: si ya existe, cambiarla acá no lo actualiza. |

Al arrancar, el backend lee el archivo `backend/.env` si existe (copiá `.env.example` como `.env` y completalo). El `.env` está en el `.gitignore`. Las variables definidas en la terminal tienen prioridad sobre las del archivo; por ejemplo, para cambiar un valor solo por esta vez:

```powershell
$env:FRONTEND_ORIGIN = "http://localhost:5174"
python -m uvicorn main:app --reload
```

## Cómo correrlo
Desde `backend/`, con el entorno virtual activado:
```powershell
python -m uvicorn main:app --reload
```
- API: http://localhost:8000
- Documentación interactiva: http://localhost:8000/docs
- Prueba rápida: http://localhost:8000/health → `{"status":"ok"}`

## Base de datos y seed
- Al arrancar, el servidor crea las tablas (`users`, `sessions`, `products`, `orders`, `order_items` y `points_movements`), carga los 54 productos del seed **solo si la tabla `products` está vacía** y crea el admin desde el `.env`. No hace falta correr `python seed.py`.
- `kiosco.db` se crea en la carpeta desde donde se corre el servidor. Por eso hay que correrlo **siempre desde `backend/`**; si se arranca desde otra carpeta (por ejemplo con `--app-dir backend` desde la raíz), se crea otra `kiosco.db` en esa carpeta, con el stock original y sin los pedidos guardados.
- Para empezar de cero (por ejemplo, para recuperar el stock original): frená el servidor (`Ctrl+C`), borrá `backend/kiosco.db` y volvé a arrancarlo.
- `kiosco.db` está en el `.gitignore`: no se sube al repositorio.
- **Si a tu `kiosco.db` le falta alguna columna**, el servidor no arranca y muestra un mensaje que pide borrarla (no hay migraciones). Frená el servidor, borrá `backend/kiosco.db` y volvé a arrancarlo: se crea la base nueva con el seed y el admin. Se pierden los pedidos y las cuentas guardadas.
- Las fotos que sube el admin quedan en `backend/uploads/products/` (está en el `.gitignore`) y se publican en `/uploads/products/`. Al borrar `kiosco.db` no se borran solas: podés borrar también esa carpeta.

## Productos: marca, presentación y ofertas
- Cada producto tiene `brand` (marca), `name` (solo el producto, sin la marca ni la presentación) y `unit` (capacidad o presentación: `"500 ml"`, `"1 kg"`, `"x 20"`). Ejemplo: `brand="Coca-Cola"`, `name="Original"`, `unit="500 ml"`. Los tres son obligatorios y no pueden estar vacíos.
- `offer_price` es opcional (`null` = sin oferta). Si está, tiene que ser mayor a 0 y menor que `price`. Lo validan `ProductIn` (en `schemas.py`) y una restricción `CHECK` de la base.
- **Precio que se cobra:** al crear un pedido, `unit_price` usa `offer_price` si existe, si no `price` (`Product.effective_price`). Precios, descuentos, puntos y total los calcula siempre el backend: el frontend solo manda `product_id`, `quantity`, `payment_method` y `use_points`.
- `cost` es un dato interno: no sale por los endpoints públicos. Cada renglón del pedido guarda su `unit_cost`, así que editar un costo no cambia la ganancia de ventas pasadas.
- Las reglas de puntos y del 15% están en `points.py`. Si cambiás alguna, cambiala también en `frontend/src/utils/puntos.ts`, que hace la vista previa del carrito (los dos lados tienen tests con los mismos casos).
- KioscoBot nombra los productos con `brand` + `name` + `unit` y, si hay oferta, dice el precio de oferta con el normal entre paréntesis.
- El seed tiene 4 productos en oferta: Coca-Cola Original, yerba Cruz de Malta, detergente Cif y mayonesa Hellmann's.

## Endpoints
Públicos: `GET /health`, `GET /api/products`, `GET /api/products/{id}`, `POST /api/chat`, `POST /api/auth/register` y `POST /api/auth/login`. El resto pide `Authorization: Bearer <token>`: los pedidos, una sesión de cliente, y los productos, las anulaciones y `/api/admin/*`, una de admin. La tabla completa está en [`docs/CONTRATO.md`](../docs/CONTRATO.md).

Si falla la base de datos, cualquier endpoint responde 500, salvo `POST /api/chat`, que responde 200 con un aviso. Los ejemplos de pedidos y respuestas están en [`docs/API.md`](../docs/API.md), y los campos en [`docs/CONTRATO.md`](../docs/CONTRATO.md).

## Tests
Desde `backend/`, con el entorno virtual activado:
```powershell
python -m pytest -v
python -m pytest --cov=. --cov-report=term-missing
```
Los tests usan una base SQLite en memoria, así que no tocan `kiosco.db`, y nunca llaman a la API real de IA.

## Estructura
- `main.py`: app FastAPI, tablas, seed y admin al arrancar, CORS, corte de fotos grandes, routers, fotos en `/uploads`, manejo de errores de base de datos (500) y `GET /health`.
- `database.py`: conexión a SQLite (`engine`, `SessionLocal`, `Base`), `PRAGMA foreign_keys=ON` y `get_db`.
- `models.py`: modelos de la base.
- `schemas.py`: esquemas Pydantic (ver `docs/CONTRATO.md`).
- `seed.py`: los 54 productos iniciales con sus costos, `seed()` (avisa si la base es de una versión anterior) y `seed_admin()`.
- `security.py`: hash scrypt de contraseñas y tokens de sesión, con la librería estándar.
- `deps.py`: dependencias `get_current_user`, `require_admin` y `require_customer`.
- `login_limiter.py`: límite de intentos de login, en memoria.
- `points.py`: reglas de puntos, 15% y niveles, como constantes.
- `accounts.py`: saldo de un cliente y si le corresponde el 15%.
- `uploads.py`: validación y guardado de fotos, y el corte por `Content-Length`.
- `bot_ai.py`: capa de IA opcional de KioscoBot (usa `BOT_API_KEY` y `BOT_MODEL`).
- `routers/auth.py`: registro, login, sesión y logout.
- `routers/products.py`: lectura pública, y ABM, stock y foto para el admin.
- `routers/orders.py`: crear un pedido y anularlo (cada uno en una sola transacción) y listados.
- `routers/admin.py`: resumen, clientes y ajuste de puntos.
- `routers/chat.py`: `POST /api/chat` (KioscoBot: reglas y, si hay `BOT_API_KEY`, IA).
- `tests/`: `conftest.py` (cliente de prueba, base en memoria y fixtures de sesión) y un archivo por tema.
- `pytest.ini`: configuración de Pytest.
- `.coveragerc`: configuración de la cobertura (excluye `tests/` y `.venv/`).
- `requirements.txt`: dependencias.
- `.env.example`: variables de entorno de ejemplo.

## Problemas comunes
- PowerShell no deja activar el entorno: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- `No module named 'main'`: estás parada fuera de `backend/`; hacé `cd backend`.
- El puerto 8000 está ocupado: `python -m uvicorn main:app --reload --port 8001`.
- Error de CORS desde el frontend: Vite tiene que estar en `http://localhost:5173`; si usa otro puerto, definí `FRONTEND_ORIGIN` como se explica arriba.
