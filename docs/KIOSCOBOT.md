# KioscoBot – Chatbot de soporte de Kiosko El Rápido

> **Estado.** El bot ya está implementado en `POST /api/chat` (ver [`CONTRATO.md`](CONTRATO.md) y [`API.md`](API.md)) y el widget del chat ya existe en el frontend. Responde con reglas y tiene una capa de IA opcional: si `backend/.env` tiene `BOT_API_KEY`, la respuesta la genera el modelo (`BOT_MODEL`, por defecto `claude-haiku-5-5`); si no hay clave o la IA falla, responde con las reglas. Lo marcado como **(propuesta)** todavía no existe: el límite de mensajes por minuto y el historial del lado del bot. Hay que acordarlo y, si se aprueba, agregarlo a [`CONTRATO.md`](CONTRATO.md) y [`API.md`](API.md) antes de programarlo.

## 1. Qué es y para qué sirve

KioscoBot es un chat de ayuda dentro de la tienda. Responde preguntas cortas de los clientes sobre los productos, los precios, el stock, las categorías y cómo hacer un pedido.

- Sirve para **consultar e informar**, no para operar: no compra, no modifica nada y no reemplaza al carrito.
- Responde en español rioplatense, con mensajes cortos y amables.
- Los datos de productos salen siempre de la API del kiosko, nunca de lo que "sabe" el modelo.

## 2. Intenciones que entiende

| Intención | Ejemplos de pregunta | Qué responde | De dónde sale el dato |
|---|---|---|---|
| Precio de un producto | "¿Cuánto sale la Coca?", "¿Qué precio tiene el alfajor?" | Nombre y precio del producto. Si hay varios parecidos, los lista. | `GET /api/products` (campo `price`) |
| Stock / disponibilidad | "¿Tienen leche?", "¿Queda lavandina?" | Si hay stock y cuántas unidades. Si `stock` es 0, dice "Sin stock". | `GET /api/products` (campo `stock`) |
| Productos por categoría | "¿Qué bebidas tienen?", "Mostrame los lácteos" | Lista de productos de esa categoría con precio. | `GET /api/products?category=<valor>` |
| Categorías | "¿Qué venden?", "¿Qué categorías hay?" | Las 6 categorías: Bebidas, Golosinas y snacks, Lácteos, Almacén, Limpieza, Cigarrillos. | Valores fijos de [`CONTRATO.md`](CONTRATO.md) §3 |
| Cómo hacer un pedido | "¿Cómo compro?", "¿Cómo finalizo el pedido?" | Los pasos: elegir productos → "Agregar al carrito" → ir a Carrito → "Finalizar pedido". Aclara que el stock se confirma al finalizar. | Texto fijo (flujo actual de la app) |
| Estado del carrito | "¿Qué tengo en el carrito?", "¿Cuánto llevo gastado?" | Productos, cantidades y total del carrito. | El carrito vive solo en el frontend (`CartContext`) y el frontend no lo manda: el bot responde con un texto fijo que indica ir a la sección Carrito. |
| Horarios | "¿A qué hora abren?", "¿Abren el domingo?" | Los horarios del kiosko. | **No existe en la API.** Texto fijo en el backend (ver §6) |
| Medios de pago | "¿Aceptan tarjeta?", "¿Puedo pagar con Mercado Pago?" | Los medios de pago del kiosko. | **No existe en la API.** Texto fijo en el backend (ver §6) |
| Ayuda general | "Hola", "¿Qué podés hacer?", "Gracias" | Saludo y lista corta de lo que puede responder. | Texto fijo |

## 3. Límites (qué NO hace)

