import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ErrorMessage from '../../components/ErrorMessage';
import KerButton from '../../components/KerButton';
import Loading from '../../components/Loading';
import Modal from '../../components/Modal';
import { mensajeDeError, useDatos } from '../../hooks/useDatos';
import { ApiError, cancelOrder, getAdminOrders } from '../../services/api';
import type { AdminOrder, PaymentMethod } from '../../types';
import { formatPrice, PAYMENT_LABELS } from '../../utils/format';
import { matchesWords } from '../../utils/search';
import { Buscador, Chip, Contador, SinResultados } from './ControlesPanel';

const COLOR_MEDIO: Record<PaymentMethod, string> = {
  efectivo: '',
  transferencia: 'panel-etiqueta--azul',
  tarjeta: 'panel-etiqueta--violeta',
  mercado_pago: 'panel-etiqueta--celeste',
};

const FILTROS = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'activas', texto: 'Activas' },
  { valor: 'anuladas', texto: 'Anuladas' },
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'semana', texto: 'Esta semana' },
] as const;

type Filtro = (typeof FILTROS)[number]['valor'];

function inicioDelDia(fecha: Date) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

// La semana arranca el lunes.
function inicioDeLaSemana(fecha: Date) {
  const inicio = inicioDelDia(fecha);
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));
  return inicio;
}

function pasaElFiltro(pedido: AdminOrder, filtro: Filtro, ahora: Date) {
  const fecha = new Date(pedido.created_at);
  switch (filtro) {
    case 'activas':
      return pedido.status === 'active';
    case 'anuladas':
      return pedido.status === 'cancelled';
    case 'hoy':
      return fecha >= inicioDelDia(ahora);
    case 'semana':
      return fecha >= inicioDeLaSemana(ahora);
    default:
      return true;
  }
}

function resumirItems(pedido: AdminOrder) {
  const primeros = pedido.items
    .slice(0, 2)
    .map((item) => `${item.product_name} ×${item.quantity}`)
    .join(', ');
  const resto = pedido.items.length - 2;
  return resto > 0 ? `${primeros} +${resto} más` : primeros;
}

