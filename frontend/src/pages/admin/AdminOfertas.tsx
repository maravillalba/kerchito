import { useMemo, useState } from 'react';
import ErrorMessage from '../../components/ErrorMessage';
import Loading from '../../components/Loading';
import Mascota from '../../components/Mascota';
import ProductImage from '../../components/ProductImage';
import { mensajeDeError, useDatos } from '../../hooks/useDatos';
import { getAdminProducts, updateProduct } from '../../services/api';
import type { ProductAdmin } from '../../types';
import { formatPrice } from '../../utils/format';
import {
  discountPercent,
  effectivePrice,
  fullName,
  hasOffer,
} from '../../utils/pricing';
import { Ganancia } from './AdminInventario';
import ProductoForm from './ProductoForm';

// No tiene mockup: lista lo que está en oferta. Las ofertas se cargan desde el
// formulario del producto, igual que en Inventario.
function AdminOfertas() {
  const { datos, error, cargando, reintentar, setDatos } =
    useDatos(getAdminProducts);
  const [editando, setEditando] = useState<ProductAdmin | null>(null);
  const [errorQuitar, setErrorQuitar] = useState<string | null>(null);

  const ofertas = useMemo(() => (datos ?? []).filter(hasOffer), [datos]);

  if (cargando) {
    return <Loading />;
  }
  if (error) {
    return <ErrorMessage message={error} onRetry={reintentar} />;
  }

  const guardar = (producto: ProductAdmin) =>
    setDatos((lista) =>
      lista.map((p) => (p.id === producto.id ? producto : p)),
    );

  const quitarOferta = async (producto: ProductAdmin) => {
    setErrorQuitar(null);
    try {
      guardar(
        await updateProduct(producto.id, {
          brand: producto.brand,
          name: producto.name,
          unit: producto.unit,
          category: producto.category,
          price: producto.price,
          offer_price: null,
          stock: producto.stock,
          cost: producto.cost,
          description: producto.description ?? null,
        }),
      );
    } catch (err) {
      setErrorQuitar(
        mensajeDeError(err, 'No se pudo quitar la oferta. Intentá de nuevo.'),
      );
    }
  };

  return (
    <>
      <div className="panel-encabezado">
        <h1>Ofertas</h1>
        <span className="panel-pildora">{ofertas.length} en oferta</span>
      </div>

      {errorQuitar && (
        <p className="panel-error" role="alert">
          {errorQuitar}
        </p>
      )}

      {ofertas.length === 0 ? (
        <div className="panel-vacio panel-caja">
          <Mascota pose="pensando" />
          <p>No hay productos en oferta.</p>
          <p className="panel-suave">
            Para crear una, editá el producto en Inventario y cargá el precio de
            oferta.
          </p>
        </div>
      ) : (
        <div
          className="panel-tabla-caja"
          role="region"
          aria-label="Tabla de ofertas"
          tabIndex={0}
        >
          <table className="panel-tabla">
            <thead>
              <tr>
                <th scope="col">Producto</th>
                <th scope="col" className="panel-numero">
                  Normal
                </th>
                <th scope="col" className="panel-numero">
                  Oferta
                </th>
                <th scope="col" className="panel-numero">
                  Descuento
                </th>
                <th scope="col" className="panel-numero">
                  Ganancia u.
                </th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ofertas.map((producto) => (
                <tr key={producto.id}>
                  <td>
                    <div className="inventario__producto">
                      <div className="inventario__foto">
                        <ProductImage product={producto} size="thumb" />
                      </div>
                      <div>
                        <p className="inventario__marca">{producto.brand}</p>
                        <p className="inventario__nombre">{producto.name}</p>
                        <p className="inventario__unidad">{producto.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="panel-numero">
                    <del>{formatPrice(producto.price)}</del>
                  </td>
                  <td className="panel-numero">
                    <strong>{formatPrice(effectivePrice(producto))}</strong>
                  </td>
                  <td className="panel-numero">{discountPercent(producto)}%</td>
                  <td className="panel-numero">
                    <Ganancia producto={producto} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="panel-icono-boton"
                      aria-label={`Editar ${fullName(producto)}`}
                      onClick={() => setEditando(producto)}
                    >
                      <span aria-hidden="true">✏️</span>
                    </button>
                    <button
                      type="button"
                      className="panel-boton"
                      aria-label={`Quitar la oferta de ${fullName(producto)}`}
                      onClick={() => void quitarOferta(producto)}
                    >
                      Quitar oferta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <ProductoForm
          producto={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={guardar}
        />
      )}
    </>
  );
}

export default AdminOfertas;