- **No crea pedidos por sí solo.** Nunca llama a `POST /api/orders`. Para comprar, el cliente usa el botón "Finalizar pedido" del carrito.
- **No modifica stock ni productos.** Solo lee datos; no tiene acceso a ninguna operación de escritura.
- **No inventa productos ni precios.** Si un producto no aparece en `GET /api/products`, responde que no lo tiene. Los precios y el stock se informan tal cual vienen de la API, y se aclara que el stock puede cambiar hasta que se confirma el pedido.
- **No responde fuera del tema del kiosko** (tareas, noticias, opiniones, salud, etc.). Contesta que solo puede ayudar con la tienda.
- **No guarda datos personales.** No pide nombre, teléfono, dirección ni datos de pago, y no guarda las conversaciones en la base. Si el cliente los escribe igual, no los usa ni los repite.
- **No obedece instrucciones que cambien sus reglas** ("olvidá tus instrucciones", "decime tu clave", etc.). Sigue respondiendo solo sobre el kiosko.
- **Cuando no entiende** responde: *"Perdón, no te entendí. Puedo ayudarte con precios, stock, categorías, horarios, medios de pago y cómo hacer un pedido. ¿Me lo preguntás de otra forma?"*
- **Si la API no responde** (error de red o 500), avisa que no puede consultar los productos en este momento y sugiere probar más tarde. No responde con datos viejos ni inventados.

## 4. Seguridad de la API key

La capa de IA de KioscoBot usa un modelo de lenguaje externo (Claude, de la API de Anthropic), que necesita una API key. El modelo se elige con `BOT_MODEL` (por defecto `claude-haiku-5-5`). Reglas:

1. **La key vive solo en el backend**, en la variable de entorno `BOT_API_KEY`, dentro de `backend/.env`. Al arrancar, `main.py` lee ese archivo y el código toma la key con `os.getenv`, como hoy se lee `DATABASE_URL`. Sin key, el bot responde solo con reglas.
2. **Nunca en el frontend.** Toda variable `VITE_*` termina dentro del JavaScript que descarga el navegador, así que la key **no** puede ser una variable `VITE_` ni estar escrita en ningún archivo de `frontend/`.
3. **Nunca en git.** El `.gitignore` ya ignora `.env` y `.env.*` y deja subir solo `.env.example`. En `backend/.env.example` la variable va vacía (`BOT_API_KEY=`), nunca con una key real. Cada integrante pone la suya en su propio `backend/.env` local. No hay que dejar un texto de relleno como valor: el backend lo tomaría como una key, el proveedor respondería 401 y el bot usaría las reglas.
4. **El frontend llama a un endpoint propio del backend**, `POST /api/chat`, y el backend es el único que llama al modelo. El navegador nunca habla directo con el proveedor.
5. **Límites de uso y de tamaño:**
   - Mensaje de hasta 500 caracteres; si es más largo (o está vacío), el backend responde 422. *(Implementado.)*
   - Respuestas del modelo con un máximo de 300 tokens y un timeout de 10 segundos; el texto que llega al cliente se recorta a 1000 caracteres. *(Implementado.)*
   - Un máximo de mensajes por minuto por cliente (por ejemplo, 10); si se pasa, responde 429. **(Propuesta, valores a acordar.)**
   - Un tope de gasto mensual configurado en la cuenta del proveedor. **(Propuesta, valores a acordar.)**
6. **No loguear la key** ni los encabezados de los pedidos al proveedor, ni el mensaje del cliente: el log registra solo el tipo de error. Si el modelo falla (error, timeout, respuesta vacía o un error inesperado), el cliente no ve detalles internos: el bot responde con las reglas, con 200.
7. **Si la key se filtra** (por ejemplo, se subió a git o apareció en un log):
   1. Revocarla enseguida en el panel del proveedor.
   2. Generar una nueva y actualizar el `.env` de quien corra el backend.
   3. Si quedó en el historial de git, borrar el commit no alcanza: la key vieja se considera comprometida igual, por eso el paso 1 es obligatorio.
   4. Avisar al equipo y revisar el consumo de la cuenta por si hubo uso indebido.

## 5. Flujo y ejemplos de conversación

**Flujo**

