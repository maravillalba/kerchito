import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section>
      <h1>Página no encontrada</h1>
      <p>La página que buscás no existe.</p>
      <Link to="/">Volver al inicio</Link>
    </section>
  );
}

export default NotFound;
