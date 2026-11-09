# Contrato de datos – Kiosko El Rápido

Este documento es la **fuente de verdad** entre el frontend (TypeScript) y el backend (FastAPI + Pydantic).
Si un campo no está acá, no existe.

## 1. Decisiones tomadas

- Nombre del súper: **Kiosko El Rápido**.
- Todos los campos van en **inglés** (TypeScript, Pydantic y SQLite).
- `category` es un texto con valores fijos (no una tabla aparte).
- Los pedidos usan dos tablas: `orders` y `order_items`.
- No hay `customer_name`: cada pedido pertenece a un cliente con cuenta (`user_id`).
- **El backend es la autoridad:** calcula precios, descuentos, puntos y totales. El frontend solo manda `product_id`, `quantity`, `payment_method` y `use_points`; lo que muestra antes de confirmar es una vista previa.
- Sin sesión no se entra a la tienda: se redirige a `/bienvenida`. Esto vive en **una sola constante** del frontend (`TIENDA_REQUIERE_SESION`) porque está pendiente de confirmar con el profe.
- Siguen sin autenticación: `GET /health`, `GET /api/products`, `GET /api/products/{id}` y `POST /api/chat`.
- `cost` (costo de compra) es un dato interno: **nunca** sale por los endpoints públicos de productos.

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
| `brand` | `string` | `str` | marca; no vacía (por ejemplo `"Coca-Cola"`) |
| `name` | `string` | `str` | solo el producto, sin la marca ni la presentación; no vacío (por ejemplo `"Original"`) |
| `unit` | `string` | `str` | capacidad o presentación; no vacía (por ejemplo `"1,5 L"`, `"1 kg"`, `"500 ml"`, `"x 20"`) |
| `category` | `Category` | `Category` (`Literal`) | uno de los 6 valores |
| `price` | `number` | `float` | precio normal; mayor a 0 |
| `offer_price` | `number \| null (opcional)` | `float \| None` | precio de oferta; si viene, mayor a 0 y menor que `price`. `null` = sin oferta |
| `stock` | `number` | `int` | mayor o igual a 0 |
| `description` | `string \| null (opcional)` | `str \| None` | |
| `image` | `string \| null (opcional)` | `str \| None` | ruta pública de la foto. Las del seed las sirve el frontend (`/productos/coca-cola.webp`); las subidas por el admin las sirve el backend (`/uploads/products/<uuid>.webp`). Sin foto, el frontend muestra la imagen de la categoría |

El nombre completo para mostrar es `brand` + `name` + `unit`: `"Coca-Cola Original 500 ml"`.

Esquemas de Pydantic:

- `ProductIn`: los campos de arriba menos `id`, con sus validaciones.
- `ProductOut`: `ProductIn` + `id`. Es lo que devuelven los endpoints públicos: **no** incluye `cost`.
- `ProductAdminIn`: lo que manda el admin en `POST` y `PUT`: los campos de arriba menos `id` e `image`, más `cost` (obligatorio). La foto se cambia solo con `POST /api/products/{id}/image`; un `image` en el cuerpo se ignora.
- `ProductAdminOut`: `ProductOut` + `cost`.

| Campo solo de admin | TypeScript | Pydantic | Regla |
|---|---|---|---|
| `cost` | `number` | `float` | costo de compra; mayor o igual a 0 |

**Precio que se cobra:** `offer_price` si existe, si no `price`. Lo calcula siempre el backend al crear el pedido.

**Foto (`POST /api/products/{id}/image`):** multipart con el campo `file`. Se valida el tipo real por el contenido del archivo (JPG, PNG o WebP), máximo 2 MB. Se guarda en `backend/uploads/products/` con nombre UUID y se publica en `/uploads/products/`. Al reemplazar o borrar un producto se borra la foto subida anterior, nunca las del seed.

## 5. Pedido

**Lo que envía el frontend (`POST /api/orders`)**

