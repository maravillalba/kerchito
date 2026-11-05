import Mascota from '../../components/Mascota';
import './AdminProximamente.css';

function AdminProximamente({ titulo }: { titulo: string }) {
  return (
    <section className="admin-caja admin-proximamente">
      <Mascota pose="pensando" size="grande" />
      <h1 className="admin-proximamente__titulo">{titulo}</h1>
      <p>Próximamente</p>
    </section>
  );
}

export default AdminProximamente;