function AdminVentas() {
  const { datos, error, cargando, reintentar, setDatos } =
    useDatos(getAdminOrders);
  const [parametros] = useSearchParams();
  // "Ver todas sus compras" llega acá con ?q=<correo del cliente>.
  const [busqueda, setBusqueda] = useState(parametros.get('q') ?? '');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [abiertos, setAbiertos] = useState<number[]>([]);
  const [aAnular, setAAnular] = useState<AdminOrder | null>(null);
  const [errorAnular, setErrorAnular] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);

  const pedidos = useMemo(() => datos ?? [], [datos]);
  const visibles = useMemo(() => {
    const ahora = new Date();
    return pedidos.filter(
      (pedido) =>
        pasaElFiltro(pedido, filtro, ahora) &&
        matchesWords(
          `${pedido.customer.first_name} ${pedido.customer.last_name} ${pedido.customer.email} ${pedido.items
            .map((item) => item.product_name)
            .join(' ')}`,
          busqueda,
        ),
    );
  }, [pedidos, filtro, busqueda]);

  if (cargando) {
    return <Loading />;
  }
  if (error) {
    return <ErrorMessage message={error} onRetry={reintentar} />;
  }

  const alternar = (id: number) =>
    setAbiertos((actuales) =>
      actuales.includes(id)
        ? actuales.filter((abierto) => abierto !== id)
        : [...actuales, id],
    );

  const cerrarAnular = () => {
    setAAnular(null);
    setErrorAnular(null);
  };

  const anular = async (pedido: AdminOrder) => {
    setAnulando(true);
    setErrorAnular(null);
    try {
      const anulado = await cancelOrder(pedido.id);
      setDatos((lista) =>
        lista.map((p) => (p.id === anulado.id ? anulado : p)),
      );
      cerrarAnular();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Otra sesión ya lo anuló: la lista estaba vieja.
        setDatos((lista) =>
          lista.map((p) =>
            p.id === pedido.id ? { ...p, status: 'cancelled' } : p,
          ),
        );
        setErrorAnular(err.message);
      } else {
        setErrorAnular(
          mensajeDeError(err, 'No se pudo anular. Intentá de nuevo.'),
        );
      }
    } finally {
      setAnulando(false);
    }
  };

  const limpiar = () => {
    setBusqueda('');
    setFiltro('todas');
  };

  return (
    <>
      <div className="panel-encabezado">
        <h1>Historial de ventas</h1>
        <span className="panel-pildora">
          {pedidos.length} {pedidos.length === 1 ? 'venta' : 'ventas'}
        </span>
      </div>

      <div className="panel-filtros">
        <Buscador
          valor={busqueda}
          onCambio={setBusqueda}
          etiqueta="Buscar en las ventas"
          placeholder="Buscar por cliente o producto"
        />
        {FILTROS.map(({ valor, texto }) => (
          <Chip
            key={valor}
            activo={filtro === valor}
            onClick={() => setFiltro(valor)}
          >
            {texto}
          </Chip>
        ))}
      </div>

      <Contador
        visibles={visibles.length}
        total={pedidos.length}
        nombre="venta"
      />

      {visibles.length === 0 ? (
        <SinResultados onLimpiar={limpiar} />
      ) : (
        <div
          className="panel-tabla-caja"
          role="region"
          aria-label="Tabla de ventas"
          tabIndex={0}
        >
          <table className="panel-tabla">
            <thead>
              <tr>
                <th scope="col">Fecha y hora</th>
                <th scope="col">Cliente</th>
                <th scope="col">Medio</th>
                <th scope="col">Ítems</th>
                <th scope="col" className="panel-numero">
                  Total
                </th>
                <th scope="col">Puntos</th>
                <th scope="col">Estado</th>
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((pedido) => {
                const anulada = pedido.status === 'cancelled';
                const abierto = abiertos.includes(pedido.id);
                const fecha = new Date(pedido.created_at);
                const total = formatPrice(pedido.total);
                return (
                  <Fragment key={pedido.id}>
                    <tr
                      className={anulada ? 'ventas__fila--anulada' : undefined}
                    >
                      <td>
                        <span className="ventas__fecha">
                          {fecha.toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="panel-suave">
                          {fecha.toLocaleTimeString('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>
                      <td>
                        <strong>
                          {pedido.customer.first_name}{' '}
                          {pedido.customer.last_name}
                        </strong>
                      </td>
                      <td>
                        <span
                          className={`panel-etiqueta ${COLOR_MEDIO[pedido.payment_method]}`}
                        >
                          {PAYMENT_LABELS[pedido.payment_method]}
                        </span>
                      </td>
                      <td className="ventas__items">{resumirItems(pedido)}</td>
                      <td className="panel-numero ventas__total">
                        {anulada ? <del>{total}</del> : total}
                      </td>
                      <td>
                        {anulada || pedido.points_earned === 0 ? (
                          '—'
                        ) : (
                          <span className="panel-etiqueta panel-etiqueta--amarilla">
                            +{pedido.points_earned} pts
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`panel-etiqueta${anulada ? ' panel-etiqueta--roja' : ''}`}
                        >
                          {anulada ? 'Anulada' : 'Activa'}
                        </span>
                      </td>
                      <td className="ventas__acciones">
                        <button
                          type="button"
                          className="panel-icono-boton"
                          aria-expanded={abierto}
                          aria-controls={`venta-${pedido.id}`}
                          aria-label={`Detalle de la venta ${pedido.id}`}
                          onClick={() => alternar(pedido.id)}
                        >
                          <span aria-hidden="true">{abierto ? '▴' : '▾'}</span>
                        </button>
                        {!anulada && (
                          <button
                            type="button"
                            className="panel-icono-boton ventas__icono-anular"
                            aria-label={`Anular la venta ${pedido.id}`}
                            onClick={() => setAAnular(pedido)}
                          >
                            <span aria-hidden="true">↩</span>
                          </button>
                        )}
                      </td>
                    </tr>
                    {abierto && (
                      <tr id={`venta-${pedido.id}`} className="ventas__detalle">
                        <td colSpan={8}>
                          <ul>
                            {pedido.items.map((item, indice) => (
                              <li key={`${item.product_id}-${indice}`}>
                                {item.product_name} ×{item.quantity} a{' '}
                                {formatPrice(item.unit_price)}
                              </li>
                            ))}
                          </ul>
                          <p>
                            Pedido N° {pedido.id} · Subtotal{' '}
                            {formatPrice(pedido.subtotal)}
                            {pedido.first_purchase_discount > 0 &&
                              ` · 15% de primera compra: − ${formatPrice(pedido.first_purchase_discount)}`}
                            {pedido.points_discount > 0 &&
                              ` · Canje de ${pedido.points_used} puntos: − ${formatPrice(pedido.points_discount)}`}
                            {` · Total ${total} · Puntos ganados: ${pedido.points_earned}`}
                          </p>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="panel-nota">
        Anular una venta devuelve el stock, descuenta los puntos que sumó y
        devuelve los que se usaron.
      </p>

      {aAnular && (
        <Modal
          titulo={`Anular la venta N° ${aAnular.id}`}
          onCerrar={cerrarAnular}
        >
          <p>
            Vas a anular la venta de {aAnular.customer.first_name}{' '}
            {aAnular.customer.last_name} por {formatPrice(aAnular.total)}. Se
            devuelve el stock
            {aAnular.points_earned > 0 &&
              `, se descuentan los ${aAnular.points_earned} puntos que sumó`}
            {aAnular.points_used > 0 &&
              ` y se devuelven los ${aAnular.points_used} puntos que usó`}
            . Si ya gastó esos puntos, su saldo puede quedar en negativo. No se
            puede deshacer.
          </p>
          {errorAnular && (
            <p className="panel-error" role="alert">
              {errorAnular}
            </p>
          )}
          <div className="panel-modal-acciones">
            <button
              type="button"
              className="panel-boton"
              onClick={cerrarAnular}
              disabled={anulando}
            >
              Volver
            </button>
            <KerButton
              variant="verde"
              size="chico"
              disabled={anulando}
              onClick={() => void anular(aAnular)}
            >
              {anulando ? 'Anulando…' : 'Sí, anular'}
            </KerButton>
          </div>
        </Modal>
      )}
    </>
  );
}

export default AdminVentas;