| Campo | TypeScript | Pydantic | Regla |
|---|---|---|---|
| `items` | `OrderItemInput[]` | `list[OrderItemIn]` | al menos 1 elemento |
| `items[].product_id` | `number` | `int` | |
| `items[].quantity` | `number` | `int` | mayor o igual a 1 |
| `payment_method` | `PaymentMethod` | `PaymentMethod` (`Literal`) | `efectivo`, `transferencia`, `tarjeta` o `mercado_pago` |
| `use_points` | `boolean` | `bool` | opcional, por defecto `false` |

**Lo que responde el backend (`OrderOut`)**

| Campo | TypeScript | Pydantic | Regla |
|---|---|---|---|
| `id` | `number` | `int` | |
| `created_at` | `string` | `datetime` | ISO 8601 |
| `status` | `OrderStatus` | `OrderStatus` (`Literal`) | `active` o `cancelled` |
| `payment_method` | `PaymentMethod` | `PaymentMethod` | |
| `subtotal` | `number` | `float` | suma de `quantity * unit_price` (con ofertas aplicadas, antes de descuentos) |
| `first_purchase_discount` | `number` | `float` | 15% de primera compra; `0` si no corresponde |
| `points_discount` | `number` | `float` | descuento por canje de puntos; `0` si no hubo |
| `discount_amount` | `number` | `float` | `first_purchase_discount + points_discount` |
| `total` | `number` | `float` | `subtotal - discount_amount`: lo que se cobra. Mayor o igual a 0 |
| `points_used` | `number` | `int` | puntos canjeados |
| `points_earned` | `number` | `int` | puntos ganados |
| `items` | `OrderItemResponse[]` | `list[OrderItemOut]` | |
| `items[].product_id` | `number` | `int` | |
| `items[].product_name` | `string` | `str` | nombre completo actual del producto |
| `items[].quantity` | `number` | `int` | |
| `items[].unit_price` | `number` | `float` | precio cobrado al momento de comprar: `offer_price` si el producto tenía oferta, si no `price`. Lo calcula el backend; el frontend no manda precios |

`POST /api/orders` agrega `points_balance` (`number`): el saldo del cliente después de la compra. `GET /api/admin/orders` agrega `customer` (`id`, `first_name`, `last_name`, `email`).

### Reglas de puntos

Están en **un solo archivo**, `backend/points.py`, como constantes. El frontend las repite solo para la vista previa.

| Regla | Valor |
|---|---|
| Puntos ganados | 1 punto cada $100 del **total final**, redondeando hacia abajo |
| Canje | 100 puntos = $500. Con `use_points` se canjean **todos los bloques de 100 que alcancen**, sin superar lo que queda por pagar. Si no alcanza para un bloque, no hay canje y el pedido sigue igual (no es un error) |
| Primera compra | 15% del subtotal (con ofertas ya aplicadas), redondeado al centavo, si el cliente no tiene ningún pedido `active` |
| Orden del cálculo | subtotal → 15% → canje → total → puntos ganados |
| Saldo | suma de `points_movements.points` del cliente. **Puede ser negativo** (ver anulación); con saldo negativo no se puede canjear |
| Niveles (solo informativos) | según el saldo actual: Bronce desde 0, Plata desde 300, Oro desde 1000. Un saldo negativo es Bronce |

**Anulación (`PATCH /api/orders/{id}/cancel`)**, en una sola transacción: el pedido pasa a `cancelled`, se devuelve el stock, se revierten los puntos ganados y se devuelven los usados, con un movimiento por cada cosa. Si el cliente ya gastó los puntos ganados, su saldo queda negativo. Como la primera compra se calcula sobre los pedidos activos, si al cliente no le queda ninguno vuelve a tener el 15%. Anular dos veces da 409. Los campos del pedido anulado se conservan como registro.

## 6. Tipos que solo existen en el frontend

El backend no los conoce:

- `CartItem = { product: Product; quantity: number }`: un renglón del carrito. Al confirmar la compra se convierte en `OrderItemInput` (`product.id` pasa a `product_id`).

