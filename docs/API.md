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
| POST | `/api/chat` | Consulta a KioscoBot (solo lectura: no crea pedidos ni toca stock) | 200, 422 |

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

**200 OK** (devuelve los 35 productos del seed; acá se muestran los dos primeros)

```json
[
  {
    "id": 1,
    "name": "Coca-Cola 500ml",
    "category": "bebidas",
    "price": 1200.0,
    "stock": 25,
    "description": "Gaseosa clásica",
    "image": "/productos/coca-cola.webp"
  },
  {
    "id": 2,
    "name": "Agua mineral 500ml",
    "category": "bebidas",
    "price": 800.0,
    "stock": 40,
    "description": "Agua sin gas",
    "image": "/productos/agua-mineral.webp"
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
| 11 | Yerba mate 500 g | `almacen` | 1900.0 | 30 |
| 12 | Azúcar 1 kg | `almacen` | 1100.0 | 25 |
| 13 | Aceite de girasol 900 ml | `almacen` | 2100.0 | 20 |
| 14 | Arroz largo fino 1 kg | `almacen` | 1300.0 | 25 |
| 15 | Puré de tomate 520 g | `almacen` | 800.0 | 30 |
| 16 | Gaseosa lima-limón 500 ml | `bebidas` | 1100.0 | 30 |
| 17 | Jugo de naranja 1 L | `bebidas` | 1500.0 | 20 |
| 18 | Agua saborizada pomelo 500 ml | `bebidas` | 1000.0 | 25 |
| 19 | Cerveza rubia lata 473 ml | `bebidas` | 1700.0 | 40 |
| 20 | Fernet 750 ml | `bebidas` | 9500.0 | 10 |
| 21 | Vino tinto malbec 750 ml | `bebidas` | 3800.0 | 12 |
| 22 | Alfajor triple de dulce de leche | `golosinas_snacks` | 1300.0 | 40 |
| 23 | Caramelos masticables x 10 | `golosinas_snacks` | 500.0 | 40 |
| 24 | Chicles de menta x 5 | `golosinas_snacks` | 600.0 | 35 |
| 25 | Turrón de maní 25 g | `golosinas_snacks` | 400.0 | 40 |
| 26 | Queso cremoso 500 g | `lacteos` | 4500.0 | 10 |
| 27 | Manteca 200 g | `lacteos` | 2300.0 | 15 |
| 28 | Dulce de leche 400 g | `lacteos` | 2400.0 | 20 |
| 29 | Crema de leche 200 ml | `lacteos` | 1600.0 | 12 |
| 30 | Detergente 500 ml | `limpieza` | 1400.0 | 20 |
| 31 | Jabón en polvo 800 g | `limpieza` | 3200.0 | 12 |
| 32 | Papel higiénico x 4 | `limpieza` | 2600.0 | 20 |
| 33 | Esponja doble faz | `limpieza` | 600.0 | 30 |
| 34 | Cigarrillos mentolados x 20 | `cigarrillos` | 2700.0 | 15 |
| 35 | Tabaco para armar 30 g | `cigarrillos` | 3000.0 | 8 |

Cada producto del seed trae en `image` la ruta de su foto, por ejemplo `/productos/coca-cola.webp`. Es una ruta del frontend, no del backend: los archivos están en `frontend/public/productos/` y los sirve Vite. Si `image` es `null` o la foto no carga, el frontend muestra la imagen de la categoría.

**Pedido con filtro**

```
GET /api/products?category=bebidas
```

**200 OK** (devuelve los 8 productos de `bebidas` del seed; acá se muestran los dos primeros)

```json
[
  {
    "id": 1,
    "name": "Coca-Cola 500ml",
    "category": "bebidas",
    "price": 1200.0,
    "stock": 25,
    "description": "Gaseosa clásica",
    "image": "/productos/coca-cola.webp"
  },
  {
    "id": 2,
    "name": "Agua mineral 500ml",
    "category": "bebidas",
    "price": 800.0,
    "stock": 40,
    "description": "Agua sin gas",
    "image": "/productos/agua-mineral.webp"
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
  "image": "/productos/coca-cola.webp"
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

### POST /api/chat

Manda una pregunta a KioscoBot y devuelve su respuesta. `message` tiene que tener entre 1 y 500 caracteres; los espacios del principio y del final no cuentan. La respuesta (`reply`) es un texto en español que puede tener saltos de línea (`\n`).

Es solo de consulta: nunca crea pedidos ni modifica productos. Los precios y el stock salen de la base, igual que en `GET /api/products`. Si no entiende la pregunta responde 200 con un texto fijo que explica en qué puede ayudar, y si la base no responde también devuelve 200, con el texto `"Ahora no puedo consultar los productos. Probá de nuevo en un rato."` (no devuelve 500). Horarios y medios de pago son texto fijo del backend. Todavía no hay límite de mensajes por minuto (no existe el 429).

Si el backend tiene configurada `BOT_API_KEY`, la respuesta la genera el modelo de IA con los datos de la tienda. Si la clave falta o la IA falla (error, timeout o respuesta vacía), se usa la respuesta por reglas de siempre. El formato y los códigos del endpoint no cambian: sigue siendo 200 y 422. Los ejemplos de abajo son respuestas por reglas (sin `BOT_API_KEY`).

Si la IA falla, incluso con un error inesperado, el chat responde 200 con las reglas.

**Pedido**

```
POST /api/chat
Content-Type: application/json
```

```json
{ "message": "¿Cuánto sale la Coca?" }
```

**200 OK** (precio)

```json
{
  "reply": "Coca-Cola 500ml sale $ 1.200 y hay 25 unidades."
}
```

**200 OK** (stock)

```json
{ "message": "¿Tienen leche?" }
```

```json
{
  "reply": "Encontré estos productos:\n- Leche entera 1L: $ 1.300 (20 unidades)\n- Alfajor triple de dulce de leche: $ 1.300 (40 unidades)\n- Dulce de leche 400 g: $ 2.400 (20 unidades)\n- Crema de leche 200 ml: $ 1.600 (12 unidades)\nEl stock puede cambiar hasta que confirmes el pedido."
}
```

**200 OK** (categoría, con saltos de línea; el bot muestra hasta 6 productos y resume el resto con "… y N más")

```json
{ "message": "¿Qué bebidas tienen?" }
```

```json
{
  "reply": "En Bebidas tengo:\n- Coca-Cola 500ml: $ 1.200 (25 unidades)\n- Agua mineral 500ml: $ 800 (40 unidades)\n- Gaseosa lima-limón 500 ml: $ 1.100 (30 unidades)\n- Jugo de naranja 1 L: $ 1.500 (20 unidades)\n- Agua saborizada pomelo 500 ml: $ 1.000 (25 unidades)\n- Cerveza rubia lata 473 ml: $ 1.700 (40 unidades)\n… y 2 más."
}
```

**200 OK** (saludo)

```json
{ "message": "Hola" }
```

```json
{
  "reply": "¡Hola! Soy KioscoBot. Puedo ayudarte con precios, stock, categorías, horarios, medios de pago y cómo hacer un pedido. ¿Qué necesitás?"
}
```

**422 Unprocessable Entity** (mensaje vacío; con solo espacios, como `"   "`, responde lo mismo)

```json
{ "message": "" }
```

```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "message"],
      "msg": "String should have at least 1 character",
      "input": "",
      "ctx": { "min_length": 1 }
    }
  ]
}
```

**422 Unprocessable Entity** (mensaje de más de 500 caracteres; `input` trae el mensaje completo, acá se acortó)

```json
{
  "detail": [
    {
      "type": "string_too_long",
      "loc": ["body", "message"],
      "msg": "String should have at most 500 characters",
      "input": "aaaa…",
      "ctx": { "max_length": 500 }
    }
  ]
}
```

## 3. Códigos de respuesta

| Código | Cuándo | `detail` |
|---|---|---|
| 200 OK | Lectura correcta (`GET`) o respuesta de KioscoBot (`POST /api/chat`) | — |
| 201 Created | Pedido creado (`POST /api/orders`) | — |
| 404 Not Found | El producto no existe (`GET /api/products/{id}` o un `product_id` de `POST /api/orders`) | `"Product 999 not found"` |
| 409 Conflict | No alcanza el stock de un producto del pedido | `"Insufficient stock for product 1"` |
| 422 Unprocessable Entity | Datos inválidos: `category` que no existe | lista con `"type": "literal_error"` |
| 422 Unprocessable Entity | Datos inválidos: `quantity` menor a 1 (por ejemplo `0`) | lista con `"type": "greater_than_equal"` |
| 422 Unprocessable Entity | Datos inválidos: `items` vacío (`[]`) | lista con `"type": "too_short"` |
| 422 Unprocessable Entity | Datos inválidos: falta el campo `items` en el pedido | lista con `"type": "missing"` |
| 422 Unprocessable Entity | Datos inválidos: `product_id` que no es un número entero (por ejemplo `"abc"`, o `/api/products/abc` en la URL) | lista con `"type": "int_parsing"` |
| 422 Unprocessable Entity | Datos inválidos: `message` del chat vacío o con solo espacios | lista con `"type": "string_too_short"` |
| 422 Unprocessable Entity | Datos inválidos: `message` del chat de más de 500 caracteres | lista con `"type": "string_too_long"` |
| 500 Internal Server Error | Error inesperado de la base de datos (queda registrado en el log del servidor). No aplica a `POST /api/chat`, que en ese caso responde 200 con un texto fijo | `"Internal server error"` |

## 4. Cómo probar a mano

1. Desde la carpeta `backend/`, con el entorno virtual activado, levantá el servidor:

   ```bash
   python -m uvicorn main:app --reload
   ```

   Al arrancar crea las tablas y, si la tabla `products` está vacía, carga el seed. No hace falta ningún paso previo.

2. Abrí `http://localhost:8000/docs`.
3. Elegí un endpoint, tocá **Try it out**, completá los parámetros o el cuerpo y tocá **Execute**. Debajo aparecen el código de respuesta y el JSON.

Para volver a empezar con el stock original, cortá el servidor, borrá `backend/kiosco.db` y volvé a levantarlo.
