import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import logo from '../../assets/logo-ker.png';
import { useAuth } from '../../context/AuthContext';
import { useCerrarSesion } from '../../hooks/useCerrarSesion';
import { useProductosAdmin } from '../../hooks/useProductosAdmin';
import { SECCIONES } from './secciones';
import './AdminLayout.css';

// Layout propio del panel, sin Header ni Footer de la tienda. En escritorio es
// un sidebar; en celular, una barra superior con el botón "Menú".
function AdminLayout() {
  const { usuario } = useAuth();
  const cerrarSesion = useCerrarSesion();
  const panel = useProductosAdmin();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <div className="admin">
      <aside className="admin__lateral">
        <div className="admin__barra">
          <Link to="/" className="admin__logo">
            <img src={logo} alt="Kiosko El Rápido" width={640} height={427} />
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
            {SECCIONES.map((seccion) => (
              <NavLink
                key={seccion.texto}
                to={seccion.ruta ? `/admin/${seccion.ruta}` : '/admin'}
                end={seccion.ruta === ''}
                className="admin__link"
                onClick={() => setMenuAbierto(false)}
              >
                <span aria-hidden="true">{seccion.icono}</span> {seccion.texto}
              </NavLink>
            ))}
          </nav>

          <div className="admin__usuario">
            <span className="admin__avatar" aria-hidden="true" />
            <div>
              <p>{usuario?.nombre}</p>
              <button
                type="button"
                className="admin__salir"
                onClick={cerrarSesion}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="admin__contenido">
        <Outlet context={panel} />
      </main>
    </div>
  );
}

export default AdminLayout;