## 7. Cuentas y sesiones

**Lo que envía el frontend en `POST /api/auth/register`**

| Campo | TypeScript | Pydantic | Regla |
|---|---|---|---|
| `first_name` | `string` | `str` | no vacío |
| `last_name` | `string` | `str` | no vacío |
| `email` | `string` | `str` | formato de correo; se guarda en minúsculas y es único |
| `phone` | `string \| null (opcional)` | `str \| None` | vacío se guarda como `null` |
| `password` | `string` | `str` | entre 8 y 128 caracteres |

`POST /api/auth/login` recibe `email` y `password`.

**Lo que responde el backend (`AuthOut`, en `register` y `login`)**: `token` (`string`), `expires_at` (`string`, ISO 8601) y `user` (`UserOut`).

**`UserOut`** (también lo devuelve `GET /api/auth/me`)

| Campo | TypeScript | Pydantic | Regla |
|---|---|---|---|
| `id` | `number` | `int` | |
| `first_name` | `string` | `str` | |
| `last_name` | `string` | `str` | |
| `email` | `string` | `str` | |
| `phone` | `string \| null` | `str \| None` | |
| `role` | `Role` | `Role` (`Literal`) | `customer` o `admin` |
| `created_at` | `string` | `datetime` | |
| `points` | `number` | `int` | saldo actual; `0` para el admin |
| `first_purchase_available` | `boolean` | `bool` | si la próxima compra lleva el 15%; `false` para el admin |

**Reglas**

- Autenticación con el header `Authorization: Bearer <token>`. El token vence a los 7 días y en la base se guarda solo su hash; la contraseña se guarda con hash scrypt y salt aleatorio.
- `401`: sin token, token inválido o vencido, o login incorrecto. El login siempre dice `"Correo o contraseña incorrectos"`, exista o no el correo.
- `403`: hay sesión, pero no el permiso. `POST /api/orders` es solo para `customer`: el admin recibe 403.
- `register` responde `409` si el correo ya tiene cuenta.
- El admin no se registra: se crea al arrancar desde `ADMIN_EMAIL` y `ADMIN_PASSWORD` de `backend/.env`. Si ya existe, no se le cambia la contraseña.

## 8. Endpoints

| Método | Ruta | Acceso | Descripción | Respuestas |
|---|---|---|---|---|
| GET | `/health` | público | Estado del servidor | 200 |
| GET | `/api/products` | público | Lista los productos; con `?category=<valor>` filtra por categoría (valor inválido: 422) | 200, 422 |
| GET | `/api/products/{id}` | público | Un producto | 200, 404, 422 |
| POST | `/api/chat` | público | Consulta a KioscoBot (solo lectura: no crea pedidos ni toca stock) | 200, 422 |
| POST | `/api/auth/register` | público | Crea un cliente y devuelve la sesión | 201, 409, 422 |
| POST | `/api/auth/login` | público | Inicia sesión | 200, 401, 422 |
| GET | `/api/auth/me` | sesión | Usuario actual con su saldo | 200, 401 |
| POST | `/api/auth/logout` | sesión | Cierra la sesión actual | 204, 401 |
| POST | `/api/products` | admin | Crea un producto | 201, 401, 403, 422 |
| PUT | `/api/products/{id}` | admin | Reemplaza los datos del producto (no toca `image`) | 200, 401, 403, 404, 422 |
| DELETE | `/api/products/{id}` | admin | Borra el producto; 409 si ya está en un pedido | 204, 401, 403, 404, 409 |
| PATCH | `/api/products/{id}/stock` | admin | Fija el stock: `{ "stock": 10 }` (valor absoluto, mayor o igual a 0) | 200, 401, 403, 404, 422 |
| POST | `/api/products/{id}/image` | admin | Sube o reemplaza la foto; devuelve `ProductAdminOut` | 200, 401, 403, 404, 413, 415, 422 |
| POST | `/api/orders` | cliente | Crea un pedido, descuenta stock y aplica descuentos y puntos | 201, 401, 403, 404, 409, 422 |
| GET | `/api/orders/mine` | cliente | Pedidos del cliente, del más reciente al más antiguo | 200, 401, 403 |
| GET | `/api/orders` | admin | Lista todos los pedidos, del más reciente al más antiguo (`id` descendente); si no hay devuelve `[]` | 200, 401, 403 |
| PATCH | `/api/orders/{id}/cancel` | admin | Anula el pedido; 409 si ya estaba anulado | 200, 401, 403, 404, 409 |
| GET | `/api/admin/products` | admin | Productos con `cost` (para el inventario) | 200, 401, 403 |
| GET | `/api/admin/orders` | admin | Pedidos con cliente, medio, ítems, total, puntos y estado | 200, 401, 403 |
| GET | `/api/admin/summary` | admin | Números del panel | 200, 401, 403 |
| GET | `/api/admin/customers` | admin | Clientes con puntos, nivel y compras | 200, 401, 403 |
| GET | `/api/admin/customers/{id}` | admin | Un cliente con sus movimientos | 200, 401, 403, 404 |
| POST | `/api/admin/customers/{id}/points` | admin | Ajuste manual de puntos; devuelve el cliente con sus movimientos | 201, 401, 403, 404, 422 |

