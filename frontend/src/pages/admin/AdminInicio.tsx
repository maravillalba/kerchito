import KerButton from '../../components/KerButton';
import Mascota from '../../components/Mascota';
import { useAuth } from '../../context/AuthContext';

// Lugar del panel de administración hasta la Etapa 7.
function AdminInicio() {
  const { usuario, logout } = useAuth();
  return (
    <main className="container">
      <Mascota pose="pensando" />
      <h1>Panel de administración</h1>
      <p>Hola, {usuario?.first_name}. El panel se suma en la próxima etapa.</p>
      <KerButton variant="verde" size="chico" onClick={logout}>
        Cerrar sesión
      </KerButton>
    </main>
  );
}

export default AdminInicio;
