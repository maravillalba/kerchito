import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import logo from '../../assets/logo-ker.png';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const SECCIONES = [
  { ruta: '/admin', texto: 'Resumen', icono: '📊' },
  { ruta: '/admin/inventario', texto: 'Inventario', icono: '📦' },
  { ruta: '/admin/ventas', texto: 'Ventas', icono: '🧾' },
  { ruta: '/admin/clientes', texto: 'Clientes y puntos', icono: '👥' },
  { ruta: '/admin/ofertas', texto: 'Ofertas', icono: '🏷️' },
];

// Layout propio del panel, sin Header ni Footer de la tienda. En escritorio es
// una barra lateral; en celular, una barra superior con el botón "Menú".
function AdminLayout() {
  const { usuario, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="admin">
      <aside className="admin__lateral">
        <div className="admin__barra">
          <Link to="/" className="admin__logo">
            <img src={logo} alt="Ver la tienda" width={640} height={427} />
          </Link>
          <button
            type="button"
            className="admin__menu-boton"
            aria-expanded={menuAbierto}
            aria-controls="admin-menu"
            onClick={() => setMenuAbierto((abierto) => !abierto)}
          >
            Menú
          </button>
        </div>

        <div
          id="admin-menu"
          className={`admin__menu${menuAbierto ? ' admin__menu--abierto' : ''}`}
        >
          <nav className="admin__nav" aria-label="Secciones del panel">
            {SECCIONES.map(({ ruta, texto, icono }) => (
              <NavLink
                key={ruta}
                to={ruta}
                end={ruta === '/admin'}
                className="admin__link"
                onClick={() => setMenuAbierto(false)}
              >
                <span aria-hidden="true">{icono}</span> {texto}
              </NavLink>
            ))}
          </nav>

          <div className="admin__usuario">
            <span className="admin__avatar" aria-hidden="true" />
            <div>
              <p className="admin__usuario-nombre">{usuario?.first_name}</p>
              <p>Administrador</p>
              <button type="button" className="admin__salir" onClick={logout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="admin__contenido">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
