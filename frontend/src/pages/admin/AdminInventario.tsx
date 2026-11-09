import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import Campo from '../../components/Campo';
import ErrorMessage from '../../components/ErrorMessage';
import KerButton from '../../components/KerButton';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import ProductImage from '../../components/ProductImage';
import { mensajeDeError, useDatos } from '../../hooks/useDatos';
import {
  ApiError,
  deleteProduct,
  getAdminProducts,
  updateProductStock,
} from '../../services/api';
import type { Category, ProductAdmin } from '../../types';
import { CATEGORY_LABELS, formatPrice } from '../../utils/format';
import {
  effectivePrice,
  formatAmount,
  fullName,
  hasOffer,
} from '../../utils/pricing';
import { matchesSearch } from '../../utils/search';
import { estadoStock, tieneStockBajo } from '../../utils/stock';
import { Buscador, Chip, Contador, SinResultados } from './ControlesPanel';
import ProductoForm from './ProductoForm';

const CATEGORIAS = Object.keys(CATEGORY_LABELS) as Category[];

function EtiquetaStock({ producto }: { producto: ProductAdmin }) {
  const estado = estadoStock(producto);
  if (estado === 'sin-stock') {
    return (
      <span className="panel-etiqueta panel-etiqueta--roja">Sin stock</span>
    );
  }
  if (estado === 'bajo') {
    return (
      <span className="panel-etiqueta panel-etiqueta--amarilla">
        {producto.stock} · bajo
      </span>
    );
  }
  return <span className="panel-etiqueta">{producto.stock}</span>;
}

// Ganancia por unidad con el precio que se cobra hoy, antes de descuentos.
export function Ganancia({ producto }: { producto: ProductAdmin }) {
  const ganancia = effectivePrice(producto) - producto.cost;
  return (
    <span
      className={`inventario__ganancia${
        ganancia < 0 ? ' inventario__ganancia--negativa' : ''
      }`}
    >
      {formatPrice(ganancia)}
    </span>
  );
}

interface AjustarStockProps {
  productos: ProductAdmin[];
  onCerrar: () => void;
  onGuardado: (producto: ProductAdmin) => void;
}

