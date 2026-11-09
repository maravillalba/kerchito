import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { RutaAdmin, RutaSinSesion, RutaTienda } from './components/RutasAcceso';
import AdminInicio from './pages/admin/AdminInicio';
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
        <Route path="admin/*" element={<AdminInicio />} />
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
