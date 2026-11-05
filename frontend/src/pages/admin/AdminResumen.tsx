import type { CSSProperties } from 'react';
import { useOutletContext } from 'react-router-dom';
import Mascota from '../../components/Mascota';
import {
  MAS_VENDIDOS,
  PEDIDOS_RECIENTES,
  RESUMEN_HOY,
} from '../../data/admin.mock';
import type { PanelAdmin } from '../../hooks/useProductosAdmin';
import { formatPrice } from '../../utils/format';
import { contarStockBajo } from '../../utils/stock';
import './AdminResumen.css';

function textoStockBajo(cantidad: number | null, fallo: boolean): string {
  if (cantidad === null) {
    return fallo ? 'No se pudo revisar el stock' : 'Revisando el stock…';
  }
  if (cantidad === 0) {
    return 'Sin productos con stock bajo';
  }
  return cantidad === 1
    ? '1 producto con stock bajo'
    : `${cantidad} productos con stock bajo`;
}

function AdminResumen() {
  const { productos, error } = useOutletContext<PanelAdmin>();
  const stockBajo = productos ? contarStockBajo(productos) : null;
  const maximo = Math.max(...MAS_VENDIDOS.map((item) => item.cantidad));

  return (
    <>
      <div className="admin-resumen__arriba">
        <h1 className="admin-resumen__titulo">¡Buen día, equipo!</h1>
        <div className="admin-resumen__kerchi">
          <Mascota pose="saludando" size="chico" />
          <p>
            <strong>Hoy se vende bien</strong>
            <span>{textoStockBajo(stockBajo, error !== null)}</span>
          </p>
        </div>
      </div>

      <dl className="admin-resumen__indicadores">
        <div className="admin-resumen__indicador admin-resumen__indicador--ventas">
          <dt>Ventas de hoy</dt>
          <dd>{formatPrice(RESUMEN_HOY.ventas)}</dd>
          <dd className="admin-resumen__nota">
            +{RESUMEN_HOY.variacionVentas} % vs ayer
          </dd>
        </div>
        <div className="admin-resumen__indicador">
          <dt>Pedidos</dt>
          <dd>{RESUMEN_HOY.pedidos}</dd>
          <dd className="admin-resumen__nota">
            {RESUMEN_HOY.pedidosPendientes} pendientes
          </dd>
        </div>
        <div className="admin-resumen__indicador">
          <dt>Ticket promedio</dt>
          <dd>{formatPrice(RESUMEN_HOY.ticketPromedio)}</dd>
        </div>
        <div className="admin-resumen__indicador admin-resumen__indicador--stock">
          <dt>Stock bajo</dt>
          <dd>{stockBajo ?? '—'}</dd>
          {stockBajo !== null && (
            <dd
              className={
                stockBajo > 0
                  ? 'admin-resumen__nota admin-resumen__nota--alerta'
                  : 'admin-resumen__nota'
              }
            >
              {stockBajo > 0 ? 'Reponer pronto' : 'Todo en orden'}
            </dd>
          )}
        </div>
      </dl>

      <div className="admin-resumen__grilla">
        <section className="admin-caja" aria-labelledby="admin-mas-vendidos">
          <h2 id="admin-mas-vendidos" className="admin-caja__titulo">
            Más vendidos de la semana
          </h2>
          <ul className="admin-resumen__barras">
            {MAS_VENDIDOS.map((item) => (
              <li
                key={item.nombre}
                style={
                  { '--proporcion': item.cantidad / maximo } as CSSProperties
                }
              >
                <span>{item.nombre}</span>
                <span className="admin-resumen__pista">
                  <i aria-hidden="true" />
                  <b>{item.cantidad}</b>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-caja" aria-labelledby="admin-pedidos">
          <h2 id="admin-pedidos" className="admin-caja__titulo">
            Pedidos recientes
          </h2>
          <table className="admin-tabla" aria-labelledby="admin-pedidos">
            <thead>
              <tr>
                <th scope="col">N°</th>
                <th scope="col">Total</th>
                <th scope="col">Estado</th>
              </tr>
            </thead>
            <tbody>
              {PEDIDOS_RECIENTES.map((pedido) => (
                <tr key={pedido.numero}>
                  <td>#{pedido.numero}</td>
                  <td>{formatPrice(pedido.total)}</td>
                  <td>{pedido.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

export default AdminResumen;