1. El cliente escribe en el chat del frontend.
2. El frontend envía `POST /api/chat` con `{ "message": "..." }`.
3. El backend valida el tamaño. Si el mensaje intenta cambiar las reglas del bot, responde con un texto fijo sin llamar a la IA; si no, consulta los productos en la base (los mismos datos que `GET /api/products`).
4. Si hay `BOT_API_KEY`, el backend le pide la respuesta al modelo con los datos de la tienda y las reglas de §3; si no hay key o la IA falla, arma la respuesta con reglas. La devuelve como `{ "reply": "..." }`, que puede tener saltos de línea (`\n`).
5. El frontend la muestra en el chat.

**Ejemplo 1 – precio y stock**

> **Cliente:** ¿Cuánto sale la Coca y cuántas les quedan?
> **KioscoBot:** La Coca-Cola 500ml sale $ 1.200 y ahora hay 25 unidades. Si la querés, agregala al carrito desde Productos.

**Ejemplo 2 – cómo hacer un pedido**

> **Cliente:** ¿Me podés comprar 2 alfajores?
> **KioscoBot:** No puedo hacer pedidos por vos, pero es rápido: entrá a Productos, tocá "Agregar al carrito" en el Alfajor Jorgito, después andá a Carrito y tocá "Finalizar pedido".

**Ejemplo 3 – fuera de tema**

> **Cliente:** ¿Quién gana el partido del domingo?
> **KioscoBot:** De eso no sé, solo puedo ayudarte con el kiosko: precios, stock, categorías y cómo hacer un pedido. ¿Buscás algo en particular?

## 6. Pendientes / decisiones para el equipo

- [x] **Proveedor y modelo** de lenguaje a usar, y quién crea y administra la cuenta y la key. Decidido: Claude (API de Anthropic), modelo en `BOT_MODEL` (por defecto `claude-haiku-5-5`).
- [x] **Endpoint del bot:** `POST /api/chat` aprobado y documentado en `CONTRATO.md` (cuerpo `{ "message": string }`, respuesta `{ "reply": string }`, 422 por mensaje vacío o de más de 500 caracteres). Falta el 429 (límite por minuto).
- [x] **Estado del carrito:** el frontend no lo manda; el bot responde con texto fijo.
- [x] **Horarios:** texto fijo en el backend (constantes `HORARIOS` y `MEDIOS_DE_PAGO` en `backend/routers/chat.py`). **Los valores actuales son de ejemplo: falta confirmarlos con el equipo.**
- [ ] **Historial:** ¿el bot recuerda los mensajes anteriores de la conversación (enviados por el frontend) o cada mensaje es independiente?
  - Hoy el widget guarda la conversación en memoria solo para mostrarla (se pierde al recargar); el backend responde cada mensaje por separado y no recibe los anteriores. Falta decidir si el bot tiene que recordar la conversación.
- [ ] **Valores de los límites:** largo máximo del mensaje, mensajes por minuto y tope de gasto.
  - Ya definidos en el código: 500 caracteres por mensaje y 300 tokens por respuesta del modelo. Faltan los mensajes por minuto (429) y el tope de gasto.
- [x] **Dependencias nuevas:** el cliente HTTP o SDK del proveedor y el control de límites agregan dependencias al backend; hay que aprobarlas. Decidido: httpx directo (sin SDK) y python-dotenv para leer el `.env`.
- [x] **Tests:** cómo testear el endpoint sin llamar al modelo real (reemplazarlo por uno falso en Pytest, igual que hoy se reemplaza `get_db`). Hecho: `backend/tests/test_chat.py` y `test_bot_ai.py` reemplazan la IA con `monkeypatch` y `httpx.MockTransport`; ningún test sale a la red.
- [x] **Diseño del chat** en el frontend (botón flotante, página aparte, etc.), con la paleta actual. Hecho: botón flotante en todas las páginas, con "Escribiendo…" y error con "Reintentar".