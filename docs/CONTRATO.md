# Contrato de datos – Kiosko El Rápido

Este documento es la **fuente de verdad** entre el frontend (TypeScript) y el backend (FastAPI + Pydantic).
Si un campo no está acá, no existe.

## 1. Decisiones tomadas

- Nombre del súper: **Kiosko El Rápido**.
- Todos los campos van en **inglés** (TypeScript, Pydantic y SQLite).
- `category` es un texto con valores fijos (no una tabla aparte).
- Los pedidos usan dos tablas: `orders` y `order_items`.
- No hay `customer_name`: los pedidos no tienen usuario.

## 2. Convenciones

| Tema | Regla |
|---|---|
| Nombres de campos | `snake_case` |
| Ids | enteros |
| Fechas | texto ISO 8601, por ejemplo `2026-11-02T15:30:00` |
| Dinero | número (`price`, `unit_price`, `total`) |
| Campos opcionales | se escriben `string \| null (opcional)` |

## 3. Categorías

Valores permitidos para `category`:

`bebidas`, `golosinas_snacks`, `lacteos`, `almacen`, `limpieza`, `cigarrillos`

## 4. Producto

| Campo | TypeScript | Pydantic | Regla |
|---|---|---|---|
| `id` | `number` | `int` | |
| `name` | `string` | `str` | |
| `category` | `Category` | `Category` (`Literal`) | uno de los 6 valores |
| `price` | `number` | `float` | mayor a 0 |
| `stock` | `number` | `int` | mayor o igual a 0 |
| `description` | `string \| null (opcional)` | `str \| None` | |
| `image` | `string \| null (opcional)` | `str \| None` | |

## 5. Pedido

**Lo que envía el frontend (`POST /api/orders`)**

| Campo | TypeScript | Pydantic | Regla |
|---|---|---|---|
| `items` | `OrderItemInput[]` | `list[OrderItemIn]` | al menos 1 elemento |
| `items[].product_id` | `number` | `int` | |
| `items[].quantity` | `number` | `int` | mayor o igual a 1 |

**Lo que responde el backend**

| Campo | TypeScript | Pydantic | Regla |
|---|---|---|---|
| `id` | `number` | `int` | |
| `created_at` | `string` | `datetime` | ISO 8601 |
| `total` | `number` | `float` | suma de `quantity * unit_price` |
| `items` | `OrderItemResponse[]` | `list[OrderItemOut]` | |
| `items[].product_id` | `number` | `int` | |
| `items[].quantity` | `number` | `int` | |
| `items[].unit_price` | `number` | `float` | precio del producto al momento de comprar |

## 6. Tipos que solo existen en el frontend

El backend no los conoce:

- `CartItem = { product: Product; quantity: number }`: un renglón del carrito. Al confirmar la compra se convierte en `OrderItemInput` (`product.id` pasa a `product_id`).

