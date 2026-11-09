import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { RutaAdmin, RutaSinSesion, RutaTienda } from './components/RutasAcceso';
import AdminClientes from './pages/admin/AdminClientes';
import AdminInventario from './pages/admin/AdminInventario';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOfertas from './pages/admin/AdminOfertas';
import AdminResumen from './pages/admin/AdminResumen';
import AdminVentas from './pages/admin/AdminVentas';
import Cart from './pages/Cart';
import Entrada from './pages/Entrada';
import Home from './pages/Home';
import Ingresar from './pages/Ingresar';
import NotFound from './pages/NotFound';
import ProductDetail from './pages/ProductDetail';
import Products from './pages/Products';
import Registro from './pages/Registro';

function App() {
  return (
    <Routes>
      <Route element={<RutaSinSesion />}>
        <Route path="bienvenida" element={<Entrada />} />
        <Route path="registro" element={<Registro />} />
        <Route path="ingresar" element={<Ingresar />} />
      </Route>
      <Route element={<RutaAdmin />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminResumen />} />
          <Route path="inventario" element={<AdminInventario />} />
          <Route path="ventas" element={<AdminVentas />} />
          <Route path="clientes" element={<AdminClientes />} />
          <Route path="ofertas" element={<AdminOfertas />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>
      <Route element={<RutaTienda />}>
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
