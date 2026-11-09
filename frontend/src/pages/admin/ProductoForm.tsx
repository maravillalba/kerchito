import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Campo from '../../components/Campo';
import KerButton from '../../components/KerButton';
import Modal from '../../components/Modal';
import { mensajeDeError } from '../../hooks/useDatos';
import {
  ApiError,
  createProduct,
  imageUrl,
  updateProduct,
  uploadProductImage,
} from '../../services/api';
import type { Category, ProductAdmin, ProductAdminInput } from '../../types';
import { CATEGORY_LABELS } from '../../utils/format';
import {
  enfocarPrimerError,
  TIPOS_DE_FOTO,
  validarFoto,
  validarProducto,
} from '../../utils/validaciones';
import type {
  CampoProducto,
  Errores,
  ValoresProducto,
} from '../../utils/validaciones';

const OPCIONES_CATEGORIA = [
  { value: '', label: 'Elegí una categoría' },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

function valoresDe(producto: ProductAdmin | null): ValoresProducto {
  return {
    brand: producto?.brand ?? '',
    name: producto?.name ?? '',
    unit: producto?.unit ?? '',
    category: producto?.category ?? '',
    stock: producto ? String(producto.stock) : '',
    cost: producto ? String(producto.cost) : '',
    price: producto ? String(producto.price) : '',
    offer_price:
      producto?.offer_price != null ? String(producto.offer_price) : '',
    description: producto?.description ?? '',
  };
}

function aDatos(valores: ValoresProducto): ProductAdminInput {
  return {
    brand: valores.brand.trim(),
    name: valores.name.trim(),
    unit: valores.unit.trim(),
    category: valores.category as Category,
    stock: Number(valores.stock),
    cost: Number(valores.cost),
    price: Number(valores.price),
    offer_price:
      valores.offer_price.trim() === '' ? null : Number(valores.offer_price),
    description: valores.description.trim() || null,
  };
}

function formatoTamano(bytes: number) {
  return `${Math.ceil(bytes / 1024)} KB`;
}

interface ProductoFormProps {
  // null = producto nuevo.
  producto: ProductAdmin | null;
  onCerrar: () => void;
  // Se llama cada vez que el backend guardó algo, para actualizar la lista.
  onGuardado: (producto: ProductAdmin) => void;
}

function ProductoForm({ producto, onCerrar, onGuardado }: ProductoFormProps) {
  // Si se creó el producto pero falló la foto, el reintento edita ese producto:
  // no crea otro igual.
  const [guardado, setGuardado] = useState(producto);
  const [valores, setValores] = useState(() => valoresDe(producto));
  const [errores, setErrores] = useState<Errores<CampoProducto>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);
  const urlActual = useRef<string | null>(null);

  // La URL temporal de la vista previa ocupa memoria hasta que se revoca.
  const cambiarFoto = (archivo: File | null) => {
    if (urlActual.current) {
      URL.revokeObjectURL(urlActual.current);
    }
    urlActual.current = archivo ? URL.createObjectURL(archivo) : null;
    setFoto(archivo);
    setVistaPrevia(urlActual.current);
  };

  useEffect(
    () => () => {
      if (urlActual.current) {
        URL.revokeObjectURL(urlActual.current);
      }
    },
    [],
  );

  const cambiar = (campo: CampoProducto, valor: string) => {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
    setErrores((actuales) => ({ ...actuales, [campo]: undefined }));
  };

  const elegirFoto = (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    // Permite volver a elegir el mismo archivo después de "Quitar".
    event.target.value = '';
    if (!archivo) {
      return;
    }
    const problema = validarFoto(archivo);
    setErrorFoto(problema);
    if (!problema) {
      cambiarFoto(archivo);
    }
  };

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const encontrados = validarProducto(valores);
    setErrores(encontrados);
    setErrorGeneral(null);
    setErrorFoto(null);
    if (Object.keys(encontrados).length > 0) {
      enfocarPrimerError(form, encontrados);
      return;
    }

    setEnviando(true);
    let actual: ProductAdmin;
    try {
      const datos = aDatos(valores);
      actual = guardado
        ? await updateProduct(guardado.id, datos)
        : await createProduct(datos);
      setGuardado(actual);
      onGuardado(actual);
    } catch (error) {
      setErrorGeneral(
        mensajeDeError(
          error,
          'No se pudo guardar el producto. Revisá los datos e intentá de nuevo.',
        ),
      );
      setEnviando(false);
      return;
    }

    if (foto) {
      try {
        onGuardado(await uploadProductImage(actual.id, foto));
      } catch (error) {
        // 413 y 415 traen el motivo en español.
        const motivo =
          error instanceof ApiError && error.kind === 'http'
            ? error.status === 413 || error.status === 415
              ? error.message
              : 'Intentá de nuevo.'
            : mensajeDeError(error, 'Intentá de nuevo.');
        setErrorFoto(`El producto se guardó, pero la foto no. ${motivo}`);
        setEnviando(false);
        return;
      }
    }
    onCerrar();
  };

  const nuevo = guardado === null;
  const fotoActual = guardado?.image ? imageUrl(guardado.image) : null;

  return (
    <Modal
      titulo={nuevo ? 'Nuevo producto' : 'Editar producto'}
      bajada={
        nuevo
          ? 'Completá los datos y subí la foto desde tu computadora.'
          : undefined
      }
      onCerrar={onCerrar}
    >
      <form onSubmit={enviar} noValidate>
        <div className="producto-form__fila producto-form__fila--dos">
          <Campo
            id="producto-marca"
            name="brand"
            label="Marca"
            value={valores.brand}
            onCambio={(valor) => cambiar('brand', valor)}
            error={errores.brand}
          />
          <Campo
            id="producto-nombre"
            name="name"
            label="Nombre del producto"
            value={valores.name}
            onCambio={(valor) => cambiar('name', valor)}
            error={errores.name}
          />
        </div>
        <div className="producto-form__fila producto-form__fila--tres">
          <Campo
            id="producto-unidad"
            name="unit"
            label="Unidad / presentación"
            placeholder="500 ml"
            value={valores.unit}
            onCambio={(valor) => cambiar('unit', valor)}
            error={errores.unit}
          />
          <Campo
            id="producto-categoria"
            name="category"
            label="Categoría"
            value={valores.category}
            onCambio={(valor) => cambiar('category', valor)}
            error={errores.category}
            opciones={OPCIONES_CATEGORIA}
          />
          <Campo
            id="producto-stock"
            name="stock"
            label={nuevo ? 'Stock inicial' : 'Stock'}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={valores.stock}
            onCambio={(valor) => cambiar('stock', valor)}
            error={errores.stock}
          />
        </div>
        <div className="producto-form__fila producto-form__fila--tres">
          <Campo
            id="producto-costo"
            name="cost"
            label="Costo ($)"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={valores.cost}
            onCambio={(valor) => cambiar('cost', valor)}
            error={errores.cost}
          />
          <Campo
            id="producto-precio"
            name="price"
            label="Precio de venta ($)"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={valores.price}
            onCambio={(valor) => cambiar('price', valor)}
            error={errores.price}
          />
          <Campo
            id="producto-oferta"
            name="offer_price"
            label="Precio de oferta ($), opcional"
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            value={valores.offer_price}
            onCambio={(valor) => cambiar('offer_price', valor)}
            error={errores.offer_price}
          />
        </div>
        <Campo
          id="producto-descripcion"
          name="description"
          label="Descripción, opcional"
          placeholder="Ej: Gaseosa clásica"
          value={valores.description}
          onCambio={(valor) => cambiar('description', valor)}
        />

        <div className="producto-foto">
          <span className="producto-foto__titulo" id="producto-foto-titulo">
            Foto del producto
          </span>
          <div className="producto-foto__cuerpo">
            <div className="producto-foto__vista">
              {vistaPrevia || fotoActual ? (
                <img
                  src={vistaPrevia ?? (fotoActual as string)}
                  alt={vistaPrevia ? 'Vista previa de la foto' : 'Foto actual'}
                />
              ) : (
                'Sin foto'
              )}
            </div>
            <div>
              {/* Oculto: lo abre el botón, que sí se ve y se usa con teclado. */}
              <input
                ref={inputFoto}
                type="file"
                accept={TIPOS_DE_FOTO.join(',')}
                hidden
                data-testid="input-foto"
                onChange={elegirFoto}
              />
              <button
                type="button"
                className="panel-boton"
                aria-describedby="producto-foto-titulo"
                onClick={() => inputFoto.current?.click()}
              >
                <span aria-hidden="true">🖼️</span>&nbsp;
                {fotoActual || foto
                  ? 'Reemplazar foto de mi computadora'
                  : 'Elegir foto de mi computadora'}
              </button>
              {foto && (
                <p className="producto-foto__archivo">
                  <strong>{foto.name}</strong> · {formatoTamano(foto.size)}
                  <button
                    type="button"
                    className="producto-foto__quitar"
                    onClick={() => cambiarFoto(null)}
                  >
                    Quitar
                  </button>
                </p>
              )}
            </div>
          </div>
          {errorFoto && (
            <p className="panel-error" role="alert">
              {errorFoto}
            </p>
          )}
          <p className="panel-nota">
            La foto se sube y se guarda en el servidor. Formatos JPG, PNG o
            WebP, hasta 2 MB.
          </p>
        </div>

        {errorGeneral && (
          <p className="panel-error" role="alert">
            {errorGeneral}
          </p>
        )}

        <div className="panel-modal-acciones">
          <button
            type="button"
            className="panel-boton"
            onClick={onCerrar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <KerButton
            type="submit"
            variant="verde"
            size="chico"
            disabled={enviando}
          >
            {enviando ? 'Guardando…' : 'Guardar producto'}
          </KerButton>
        </div>
      </form>
    </Modal>
  );
}

export default ProductoForm;
