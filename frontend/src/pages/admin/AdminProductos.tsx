import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import ErrorMessage from '../../components/ErrorMessage';
import KerButton from '../../components/KerButton';
import Loading from '../../components/Loading';
import '../../components/Price.css';
import ProductImage from '../../components/ProductImage';
import type { PanelAdmin } from '../../hooks/useProductosAdmin';
import type { Product } from '../../types';
import { CATEGORY_LABELS, formatPrice } from '../../utils/format';
import { effectivePrice, fullName, hasOffer } from '../../utils/pricing';
import { tieneStockBajo } from '../../utils/stock';
import ProductoModal from './ProductoModal';
import './AdminProductos.css';

function PrecioFila({ producto }: { producto: Product }) {
  if (!hasOffer(producto)) {
    return <>{formatPrice(producto.price)}</>;
  }
  return (
    <>
      <del>
        <span className="sr-only">Precio normal: </span>
        {formatPrice(producto.price)}
      </del>{' '}
      <span aria-hidden="true">→</span>{' '}
      <span className="sr-only">Precio de oferta: </span>
      {formatPrice(effectivePrice(producto))}{' '}
      <span className="offer-badge">OFERTA</span>
    </>
  );
}

// null: modal cerrado. producto null: alta de un producto nuevo.
type Edicion = { producto: Product | null } | null;

function AdminProductos() {
  const { productos, error, recargar, guardarProducto } =
    useOutletContext<PanelAdmin>();
  const [edicion, setEdicion] = useState<Edicion>(null);

  const renderTabla = () => {
    if (error !== null) {
      return <ErrorMessage message={error} onRetry={recargar} />;
    }
    if (productos === null) {
      return <Loading message="Cargando productos…" />;
    }
    return (
      // Con foco para poder scrollear la tabla con el teclado en el celular.
      <div
        className="admin-productos__scroll"
        role="region"
        aria-label="Tabla de productos"
        tabIndex={0}
      >
        <table className="admin-tabla admin-productos__tabla">
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Categoría</th>
              <th scope="col">Precio</th>
              <th scope="col">Stock</th>
              <th scope="col">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => (
              <tr key={producto.id}>
                <td>
                  <span className="admin-productos__nombre">
                    <ProductImage product={producto} size="thumb" />
                    {fullName(producto)}
                  </span>
                </td>
                <td>{CATEGORY_LABELS[producto.category]}</td>
                <td>
                  <PrecioFila producto={producto} />
                </td>
                <td>
                  {tieneStockBajo(producto) ? (
                    <span className="admin-productos__stock-bajo">
                      {producto.stock} <span aria-hidden="true">⚠</span>
                      <span className="sr-only">(stock bajo)</span>
                    </span>
                  ) : (
                    producto.stock
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="admin-productos__editar"
                    aria-label={`Editar ${fullName(producto)}`}
                    onClick={() => setEdicion({ producto })}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section className="admin-caja">
      <div className="admin-productos__arriba">
        <h1 className="admin-productos__titulo">Productos</h1>
        <KerButton
          disabled={productos === null}
          onClick={() => setEdicion({ producto: null })}
        >
          + Nuevo producto
        </KerButton>
      </div>
      <p className="admin-productos__aviso">
        Modo demostración: los cambios no se guardan
      </p>

      {renderTabla()}

      {edicion && (
        <ProductoModal
          producto={edicion.producto}
          onGuardar={(datos) => {
            guardarProducto(datos, edicion.producto?.id);
            setEdicion(null);
          }}
          onCerrar={() => setEdicion(null)}
        />
      )}
    </section>
  );
}

export default AdminProductos;
