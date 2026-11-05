import aprobado from '../assets/kerchi/kerchi-aprobado.webp';
import conProductos from '../assets/kerchi/kerchi-con-productos.webp';
import festejando from '../assets/kerchi/kerchi-festejando.webp';
import pensando from '../assets/kerchi/kerchi-pensando.webp';
import saludando from '../assets/kerchi/kerchi-saludando.webp';
import triste from '../assets/kerchi/kerchi-triste.webp';
import './Mascota.css';

export type MascotaPose =
  | 'saludando'
  | 'pensando'
  | 'triste'
  | 'festejando'
  | 'con-productos'
  | 'aprobado';

// Una imagen de Kerchi (el mapache del kiosco) por pose.
const MASCOTA_POSES: Record<MascotaPose, string> = {
  saludando,
  pensando,
  triste,
  festejando,
  'con-productos': conProductos,
  aprobado,
};

interface MascotaProps {
  pose: MascotaPose;
  size?: 'chico' | 'mediano' | 'grande';
}

// Kerchi acompaña algunos estados de la interfaz. Es decorativa: el texto de
// cada estado ya dice lo que pasa, así que los lectores de pantalla la saltean.
function Mascota({ pose, size = 'mediano' }: MascotaProps) {
  return (
    <img
      src={MASCOTA_POSES[pose]}
      alt=""
      aria-hidden="true"
      width={420}
      height={430}
      className={`mascota mascota--${pose} mascota--${size}`}
    />
  );
}

export default Mascota;
