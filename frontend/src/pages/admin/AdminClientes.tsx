import { useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Campo from '../../components/Campo';
import ErrorMessage from '../../components/ErrorMessage';
import KerButton from '../../components/KerButton';
import Loading from '../../components/Loading';
import Mascota from '../../components/Mascota';
import Modal from '../../components/Modal';
import { mensajeDeError, useDatos } from '../../hooks/useDatos';
import {
  adjustCustomerPoints,
  getAdminOrders,
  getCustomer,
  getCustomers,
} from '../../services/api';
import type { Customer, CustomerDetail } from '../../types';
import { formatPrice, initials } from '../../utils/format';
import { formatAmount } from '../../utils/pricing';
import { matchesWords } from '../../utils/search';
import { Buscador, Contador, SinResultados } from './ControlesPanel';

const COLOR_NIVEL: Record<string, string> = {
  Oro: 'panel-etiqueta--amarilla',
  Plata: 'panel-etiqueta--gris',
  Bronce: 'panel-etiqueta--naranja',
};

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function fechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// La lista y los puntos canjeados este mes, que salen de los pedidos.
async function cargarClientes() {
  const [clientes, pedidos] = await Promise.all([
    getCustomers(),
    getAdminOrders(),
  ]);
  const ahora = new Date();
  const canjeadosDelMes = pedidos
    .filter((pedido) => {
      const fecha = new Date(pedido.created_at);
      return (
        pedido.status === 'active' &&
        fecha.getMonth() === ahora.getMonth() &&
        fecha.getFullYear() === ahora.getFullYear()
      );
    })
    .reduce((suma, pedido) => suma + pedido.points_used, 0);
  return { clientes, canjeadosDelMes };
}

interface AjustarPuntosProps {
  cliente: CustomerDetail;
  onCerrar: () => void;
  onGuardado: (detalle: CustomerDetail) => void;
}

function AjustarPuntos({ cliente, onCerrar, onGuardado }: AjustarPuntosProps) {
  const [puntos, setPuntos] = useState('');
  const [motivo, setMotivo] = useState('');
  const [errores, setErrores] = useState<{ puntos?: string; motivo?: string }>(
    {},
  );
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    const cantidad = puntos.trim() === '' ? NaN : Number(puntos);
    const encontrados: typeof errores = {};
    if (!Number.isSafeInteger(cantidad) || cantidad === 0) {
      encontrados.puntos =
        'Ingresá un número entero distinto de 0. Con signo menos, resta.';
    }
    if (!motivo.trim()) {
      encontrados.motivo = 'El motivo es obligatorio.';
    } else if (motivo.trim().length > 200) {
      encontrados.motivo = 'El motivo puede tener hasta 200 caracteres.';
    }
    setErrores(encontrados);
    setErrorGeneral(null);
    if (Object.keys(encontrados).length > 0) {
      return;
    }

    setEnviando(true);
    try {
      onGuardado(
        await adjustCustomerPoints(cliente.id, cantidad, motivo.trim()),
      );
      onCerrar();
    } catch (err) {
      setErrorGeneral(
        mensajeDeError(err, 'No se pudo guardar el ajuste. Intentá de nuevo.'),
      );
      setEnviando(false);
    }
  };

  return (
    <Modal
      titulo="Ajustar puntos"
      bajada={`${cliente.first_name} ${cliente.last_name} · saldo actual: ${cliente.points} pts`}
      onCerrar={onCerrar}
    >
      <form onSubmit={enviar} noValidate>
        <Campo
          id="ajuste-puntos"
          name="puntos"
          label="Puntos (con signo menos para restar)"
          type="number"
          step={1}
          value={puntos}
          onCambio={setPuntos}
          error={errores.puntos}
        />
        <Campo
          id="ajuste-motivo"
          name="motivo"
          label="Motivo"
          maxLength={200}
          value={motivo}
          onCambio={setMotivo}
          error={errores.motivo}
        />
        {errorGeneral && (
          <p className="panel-error" role="alert">
            {errorGeneral}
          </p>
        )}
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
            {enviando ? 'Guardando…' : 'Guardar ajuste'}
          </KerButton>
        </div>
      </form>
    </Modal>
  );
}