## 7. Endpoints

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/health` | Estado del servidor | 200 |
| GET | `/api/products` | Lista los productos; con `?category=<valor>` filtra por categoría (valor inválido: 422) | 200, 422 |
| GET | `/api/products/{id}` | Un producto | 200, 404, 422 |
| POST | `/api/orders` | Crea un pedido y descuenta stock | 201, 404, 409, 422 |
| POST | `/api/chat` | Consulta a KioscoBot (solo lectura: no crea pedidos ni toca stock) | 200, 422 |
| GET | `/api/orders` | Lista los pedidos, del más reciente al más antiguo (`id` descendente); si no hay pedidos devuelve `[]` | 200 |

Notas de `POST /api/orders`:

- Si un `product_id` se repite en `items`, el stock se descuenta de forma acumulada y se guarda un renglón por cada item.
- Si hay varios errores, se responde el del primer item que falle, según el orden en que llegaron.

`GET /api/orders` devuelve una lista de pedidos con el mismo formato que la respuesta de `POST /api/orders` (`id`, `created_at`, `total`, `items[]` con `product_id`, `quantity`, `unit_price`).

La búsqueda se hace en el frontend. El filtro por categoría puede hacerse en el frontend o con el parámetro opcional `?category=`.

### Chat (KioscoBot)

`POST /api/chat` recibe un mensaje y devuelve la respuesta del bot.

**Lo que envía el frontend**

| Campo | TypeScript | Pydantic | Regla |
|---|---|---|---|
| `message` | `string` | `str` | entre 1 y 500 caracteres (se ignoran los espacios del principio y del final) |

**Lo que responde el backend**

| Campo | TypeScript | Pydantic | Regla |
|---|---|---|---|
| `reply` | `string` | `str` | texto en español; puede tener saltos de línea (`\n`) |

Notas de `POST /api/chat`:

- Es solo de consulta: nunca llama a `POST /api/orders` ni modifica productos.
- Los datos de productos (precio, stock, categoría) salen de la base, igual que `GET /api/products`.
- Si no entiende la pregunta, o si la base no responde, devuelve 200 con un texto fijo. El 422 es solo por mensaje vacío o de más de 500 caracteres.
- Si el backend tiene configurada `BOT_API_KEY`, la respuesta la genera el modelo de IA con los datos de la tienda. Si la clave falta o la IA falla (error, timeout o respuesta vacía), se usa la respuesta por reglas de siempre. El formato y los códigos del endpoint no cambian: sigue siendo 200 y 422.
- Horarios y medios de pago son texto fijo del backend.
- Todavía no hay límite de mensajes por minuto (no existe el 429).

## 8. Ejemplos JSON

**POST /api/orders (pedido)**
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
  "id": 7,
  "created_at": "2026-11-02T15:30:00",
  "total": 3500.0,
  "items": [
    { "product_id": 1, "quantity": 2, "unit_price": 1200.0 },
    { "product_id": 4, "quantity": 1, "unit_price": 1100.0 }
  ]
}
```

**404 Not Found** (el producto no existe)
```json
{ "detail": "Product 99 not found" }
```

**409 Conflict** (no alcanza el stock; no se descuenta nada)
```json
{ "detail": "Insufficient stock for product 1" }
```

**422 Unprocessable Entity** (cantidad inválida; el formato lo genera FastAPI)
```json
{
  "detail": [
    {
      "type": "greater_than_equal",
      "loc": ["body", "items", 0, "quantity"],
      "msg": "Input should be greater than or equal to 1",
      "input": 0
    }
  ]
}
```

**GET /api/orders – 200 OK** (del más reciente al más antiguo; `[]` si no hay pedidos)
```json
[
  {
    "id": 7,
    "created_at": "2026-11-02T15:30:00",
    "total": 3500.0,
    "items": [
      { "product_id": 1, "quantity": 2, "unit_price": 1200.0 },
      { "product_id": 4, "quantity": 1, "unit_price": 1100.0 }
    ]
  },
  {
    "id": 6,
    "created_at": "2026-11-02T12:10:00",
    "total": 2400.0,
    "items": [
      { "product_id": 2, "quantity": 3, "unit_price": 800.0 }
    ]
  }
]
```

**POST /api/chat (pregunta)**
```json
{ "message": "¿Cuánto sale la Coca?" }
```

**200 OK**
```json
{ "reply": "Coca-Cola 500ml sale $ 1.200 y hay 25 unidades." }
```

## 9. Base de datos

- `products`: `id`, `name`, `category`, `price`, `stock`, `description`, `image`.
- `orders`: `id`, `created_at`, `total`.
- `order_items`: `id`, `order_id` (FK a `orders`), `product_id` (FK a `products`), `quantity`, `unit_price`.
- SQLite con `PRAGMA foreign_keys=ON`.
- El descuento de stock y la creación del pedido se hacen en **una sola transacción**: o se guarda todo, o nada.

## 10. Regla de cambios

1. Si hay que cambiar un campo, primero se avisa al grupo.
2. Se cambia este archivo en un PR.
3. Recién después se tocan `types/index.ts` y `schemas.py`, en el mismo PR o en otro inmediato.
4. Los tipos TypeScript y los esquemas Pydantic tienen que coincidir campo por campo con este documento.