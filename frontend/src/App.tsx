import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import PrimeraVisita from './components/PrimeraVisita';
import RutaProtegida from './components/RutaProtegida';
import AdminLayout from './pages/admin/AdminLayout';
import AdminProductos from './pages/admin/AdminProductos';
import AdminProximamente from './pages/admin/AdminProximamente';
import AdminResumen from './pages/admin/AdminResumen';
import { SECCIONES_PENDIENTES } from './pages/admin/secciones';
import Bienvenida from './pages/Bienvenida';
import Cart from './pages/Cart';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ProductDetail from './pages/ProductDetail';
import Products from './pages/Products';

function App() {
  return (
    <Routes>
      <Route path="bienvenida" element={<Bienvenida />} />
      <Route path="login" element={<Login />} />
      <Route element={<RutaProtegida rol="admin" />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminResumen />} />
          <Route path="productos" element={<AdminProductos />} />
          {SECCIONES_PENDIENTES.map(({ ruta, texto }) => (
            <Route
              key={ruta}
              path={ruta}
              element={<AdminProximamente titulo={texto} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
      <Route element={<PrimeraVisita />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
