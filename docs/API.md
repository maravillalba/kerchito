# API – Kiosko El Rápido

Referencia de los endpoints del backend (FastAPI). Los campos y sus reglas están definidos en [`CONTRATO.md`](CONTRATO.md), que es la fuente de verdad; este documento muestra cómo se usan, con pedidos y respuestas reales.

- **URL base:** `http://localhost:8000`
- **Documentación interactiva:** con el servidor levantado, abrí `http://localhost:8000/docs` (Swagger UI). Ahí se ven todos los endpoints y se pueden probar con el botón **Try it out**.

## 1. Convenciones

| Tema | Regla |
|---|---|
| Formato | Pedidos y respuestas en JSON. Los `POST` llevan `Content-Type: application/json`. |
| Errores | Siempre con la forma `{"detail": ...}`. En 404, 409 y 500 `detail` es un texto; en 422 es una lista con un objeto por cada error de validación (formato de FastAPI). |
| Dinero | Número (`price`, `unit_price`, `total`), por ejemplo `1200.0`. |
| Fechas | Texto ISO 8601, por ejemplo `2026-10-29T16:07:18.832206`. |
| Campos | En inglés y en `snake_case`. |

Los mensajes de error están en inglés tal cual los devuelve la API.

## 2. Endpoints

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/health` | Estado del servidor | 200 |
| GET | `/api/products` | Lista los productos; con `?category=` filtra por categoría | 200, 422 |
| GET | `/api/products/{id}` | Un producto | 200, 404, 422 |
| POST | `/api/orders` | Crea un pedido y descuenta stock | 201, 404, 409, 422 |
| GET | `/api/orders` | Lista los pedidos, del más reciente al más antiguo | 200 |

### GET /health

Sirve para comprobar que el servidor está andando.

**Pedido**

```
GET /health
```

**200 OK**

```json
{
  "status": "ok"
}
```

### GET /api/products

Devuelve todos los productos. Con el parámetro opcional `category` devuelve solo los de esa categoría. Valores válidos: `bebidas`, `golosinas_snacks`, `lacteos`, `almacen`, `limpieza`, `cigarrillos`.

**Pedido sin filtro**

```
GET /api/products
```

**200 OK** (devuelve los 10 productos del seed; acá se muestran los dos primeros)

```json
[
  {
    "id": 1,
    "name": "Coca-Cola 500ml",
    "category": "bebidas",
    "price": 1200.0,
    "stock": 25,
    "description": "Gaseosa clásica",
    "image": null
  },
  {
    "id": 2,
    "name": "Agua mineral 500ml",
    "category": "bebidas",
    "price": 800.0,
    "stock": 40,
    "description": "Agua sin gas",
    "image": null
  }
]
```

Productos que carga el seed con una base nueva:

| `id` | `name` | `category` | `price` | `stock` |
|---|---|---|---|---|
| 1 | Coca-Cola 500ml | `bebidas` | 1200.0 | 25 |
| 2 | Agua mineral 500ml | `bebidas` | 800.0 | 40 |
| 3 | Papas Lays Clásicas | `golosinas_snacks` | 1500.0 | 30 |
| 4 | Alfajor Jorgito | `golosinas_snacks` | 1100.0 | 50 |
| 5 | Leche entera 1L | `lacteos` | 1300.0 | 20 |
| 6 | Yogur firme frutilla | `lacteos` | 900.0 | 18 |
| 7 | Fideos tirabuzón 500g | `almacen` | 1400.0 | 30 |
| 8 | Galletitas de agua | `almacen` | 1000.0 | 35 |
| 9 | Lavandina 1L | `limpieza` | 1600.0 | 15 |
| 10 | Cigarrillos | `cigarrillos` | 2500.0 | 20 |

**Pedido con filtro**

```
GET /api/products?category=bebidas
```

**200 OK**

```json
[
  {
    "id": 1,
    "name": "Coca-Cola 500ml",
    "category": "bebidas",
    "price": 1200.0,
    "stock": 25,
    "description": "Gaseosa clásica",
    "image": null
  },
  {
    "id": 2,
    "name": "Agua mineral 500ml",
    "category": "bebidas",
    "price": 800.0,
    "stock": 40,
    "description": "Agua sin gas",
    "image": null
  }
]
```

**422 Unprocessable Entity** (categoría que no existe)

```
GET /api/products?category=xyz
```

```json
{
  "detail": [
    {
      "type": "literal_error",
      "loc": ["query", "category"],
      "msg": "Input should be 'bebidas', 'golosinas_snacks', 'lacteos', 'almacen', 'limpieza' or 'cigarrillos'",
      "input": "xyz",
      "ctx": {
        "expected": "'bebidas', 'golosinas_snacks', 'lacteos', 'almacen', 'limpieza' or 'cigarrillos'"
      }
    }
  ]
}
```

### GET /api/products/{id}

Devuelve un producto por su `id`.

**Pedido**

```
GET /api/products/1
```

**200 OK**

```json
{
  "id": 1,
  "name": "Coca-Cola 500ml",
  "category": "bebidas",
  "price": 1200.0,
  "stock": 25,
  "description": "Gaseosa clásica",
  "image": null
}
```

**404 Not Found** (el producto no existe)

```
GET /api/products/999
```

```json
{
  "detail": "Product 999 not found"
}
```

### POST /api/orders

Crea un pedido y descuenta el stock de cada producto. `items` tiene que tener al menos un elemento y cada `quantity` tiene que ser mayor o igual a 1. El backend toma `unit_price` del precio actual del producto y calcula `total` como la suma de `quantity * unit_price`.

El descuento de stock y la creación del pedido se hacen en una sola transacción: si algún item falla (404 o 409), no se guarda el pedido ni se descuenta nada. Si hay varios errores, se responde el del primer item que falle. Si un `product_id` se repite, el stock se descuenta de forma acumulada y se guarda un renglón por cada item.

**Pedido**

```
POST /api/orders
Content-Type: application/json
```

```json
{
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 4, "quantity": 1 }
  ]
}
```

**201 Created**

```json
{
  "id": 1,
  "created_at": "2026-10-29T16:07:18.832206",
  "total": 3500.0,
  "items": [
    { "product_id": 1, "quantity": 2, "unit_price": 1200.0 },
    { "product_id": 4, "quantity": 1, "unit_price": 1100.0 }
  ]
}
```

**404 Not Found** (un producto no existe)

```json
{ "items": [{ "product_id": 999, "quantity": 1 }] }
```

```json
{
  "detail": "Product 999 not found"
}
```

**409 Conflict** (no alcanza el stock)

```json
{ "items": [{ "product_id": 1, "quantity": 9999 }] }
```

```json
{
  "detail": "Insufficient stock for product 1"
}
```

**422 Unprocessable Entity** (cantidad menor a 1)

```json
{ "items": [{ "product_id": 1, "quantity": 0 }] }
```

```json
{
  "detail": [
    {
      "type": "greater_than_equal",
      "loc": ["body", "items", 0, "quantity"],
      "msg": "Input should be greater than or equal to 1",
      "input": 0,
      "ctx": { "ge": 1 }
    }
  ]
}
```

**422 Unprocessable Entity** (lista de items vacía)

```json
{ "items": [] }
```

```json
{
  "detail": [
    {
      "type": "too_short",
      "loc": ["body", "items"],
      "msg": "List should have at least 1 item after validation, not 0",
      "input": [],
      "ctx": {
        "field_type": "List",
        "min_length": 1,
        "actual_length": 0
      }
    }
  ]
}
```

### GET /api/orders

Devuelve todos los pedidos, del más reciente al más antiguo (`id` descendente), con el mismo formato que la respuesta de `POST /api/orders`. Si no hay pedidos devuelve `[]`.

**Pedido**

```
GET /api/orders
```

**200 OK** (después de las pruebas de arriba: solo existe el pedido 1, porque los pedidos con error no se guardaron)

```json
[
  {
    "id": 1,
    "created_at": "2026-10-29T16:07:18.832206",
    "total": 3500.0,
    "items": [
      { "product_id": 1, "quantity": 2, "unit_price": 1200.0 },
      { "product_id": 4, "quantity": 1, "unit_price": 1100.0 }
    ]
  }
]
```

## 3. Códigos de respuesta

| Código | Cuándo | `detail` |
|---|---|---|
| 200 OK | Lectura correcta (`GET`) | — |
| 201 Created | Pedido creado (`POST /api/orders`) | — |
| 404 Not Found | El producto no existe (`GET /api/products/{id}` o un `product_id` de `POST /api/orders`) | `"Product 999 not found"` |
| 409 Conflict | No alcanza el stock de un producto del pedido | `"Insufficient stock for product 1"` |
| 422 Unprocessable Entity | Datos inválidos: `category` que no existe | lista con `"type": "literal_error"` |
| 422 Unprocessable Entity | Datos inválidos: `quantity` menor a 1 (por ejemplo `0`) | lista con `"type": "greater_than_equal"` |
| 422 Unprocessable Entity | Datos inválidos: `items` vacío (`[]`) | lista con `"type": "too_short"` |
| 422 Unprocessable Entity | Datos inválidos: falta el campo `items` en el pedido | lista con `"type": "missing"` |
| 422 Unprocessable Entity | Datos inválidos: `product_id` que no es un número entero (por ejemplo `"abc"`, o `/api/products/abc` en la URL) | lista con `"type": "int_parsing"` |
| 500 Internal Server Error | Error inesperado de la base de datos (queda registrado en el log del servidor) | `"Internal server error"` |

## 4. Cómo probar a mano

1. Desde la carpeta `backend/`, con el entorno virtual activado, levantá el servidor:

   ```bash
   python -m uvicorn main:app --reload
   ```

   Al arrancar crea las tablas y, si la tabla `products` está vacía, carga el seed. No hace falta ningún paso previo.

2. Abrí `http://localhost:8000/docs`.
3. Elegí un endpoint, tocá **Try it out**, completá los parámetros o el cuerpo y tocá **Execute**. Debajo aparecen el código de respuesta y el JSON.

Para volver a empezar con el stock original, cortá el servidor, borrá `backend/kiosco.db` y volvé a levantarlo.