Notas de `POST /api/orders`:

- Si un `product_id` se repite en `items`, el stock se descuenta de forma acumulada y se guarda un renglón por cada item.
- Si hay varios errores, se responde el del primer item que falle, según el orden en que llegaron.

**`GET /api/admin/summary`:** `total_revenue` (suma de `total`), `net_profit` (suma de `(unit_price - cost) * quantity`, con el `cost` actual del producto y sin restar descuentos), `stock_units`, `points_in_circulation` (suma de todos los movimientos), `best_sellers[]` (`product_id`, `product_name`, `units_sold`; hasta 5) y `top_customers[]` (`id`, `first_name`, `last_name`, `points`; hasta 5, solo con saldo positivo). Las ventas cuentan solo pedidos `active`.

**`GET /api/admin/customers`:** `id`, `first_name`, `last_name`, `email`, `phone`, `points`, `level` (`"Bronce"`, `"Plata"` o `"Oro"`), `orders_count`, `total_spent`, `last_order_at` (`string \| null`). Compras, gasto y última compra cuentan solo pedidos `active`. El detalle agrega `movements[]`: `id`, `order_id` (`number \| null`), `points`, `reason`, `created_at`, del más nuevo al más viejo.

**`POST /api/admin/customers/{id}/points`:** `points` (entero distinto de 0, con signo) y `reason` (texto obligatorio).

Los mensajes de error de los endpoints nuevos van en español porque el frontend los muestra tal cual; los que ya existían (`Product 99 not found`, `Insufficient stock for product 1`) no cambian.

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
- Nombra los productos con su nombre completo (`brand` + `name` + `unit`). Si un producto tiene oferta, informa el precio de oferta y el normal entre paréntesis: `"$ 1.000 en oferta (precio normal $ 1.200)"`.
- Si no entiende la pregunta, o si la base no responde, devuelve 200 con un texto fijo. El 422 es solo por mensaje vacío o de más de 500 caracteres.
- Si el backend tiene configurada `BOT_API_KEY`, la respuesta la genera el modelo de IA con los datos de la tienda. Si la clave falta o la IA falla (error, timeout o respuesta vacía), se usa la respuesta por reglas de siempre. El formato y los códigos del endpoint no cambian: sigue siendo 200 y 422.
- Horarios y medios de pago son texto fijo del backend.
- Todavía no hay límite de mensajes por minuto (no existe el 429).

## 9. Ejemplos JSON

**POST /api/orders (pedido)**
```json
{
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 4, "quantity": 1 }
  ],
  "payment_method": "mercado_pago",
  "use_points": false
}
```

