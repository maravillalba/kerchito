import ErrorMessage from '../../components/ErrorMessage';
import Loading from '../../components/Loading';
import { useDatos } from '../../hooks/useDatos';
import { getAdminSummary } from '../../services/api';
import { formatPrice, initials } from '../../utils/format';
import { formatAmount } from '../../utils/pricing';

function AdminResumen() {
  const { datos, error, cargando, reintentar } = useDatos(getAdminSummary);

  if (cargando) {
    return <Loading />;
  }
  if (error || !datos) {
    return (
      <ErrorMessage
        message={error ?? 'No hay datos para mostrar.'}
        onRetry={reintentar}
      />
    );
  }

  const tarjetas = [
    {
      icono: '👛',
      fondo: '#fff3bf',
      titulo: 'Total cobrado',
      valor: formatPrice(datos.total_revenue),
      nota: 'Ventas activas',
    },
    {
      icono: '🐷',
      fondo: 'var(--color-marca-suave)',
      titulo: 'Ganancia neta',
      valor: formatPrice(datos.net_profit),
      nota: 'Lo cobrado menos el costo de lo vendido',
    },
    {
      icono: '📦',
      fondo: '#efe6fb',
      titulo: 'Productos en stock',
      valor: `${formatAmount(datos.stock_units)} uds.`,
      nota: 'Suma total de unidades',
    },
    {
      icono: '⭐',
      fondo: '#ffe3bf',
      titulo: 'Puntos en circulación',
      valor: formatAmount(datos.points_in_circulation),
      nota: 'Sin canjear por los clientes',
    },
  ];
  const masVendido = datos.best_sellers[0]?.units_sold ?? 0;

  return (
    <>
      <div className="panel-encabezado">
        <h1>Resumen</h1>
        <span className="panel-pildora">Desde el inicio</span>
      </div>

      <div className="panel-tarjetas">
        {tarjetas.map(({ icono, fondo, titulo, valor, nota }) => (
          <section key={titulo} className="panel-tarjeta">
            <span
              className="panel-tarjeta__icono"
              style={{ background: fondo }}
              aria-hidden="true"
            >
              {icono}
            </span>
            <h2 className="panel-tarjeta__titulo">{titulo}</h2>
            <p className="panel-tarjeta__valor">{valor}</p>
            <p className="panel-tarjeta__nota">{nota}</p>
          </section>
        ))}
      </div>

      <div className="panel-dos-columnas">
        <section className="panel-caja">
          <h2>Productos más vendidos</h2>
          {datos.best_sellers.length === 0 ? (
            <p className="panel-suave">Todavía no hay ventas.</p>
          ) : (
            <ol className="panel-barras">
              {datos.best_sellers.map((item) => (
                <li key={item.product_id} className="panel-barra">
                  <span>{item.product_name}</span>
                  <span className="panel-barra__valor">
                    {item.units_sold}
                    <span className="sr-only"> unidades vendidas</span>
                  </span>
                  <div className="panel-barra__pista" aria-hidden="true">
                    <div
                      className="panel-barra__relleno"
                      style={{
                        width: `${(item.units_sold / masVendido) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel-caja">
          <h2>Clientes con más puntos</h2>
          {datos.top_customers.length === 0 ? (
            <p className="panel-suave">Todavía no hay clientes con puntos.</p>
          ) : (
            <ol className="panel-ranking">
              {datos.top_customers.map((cliente, indice) => (
                <li key={cliente.id}>
                  <span className="panel-ranking__puesto">{indice + 1}</span>
                  <span className="panel-iniciales" aria-hidden="true">
                    {initials(cliente)}
                  </span>
                  <div className="panel-ranking__datos">
                    <p className="panel-ranking__nombre">
                      {cliente.first_name} {cliente.last_name}
                    </p>
                    <p className="panel-suave">
                      {cliente.orders_count}{' '}
                      {cliente.orders_count === 1 ? 'compra' : 'compras'}
                    </p>
                  </div>
                  <span className="panel-etiqueta panel-etiqueta--amarilla">
                    {formatAmount(cliente.points)} pts
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

export default AdminResumen;
