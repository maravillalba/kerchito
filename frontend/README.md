# Kiosko El Rápido – Frontend

Frontend de la tienda online **Kiosko El Rápido**. Permite ver el catálogo de productos, filtrarlos por categoría, ver el detalle de cada uno, armar un carrito y finalizar el pedido.

Está hecho con React 19, TypeScript, Vite, React Router y Context API (para el carrito). Los productos y los pedidos se manejan a través de la API del backend (FastAPI), que tiene que estar levantado (ver [`backend/README.md`](../backend/README.md)).

El contrato de datos entre frontend y backend está en [`docs/CONTRATO.md`](../docs/CONTRATO.md).

## Requisitos

- **Node.js** 22 (`22.22.2` o más) o 24 (`24.15.0` o más) (lo que exigen Vitest y jsdom).
- **npm** `11.12.1` (la versión que usa el equipo).

## Instalación

Desde la carpeta `frontend/`:

```bash
npm ci
```

`npm ci` instala exactamente lo que dice `package-lock.json`. No uses `npm install`, salvo que se esté agregando una dependencia a propósito.

## Scripts

| Comando              | Qué hace                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `npm run dev`        | Levanta el servidor de desarrollo de Vite con recarga en caliente.       |
| `npm run build`      | Chequea los tipos (`tsc -b`) y genera el build de producción en `dist/`. |
| `npm run lint`       | Corre ESLint sobre todo el proyecto.                                     |
| `npm test`           | Corre los tests una vez con Vitest (`vitest run`).                       |
| `npm run test:watch` | Corre Vitest en modo watch: vuelve a correr los tests al guardar.        |
| `npm run coverage`   | Corre los tests con cobertura: tabla en la terminal y HTML en `coverage/`. |
| `npm run preview`    | Sirve localmente el build de `dist/` (hay que correr `build` antes).     |

## Estructura de `src/`

```text
src/
├── components/   Componentes reutilizables y su CSS: Header, Footer, Layout,
│                 ProductCard, Price, ProductImage, CartItem, Loading,
│                 ErrorMessage, Mascota, ChatWidget, SearchBar (buscador) y
│                 KerButton (botón naranja/verde, basado en Uiverse.io).
├── context/      CartContext.tsx: estado global del carrito y el hook useCart().
├── hooks/        useCheckout.ts: envía el pedido a la API y devuelve 'success',
│                 'outdated' o 'error'.
├── services/     api.ts: llamadas a la API (productos, pedidos y chat) y manejo de
│                 errores (ApiError).
├── assets/       logo-ker.png, kerchi/ (poses de la mascota), categorias/ y
│                 banners/ (fotos del Inicio).
├── pages/        Una página por ruta, con su CSS: Home, Products, ProductDetail,
│                 Cart y NotFound.
├── types/        index.ts: tipos del contrato (Product, Category, CartItem, pedidos).
├── utils/        format.ts (formatPrice, CATEGORY_LABELS), pricing.ts (precio
│                 efectivo, descuento), sort.ts (orden de /products), featured.ts
│                 (getOfertas), search.ts (buscador) y categoryIcons.ts.
├── App.tsx       Definición de rutas.
├── main.tsx      Punto de entrada: BrowserRouter + CartProvider + App.
├── index.css     Variables CSS (:root) y estilos globales.
├── setupTests.ts Configuración de los tests (jest-dom y limpieza entre tests).
└── smoke.test.tsx Tests básicos de la app (el resto de los *.test.ts(x) está al
                  lado de cada archivo que prueban).
```

Cada componente o página que tiene estilos los lleva en su propio `.css`, al lado del `.tsx` (por ejemplo, `ProductCard.tsx` y `ProductCard.css`).

## Rutas

Todas las rutas se renderizan dentro de `Layout` (Header + contenido + Footer + ChatWidget).

| Ruta                     | Página          | Descripción                                                         |
| ------------------------ | --------------- | ------------------------------------------------------------------- |
| `/`                      | `Home`          | Bienvenida, acceso al catálogo y enlaces a cada categoría.          |
| `/products`              | `Products`      | Catálogo completo de productos.                                     |
| `/products?category=...` | `Products`      | Catálogo filtrado por categoría (por ejemplo, `?category=bebidas`). |
| `/products/:id`          | `ProductDetail` | Detalle de un producto y selector de cantidad.                      |
| `/cart`                  | `Cart`          | Carrito: cantidades, totales y finalizar pedido (lo crea en la API). |
| `*`                      | `NotFound`      | Página 404 para cualquier otra ruta.                                |

Valores válidos de `category`: `bebidas`, `golosinas_snacks`, `lacteos`, `almacen`, `limpieza`, `cigarrillos`.

## Variables de entorno

| Variable       | Ejemplo                 | Uso                                                        |
| -------------- | ----------------------- | ---------------------------------------------------------- |
| `VITE_API_URL` | `http://localhost:8000` | URL base del backend. Por defecto: `http://localhost:8000`. |

La lee `src/services/api.ts`. Si no la definís, usa `http://localhost:8000`, así que solo necesitás un `.env` si el backend corre en otra dirección.

Para cambiarla, copiá `.env.example` como `.env` dentro de `frontend/`. El archivo `.env` está en el `.gitignore` y no se sube al repositorio.

## Tests

Se usa **Vitest** con **jsdom** y **Testing Library**. La configuración está en `vitest.config.ts` y `src/setupTests.ts`.

```bash
npm test             # una sola corrida
npm run test:watch   # modo watch
npm run coverage     # con cobertura
```

A tener en cuenta al escribir tests:

- **Envolver en `MemoryRouter` y `CartProvider`.** `App` usa rutas y el Header usa `useCart()`, así que sin el router o sin el provider el render falla. `MemoryRouter` permite elegir la ruta inicial con `initialEntries`:

  ```tsx
  render(
    <MemoryRouter initialEntries={['/']}>
      <CartProvider>
        <App />
      </CartProvider>
    </MemoryRouter>,
  );
  ```

- **Buscar "Kiosko El Rápido" por rol y nombre.** El texto aparece en el Header (como link) y en el Footer, y en la Home también como título. Por eso `getByText('Kiosko El Rápido')` encuentra varios elementos y falla. Usá `getByRole('link', { name: 'Kiosko El Rápido' })`, que solo encuentra el link del Header. No agregues otro link con ese mismo nombre, porque rompe el smoke test.

## Convenciones del equipo

- **Formato:** Prettier (`.prettierrc`: comillas simples, punto y coma, `trailingComma: all`, ancho 80). Formateá **solo los archivos que tocaste**, desde `frontend/`:

  ```bash
  npx prettier --write src/pages/Cart.tsx src/pages/Cart.css
  ```

  **Nunca** corras `npm run format`: reformatea todo `src/` y llena el PR de cambios que no son tuyos.

- **Antes de subir cambios:** `npm run lint`, `npm run build` y `npm test` tienen que pasar.
- **Tipos:** `src/types/index.ts` sigue a `docs/CONTRATO.md`. Si hay que cambiar un campo, primero se cambia el contrato (ver la sección "Regla de cambios" de ese documento).
- **Precios y categorías:** usá `formatPrice()` y `CATEGORY_LABELS` de `src/utils/format.ts`, no los escribas a mano.
- **Estilos:** cada componente o página en su propio `.css`, usando las variables de `src/index.css`.
- **Dependencias:** no agregar dependencias nuevas sin acordarlo con el equipo.