function AdminClientes() {
  const { datos, error, cargando, reintentar, setDatos } =
    useDatos(cargarClientes);
  const [busqueda, setBusqueda] = useState('');
  const [elegidoId, setElegidoId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<CustomerDetail | null>(null);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [ajustando, setAjustando] = useState(false);
  // Si se eligen dos clientes seguidos, gana el último aunque responda antes.
  const ultimoPedido = useRef(0);

  const clientes = useMemo(() => datos?.clientes ?? [], [datos]);
  const visibles = useMemo(
    () =>
      clientes.filter((cliente) =>
        matchesWords(
          `${cliente.first_name} ${cliente.last_name} ${cliente.email}`,
          busqueda,
        ),
      ),
    [clientes, busqueda],
  );

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

  const elegir = async (cliente: Customer) => {
    const pedido = ++ultimoPedido.current;
    setElegidoId(cliente.id);
    setDetalle(null);
    setErrorDetalle(null);
    setCargandoDetalle(true);
    try {
      const respuesta = await getCustomer(cliente.id);
      if (pedido === ultimoPedido.current) {
        setDetalle(respuesta);
      }
    } catch (err) {
      if (pedido === ultimoPedido.current) {
        setErrorDetalle(
          mensajeDeError(err, 'No se pudo cargar el cliente. Probá de nuevo.'),
        );
      }
    } finally {
      if (pedido === ultimoPedido.current) {
        setCargandoDetalle(false);
      }
    }
  };

  const guardarAjuste = (actualizado: CustomerDetail) => {
    setDetalle(actualizado);
    setDatos((actuales) => ({
      ...actuales,
      clientes: actuales.clientes.map((cliente) =>
        cliente.id === actualizado.id
          ? {
              ...cliente,
              points: actualizado.points,
              level: actualizado.level,
            }
          : cliente,
      ),
    }));
  };

  const circulacion = clientes.reduce((suma, c) => suma + c.points, 0);
  const tarjetas = [
    {
      icono: '👥',
      fondo: '#fff3bf',
      titulo: 'Clientes registrados',
      valor: clientes.length,
      nota: 'Con cuenta en el kiosko',
    },
    {
      icono: '⭐',
      fondo: '#ffe3bf',
      titulo: 'Puntos en circulación',
      valor: circulacion,
      nota: 'Sin canjear',
    },
    {
      icono: '🎁',
      fondo: 'var(--color-marca-suave)',
      titulo: 'Puntos canjeados',
      valor: datos.canjeadosDelMes,
      nota: 'En el mes',
    },
    {
      icono: '🏷️',
      fondo: '#efe6fb',
      titulo: '15% sin usar',
      valor: clientes.filter((c) => c.orders_count === 0).length,
      nota: 'Sin compras activas',
    },
  ];

  return (
    <>
      <div className="panel-encabezado">
        <h1>Clientes y puntos</h1>
        <span className="panel-pildora">
          {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'}
        </span>
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
            <p className="panel-tarjeta__valor">{formatAmount(valor)}</p>
            <p className="panel-tarjeta__nota">{nota}</p>
          </section>
        ))}
      </div>

      <div className="panel-filtros">
        <Buscador
          valor={busqueda}
          onCambio={setBusqueda}
          etiqueta="Buscar clientes"
          placeholder="Buscar por nombre o correo"
        />
      </div>
      <Contador
        visibles={visibles.length}
        total={clientes.length}
        nombre="cliente"
      />

      <div className="panel-dos-columnas panel-dos-columnas--tabla">
        {clientes.length === 0 ? (
          <div className="panel-vacio panel-caja">
            <Mascota pose="pensando" />
            <p>Todavía no hay clientes registrados.</p>
          </div>
        ) : visibles.length === 0 ? (
          <SinResultados onLimpiar={() => setBusqueda('')} />
        ) : (
          <div
            className="panel-tabla-caja"
            role="region"
            aria-label="Tabla de clientes"
            tabIndex={0}
          >
            <table className="panel-tabla panel-tabla--compacta">
              <thead>
                <tr>
                  <th scope="col">Cliente</th>
                  <th scope="col">Puntos</th>
                  <th scope="col">Nivel</th>
                  <th scope="col" className="panel-numero">
                    Compras
                  </th>
                  <th scope="col" className="panel-numero">
                    Total gastado
                  </th>
                  <th scope="col">Última</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className={
                      cliente.id === elegidoId
                        ? 'clientes__fila--elegida'
                        : undefined
                    }
                  >
                    <td>
                      <button
                        type="button"
                        className="clientes__cliente"
                        aria-pressed={cliente.id === elegidoId}
                        onClick={() => void elegir(cliente)}
                      >
                        <span className="panel-iniciales" aria-hidden="true">
                          {initials(cliente)}
                        </span>
                        <span>
                          <span className="clientes__nombre">
                            {cliente.first_name} {cliente.last_name}
                          </span>
                          <span className="panel-suave">{cliente.email}</span>
                        </span>
                      </button>
                    </td>
                    <td>
                      <span className="panel-etiqueta panel-etiqueta--amarilla">
                        {cliente.points} pts
                      </span>
                    </td>
                    <td>
                      <span
                        className={`panel-etiqueta ${COLOR_NIVEL[cliente.level] ?? ''}`}
                      >
                        {cliente.level}
                      </span>
                    </td>
                    <td className="panel-numero">{cliente.orders_count}</td>
                    <td className="panel-numero">
                      <strong>{formatPrice(cliente.total_spent)}</strong>
                    </td>
                    <td className="panel-suave">
                      {cliente.last_order_at
                        ? fechaCorta(cliente.last_order_at)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <section className="panel-caja" aria-label="Detalle del cliente">
          {errorDetalle && <ErrorMessage message={errorDetalle} />}
          {cargandoDetalle && <Loading />}
          {!detalle && !errorDetalle && !cargandoDetalle && (
            <div className="panel-vacio">
              <Mascota pose="con-productos" />
              <p>Elegí un cliente para ver sus movimientos.</p>
            </div>
          )}
          {detalle && (
            <>
              <div className="clientes__encabezado">
                <span className="panel-iniciales" aria-hidden="true">
                  {initials(detalle)}
                </span>
                <div>
                  <h2>
                    {detalle.first_name} {detalle.last_name}
                  </h2>
                  <p className="panel-suave">
                    Cliente desde {fechaLarga(detalle.created_at)} ·{' '}
                    {detalle.email}
                  </p>
                </div>
              </div>
              <p className="clientes__saldo">
                Saldo de puntos <strong>{detalle.points}</strong>
              </p>
              <h3>Movimientos</h3>
              {detalle.movements.length === 0 ? (
                <p className="panel-suave">Todavía no tiene movimientos.</p>
              ) : (
                <ul className="clientes__movimientos">
                  {detalle.movements.map((movimiento) => (
                    <li key={movimiento.id}>
                      <span
                        className={
                          movimiento.points > 0
                            ? 'clientes__puntos-suma'
                            : 'clientes__puntos-resta'
                        }
                      >
                        {movimiento.points > 0
                          ? `+${movimiento.points}`
                          : `−${Math.abs(movimiento.points)}`}
                      </span>
                      <span>{movimiento.reason}</span>
                      <span className="panel-suave">
                        {fechaCorta(movimiento.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="clientes__botones">
                <KerButton
                  variant="verde"
                  size="chico"
                  onClick={() => setAjustando(true)}
                >
                  Ajustar puntos
                </KerButton>
                <Link
                  className="panel-boton"
                  to={`/admin/ventas?q=${encodeURIComponent(detalle.email)}`}
                >
                  Ver todas sus compras
                </Link>
              </div>
            </>
          )}
        </section>
      </div>

      {ajustando && detalle && (
        <AjustarPuntos
          cliente={detalle}
          onCerrar={() => setAjustando(false)}
          onGuardado={guardarAjuste}
        />
      )}
    </>
  );
}

export default AdminClientes;