**201 Created** (primera compra: 15% sobre 3100. El producto 1 está en oferta: se cobra `offer_price` 1000 en lugar de `price` 1200)
```json
{
  "id": 7,
  "created_at": "2026-11-02T15:30:00",
  "status": "active",
  "payment_method": "mercado_pago",
  "subtotal": 3100.0,
  "first_purchase_discount": 465.0,
  "points_discount": 0.0,
  "discount_amount": 465.0,
  "total": 2635.0,
  "points_used": 0,
  "points_earned": 26,
  "points_balance": 26,
  "items": [
    { "product_id": 1, "product_name": "Coca-Cola Original 500 ml", "quantity": 2, "unit_price": 1000.0 },
    { "product_id": 4, "product_name": "Jorgito Alfajor 55 g", "quantity": 1, "unit_price": 1100.0 }
  ]
}
```

**401 Unauthorized** (sin sesión, o sesión vencida)
```json
{ "detail": "Iniciá sesión para continuar" }
```

**403 Forbidden** (la sesión no tiene permiso)
```json
{ "detail": "No tenés permiso para hacer esto" }
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

**POST /api/chat (pregunta)**
```json
{ "message": "¿Cuánto sale la Coca?" }
```

**200 OK**
```json
{ "reply": "Coca-Cola Original 500 ml sale $ 1.000 en oferta (precio normal $ 1.200) y hay 25 unidades." }
```

**GET /api/products/1 – 200 OK** (producto con oferta; sin oferta, `offer_price` es `null`)
```json
{
  "id": 1,
  "brand": "Coca-Cola",
  "name": "Original",
  "unit": "500 ml",
  "category": "bebidas",
  "price": 1200.0,
  "offer_price": 1000.0,
  "stock": 25,
  "description": "Gaseosa clásica",
  "image": "/productos/coca-cola.webp"
}
```

## 10. Base de datos

- `users`: `id`, `first_name`, `last_name`, `email` (único, en minúsculas), `phone`, `password_hash`, `role` (`customer` o `admin`), `created_at`.
- `sessions`: `id`, `user_id` (FK a `users`), `token_hash` (único), `created_at`, `expires_at`.
- `products`: `id`, `brand`, `name`, `unit`, `category`, `price`, `offer_price`, `stock`, `cost`, `description`, `image`. Restricciones: `brand`, `name` y `unit` no vacíos; `offer_price` nulo o mayor a 0 y menor que `price`; `cost` mayor o igual a 0.
- `orders`: `id`, `created_at`, `user_id` (FK a `users`), `payment_method`, `status`, `discount_amount`, `points_used`, `points_earned`, `total`.
- `order_items`: `id`, `order_id` (FK a `orders`), `product_id` (FK a `products`), `quantity`, `unit_price`.
- `points_movements`: `id`, `user_id` (FK a `users`), `order_id` (FK a `orders`, nulo en ajustes manuales), `points` (con signo, distinto de 0), `reason` (no vacío), `created_at`.
- SQLite con `PRAGMA foreign_keys=ON`.
- Crear un pedido y anularlo se hacen cada uno en **una sola transacción**: o se guarda todo (stock, pedido y puntos), o nada.
- **No hay migraciones.** Una `kiosco.db` vieja no se actualiza sola: al arrancar, el servidor avisa que hay que borrarla. Para regenerarla: cortá el servidor, borrá `backend/kiosco.db` y volvé a levantarlo; se crean las tablas, el seed y el admin. Se pierden los pedidos y las cuentas de esa base.

## 11. Regla de cambios

1. Si hay que cambiar un campo, primero se avisa al grupo.
2. Se cambia este archivo en un PR.
3. Recién después se tocan `types/index.ts` y `schemas.py`, en el mismo PR o en otro inmediato.
4. Los tipos TypeScript y los esquemas Pydantic tienen que coincidir campo por campo con este documento.