function AjustarStock({ productos, onCerrar, onGuardado }: AjustarStockProps) {
  const [productoId, setProductoId] = useState(String(productos[0]?.id ?? ''));
  const [stock, setStock] = useState(String(productos[0]?.stock ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const elegir = (id: string) => {
    setProductoId(id);
    setStock(String(productos.find((p) => String(p.id) === id)?.stock ?? ''));
    setError(null);
  };

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    const cantidad = stock.trim() === '' ? NaN : Number(stock);
    if (!Number.isSafeInteger(cantidad) || cantidad < 0) {
      setError('El stock debe ser un número entero, 0 o más.');
      return;
    }
    setEnviando(true);
    try {
      onGuardado(await updateProductStock(Number(productoId), cantidad));
      onCerrar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar. Intentá de nuevo.'));
      setEnviando(false);
    }
  };

  return (
    <Modal titulo="Ajustar stock" onCerrar={onCerrar}>
      <form onSubmit={enviar} noValidate>
        <Campo
          id="ajuste-producto"
          name="producto"
          label="Producto"
          value={productoId}
          onCambio={elegir}
          opciones={productos.map((p) => ({
            value: String(p.id),
            label: fullName(p),
          }))}
        />
        <Campo
          id="ajuste-stock"
          name="stock"
          label="Stock real"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={stock}
          onCambio={setStock}
          error={error ?? undefined}
        />
        <div className="panel-modal-acciones">
          <button
            type="button"
            className="panel-boton"
            onClick={onCerrar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <KerButton
            type="submit"
            variant="verde"
            size="chico"
            disabled={enviando}
          >
            {enviando ? 'Guardando…' : 'Guardar stock'}
          </KerButton>
        </div>
      </form>
    </Modal>
  );
}

type Dialogo =
  | { tipo: 'nuevo' }
  | { tipo: 'stock' }
  | { tipo: 'editar'; producto: ProductAdmin }
  | { tipo: 'borrar'; producto: ProductAdmin };

function AdminInventario() {
  const { datos, error, cargando, reintentar, setDatos } =
    useDatos(getAdminProducts);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState<Category | null>(null);
  const [soloBajo, setSoloBajo] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null);
  const [borrando, setBorrando] = useState(false);

  const productos = useMemo(() => datos ?? [], [datos]);
  // Con 54 productos alcanza con filtrar en el navegador, en cada tecla.
  const visibles = useMemo(
    () =>
      productos.filter(
        (p) =>
          matchesSearch(p, busqueda) &&
          (categoria === null || p.category === categoria) &&
          (!soloBajo || tieneStockBajo(p)),
      ),
    [productos, busqueda, categoria, soloBajo],
  );

  if (cargando) {
    return <Loading />;
  }
  if (error) {
    return <ErrorMessage message={error} onRetry={reintentar} />;
  }

  const guardar = (producto: ProductAdmin) =>
    setDatos((lista) =>
      lista.some((p) => p.id === producto.id)
        ? lista.map((p) => (p.id === producto.id ? producto : p))
        : [...lista, producto],
    );

  const cerrar = () => {
    setDialogo(null);
    setErrorBorrar(null);
  };

  const confirmarBorrado = async (producto: ProductAdmin) => {
    setBorrando(true);
    setErrorBorrar(null);
    try {
      await deleteProduct(producto.id);
      setDatos((lista) => lista.filter((p) => p.id !== producto.id));
      cerrar();
    } catch (err) {
      // El 409 explica que el producto ya está en un pedido.
      setErrorBorrar(
        err instanceof ApiError && err.status === 409
          ? err.message
          : mensajeDeError(err, 'No se pudo borrar. Intentá de nuevo.'),
      );
    } finally {
      setBorrando(false);
    }
  };

  const limpiar = () => {
    setBusqueda('');
    setCategoria(null);
    setSoloBajo(false);
  };

  const unidades = productos.reduce((suma, p) => suma + p.stock, 0);

  return (
    <>
      <div className="panel-encabezado">
        <h1>Productos e inventario</h1>
        <span className="panel-pildora">
          {productos.length} productos · {formatAmount(unidades)} unidades
        </span>
        <div className="panel-acciones">
          <button
            type="button"
            className="panel-boton"
            disabled={productos.length === 0}
            onClick={() => setDialogo({ tipo: 'stock' })}
          >
            Ajustar stock
          </button>
          <KerButton
            variant="verde"
            size="chico"
            onClick={() => setDialogo({ tipo: 'nuevo' })}
          >
            + Nuevo producto
          </KerButton>
        </div>
      </div>

      <div className="panel-filtros">
        <Buscador
          valor={busqueda}
          onCambio={setBusqueda}
          etiqueta="Buscar en el inventario"
          placeholder="Marca, nombre o categoría"
        />
        <Chip activo={categoria === null} onClick={() => setCategoria(null)}>
          Todos
        </Chip>
        {CATEGORIAS.map((valor) => (
          <Chip
            key={valor}
            activo={categoria === valor}
            onClick={() => setCategoria(valor)}
          >
            {CATEGORY_LABELS[valor]}
          </Chip>
        ))}
        <Chip
          activo={soloBajo}
          onClick={() => setSoloBajo((actual) => !actual)}
        >
          <span aria-hidden="true">⚠️</span> Stock bajo (
          {productos.filter(tieneStockBajo).length})
        </Chip>
      </div>

      <Contador
        visibles={visibles.length}
        total={productos.length}
        nombre="producto"
      />

      {visibles.length === 0 ? (
        <SinResultados onLimpiar={limpiar} />
      ) : (
        <div
          className="panel-tabla-caja"
          role="region"
          aria-label="Tabla de productos"
          tabIndex={0}
        >
          <table className="panel-tabla">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col">Categoría</th>
                <th scope="col" className="panel-numero">
                  Costo
                </th>
                <th scope="col" className="panel-numero">
                  Venta
                </th>
                <th scope="col" className="panel-numero">
                  Ganancia u.
                </th>
                <th scope="col">Stock</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((producto) => (
                <tr key={producto.id}>
                  <td>
                    <div className="inventario__producto">
                      <div className="inventario__foto">
                        <ProductImage product={producto} size="thumb" />
                      </div>
                      <div>
                        <p className="inventario__marca">{producto.brand}</p>
                        <p className="inventario__nombre">
                          {producto.name}{' '}
                          {hasOffer(producto) && (
                            <span className="panel-etiqueta panel-etiqueta--naranja">
                              Oferta
                            </span>
                          )}
                        </p>
                        <p className="inventario__unidad">{producto.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="panel-etiqueta">
                      {CATEGORY_LABELS[producto.category]}
                    </span>
                  </td>
                  <td className="panel-numero">{formatPrice(producto.cost)}</td>
                  <td className="panel-numero">
                    <span className="inventario__venta">
                      {formatPrice(effectivePrice(producto))}
                    </span>
                    {hasOffer(producto) && (
                      <del className="inventario__normal">
                        {formatPrice(producto.price)}
                      </del>
                    )}
                  </td>
                  <td className="panel-numero">
                    <Ganancia producto={producto} />
                  </td>
                  <td>
                    <EtiquetaStock producto={producto} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="panel-icono-boton"
                      aria-label={`Editar ${fullName(producto)}`}
                      onClick={() => setDialogo({ tipo: 'editar', producto })}
                    >
                      <span aria-hidden="true">✏️</span>
                    </button>
                    <button
                      type="button"
                      className="panel-icono-boton"
                      aria-label={`Borrar ${fullName(producto)}`}
                      onClick={() => setDialogo({ tipo: 'borrar', producto })}
                    >
                      <span aria-hidden="true">🗑️</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialogo?.tipo === 'nuevo' && (
        <ProductoForm producto={null} onCerrar={cerrar} onGuardado={guardar} />
      )}
      {dialogo?.tipo === 'editar' && (
        <ProductoForm
          producto={dialogo.producto}
          onCerrar={cerrar}
          onGuardado={guardar}
        />
      )}
      {dialogo?.tipo === 'stock' && (
        <AjustarStock
          productos={productos}
          onCerrar={cerrar}
          onGuardado={guardar}
        />
      )}
      {dialogo?.tipo === 'borrar' && (
        <Modal titulo="Borrar producto" onCerrar={cerrar}>
          <p>¿Seguro que querés borrar {fullName(dialogo.producto)}?</p>
          {errorBorrar && (
            <p className="panel-error" role="alert">
              {errorBorrar}
            </p>
          )}
          <div className="panel-modal-acciones">
            <button
              type="button"
              className="panel-boton"
              onClick={cerrar}
              disabled={borrando}
            >
              Cancelar
            </button>
            <KerButton
              variant="verde"
              size="chico"
              disabled={borrando}
              onClick={() => void confirmarBorrado(dialogo.producto)}
            >
              {borrando ? 'Borrando…' : 'Sí, borrar'}
            </KerButton>
          </div>
        </Modal>
      )}
    </>
  );
}

export default AdminInventario;
