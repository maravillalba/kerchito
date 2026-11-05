import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { yaVioBienvenida } from '../utils/primeraVisita';

// En la primera visita de la sesión, / va a /bienvenida. Está por encima del
// Layout para que no llegue a dibujarse la tienda. Quien ya ingresó no la ve:
// su opción principal sería volver a iniciar sesión.
function PrimeraVisita() {
  const { pathname } = useLocation();
  const { usuario } = useAuth();

  if (pathname === '/' && !usuario && !yaVioBienvenida()) {
    return <Navigate to="/bienvenida" replace />;
  }
  return <Outlet />;
}

export default PrimeraVisita;
