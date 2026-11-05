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
El backend lee cuatro variables del entorno. Todas son opcionales: si no las definís, usa estos valores por defecto (los mismos de `.env.example`).

| Variable | Valor por defecto | Qué hace |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./kiosco.db` | Base de datos que usa la API. La ruta es relativa a la carpeta desde donde se arranca el servidor. |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Origen del frontend al que CORS le permite llamar a la API. También se permite `http://127.0.0.1:5173`. |
| `BOT_API_KEY` | vacía | Clave de la API de Anthropic. Si está definida, KioscoBot responde con IA; si falta o la IA falla, responde con las reglas de siempre. Es secreta: va solo en tu `.env`, nunca en git. |
| `BOT_MODEL` | `claude-haiku-5-5` | Modelo de Claude que usa KioscoBot cuando hay `BOT_API_KEY`. |

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
- Al arrancar, el servidor crea las tablas (`products`, `orders` y `order_items`) y carga los 54 productos del seed **solo si la tabla `products` está vacía**. No hace falta correr `python seed.py`.
- `kiosco.db` se crea en la carpeta desde donde se corre el servidor. Por eso hay que correrlo **siempre desde `backend/`**; si se arranca desde otra carpeta (por ejemplo con `--app-dir backend` desde la raíz), se crea otra `kiosco.db` en esa carpeta, con el stock original y sin los pedidos guardados.
- Para empezar de cero (por ejemplo, para recuperar el stock original): frená el servidor (`Ctrl+C`), borrá `backend/kiosco.db` y volvé a arrancarlo.
- `kiosco.db` está en el `.gitignore`: no se sube al repositorio.
- **Si tu `kiosco.db` es anterior a los campos `brand`, `unit` y `offer_price`**, el servidor no arranca y muestra un mensaje que pide borrarla (no hay migraciones). Frená el servidor, borrá `backend/kiosco.db` y volvé a arrancarlo: se crea la base nueva con el seed. Se pierden los pedidos guardados.

## Productos: marca, presentación y ofertas
- Cada producto tiene `brand` (marca), `name` (solo el producto, sin la marca ni la presentación) y `unit` (capacidad o presentación: `"500 ml"`, `"1 kg"`, `"x 20"`). Ejemplo: `brand="Coca-Cola"`, `name="Original"`, `unit="500 ml"`. Los tres son obligatorios y no pueden estar vacíos.
- `offer_price` es opcional (`null` = sin oferta). Si está, tiene que ser mayor a 0 y menor que `price`. Lo validan `ProductIn` (en `schemas.py`) y una restricción `CHECK` de la base.
- **Precio que se cobra:** al crear un pedido, `unit_price` y `total` usan `offer_price` si existe, si no `price` (`Product.effective_price`). El precio lo calcula siempre el backend: el frontend solo manda `product_id` y `quantity`.
- KioscoBot nombra los productos con `brand` + `name` + `unit` y, si hay oferta, dice el precio de oferta con el normal entre paréntesis.
- El seed tiene 4 productos en oferta: Coca-Cola Original, yerba Cruz de Malta, detergente Cif y mayonesa Hellmann's.

## Endpoints
| Método | Ruta | Respuestas |
|---|---|---|
| GET | `/health` | 200 |
| GET | `/api/products` (opcional `?category=`) | 200, 422 |
| GET | `/api/products/{id}` | 200, 404, 422 |
| POST | `/api/orders` | 201, 404, 409, 422 |
| GET | `/api/orders` | 200 |
| POST | `/api/chat` | 200, 422 |

Si falla la base de datos, cualquier endpoint responde 500, salvo `POST /api/chat`, que responde 200 con un aviso. Los ejemplos de pedidos y respuestas están en [`docs/API.md`](../docs/API.md), y los campos en [`docs/CONTRATO.md`](../docs/CONTRATO.md).

## Tests
Desde `backend/`, con el entorno virtual activado:
```powershell
python -m pytest -v
python -m pytest --cov=. --cov-report=term-missing
```
Los tests usan una base SQLite en memoria, así que no tocan `kiosco.db`, y nunca llaman a la API real de IA.

## Estructura
- `main.py`: app FastAPI, creación de tablas y seed al arrancar, CORS, routers, manejo de errores de base de datos (500) y `GET /health`.
- `database.py`: conexión a SQLite (`engine`, `SessionLocal`, `Base`), `PRAGMA foreign_keys=ON` y `get_db`.
- `models.py`: modelos de la base (`Product`, `Order` y `OrderItem`).
- `schemas.py`: esquemas Pydantic de productos, pedidos y chat (ver `docs/CONTRATO.md`).
- `seed.py`: los 54 productos iniciales (con marca, presentación y 4 ofertas) y la función `seed()`, que valida cada producto con `ProductIn` y avisa si la base es de una versión anterior.
- `bot_ai.py`: capa de IA opcional de KioscoBot (usa `BOT_API_KEY` y `BOT_MODEL`).
- `routers/products.py`: `GET /api/products` y `GET /api/products/{id}`.
- `routers/orders.py`: `POST /api/orders` (descuenta stock en una sola transacción) y `GET /api/orders`.
- `routers/chat.py`: `POST /api/chat` (KioscoBot: reglas y, si hay `BOT_API_KEY`, IA).
- `tests/`: `conftest.py` (cliente de prueba y base en memoria), `test_health.py`, `test_products.py`, `test_orders.py`, `test_chat.py`, `test_bot_ai.py` y `test_seed.py`.
- `pytest.ini`: configuración de Pytest.
- `.coveragerc`: configuración de la cobertura (excluye `tests/` y `.venv/`).
- `requirements.txt`: dependencias.
- `.env.example`: variables de entorno de ejemplo.

## Problemas comunes
- PowerShell no deja activar el entorno: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.
- `No module named 'main'`: estás parada fuera de `backend/`; hacé `cd backend`.
- El puerto 8000 está ocupado: `python -m uvicorn main:app --reload --port 8001`.
- Error de CORS desde el frontend: Vite tiene que estar en `http://localhost:5173`; si usa otro puerto, definí `FRONTEND_ORIGIN` como se explica arriba.
