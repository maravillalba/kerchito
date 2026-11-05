import { useState } from 'react';
import type { FormEvent } from 'react';
import Campo from '../../components/Campo';
import KerButton from '../../components/KerButton';
import Modal from '../../components/Modal';
import type { DatosProducto } from '../../hooks/useProductosAdmin';
import type { Category, Product } from '../../types';
import { CATEGORY_LABELS } from '../../utils/format';
import { enfocarPrimerError, validarProducto } from '../../utils/validaciones';
import type {
  CampoProducto,
  Errores,
  ValoresProducto,
} from '../../utils/validaciones';
import './ProductoModal.css';

const OPCIONES_CATEGORIA = [
  { value: '', label: 'Elegí una categoría' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

function valoresIniciales(producto: Product | null): ValoresProducto {
  return {
    brand: producto?.brand ?? '',
    name: producto?.name ?? '',
    unit: producto?.unit ?? '',
    category: producto?.category ?? '',
    price: producto ? String(producto.price) : '',
    offer_price: producto?.offer_price ? String(producto.offer_price) : '',
    stock: producto ? String(producto.stock) : '',
  };
}

interface ProductoModalProps {
  // null: producto nuevo.
  producto: Product | null;
  onGuardar: (datos: DatosProducto) => void;
  onCerrar: () => void;
}

function ProductoModal({ producto, onGuardar, onCerrar }: ProductoModalProps) {
  const [valores, setValores] = useState(() => valoresIniciales(producto));
  const [errores, setErrores] = useState<Errores<CampoProducto>>({});

  const campo = (nombre: CampoProducto) => ({
    id: `producto-${nombre}`,
    name: nombre,
    value: valores[nombre],
    error: errores[nombre],
    onCambio: (valor: string) => {
      setValores((prev) => ({ ...prev, [nombre]: valor }));
      setErrores((prev) => ({ ...prev, [nombre]: undefined }));
    },
  });

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const encontrados = validarProducto(valores);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      enfocarPrimerError(e.currentTarget, encontrados);
      return;
    }
    onGuardar({
      // Conserva lo que el formulario no edita: descripción y foto.
      description: producto?.description ?? null,
      image: producto?.image ?? null,
      brand: valores.brand.trim(),
      name: valores.name.trim(),
      unit: valores.unit.trim(),
      category: valores.category as Category,
      price: Number(valores.price),
      offer_price: valores.offer_price.trim()
        ? Number(valores.offer_price)
        : null,
      stock: Number(valores.stock),
    });
  };

  return (
    <Modal
      titulo={producto ? 'Editar producto' : 'Nuevo producto'}
      onCerrar={onCerrar}
    >
      <form noValidate onSubmit={enviar}>
        <div className="producto-modal__grilla">
          <Campo label="Marca" {...campo('brand')} />
          <Campo label="Nombre" {...campo('name')} />
          <Campo label="Unidad" placeholder="500 ml" {...campo('unit')} />
          <Campo
            label="Categoría"
            opciones={OPCIONES_CATEGORIA}
            {...campo('category')}
          />
          <Campo
            label="Precio"
            type="number"
            min="0"
            step="any"
            {...campo('price')}
          />
          <Campo
            label="Precio de oferta (opcional)"
            type="number"
            min="0"
            step="any"
            {...campo('offer_price')}
          />
          <Campo
            label="Stock"
            type="number"
            min="0"
            step="1"
            {...campo('stock')}
          />
        </div>
        <div className="producto-modal__acciones">
          <KerButton variant="verde" onClick={onCerrar}>
            Cancelar
          </KerButton>
          <KerButton type="submit">Guardar</KerButton>
        </div>
      </form>
    </Modal>
  );
}

export default ProductoModal;
