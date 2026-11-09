import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api';

interface Estado<T> {
  datos: T | null;
  error: string | null;
  cargando: boolean;
}

export function mensajeDeError(error: unknown, generico: string): string {
  // Sin conexión, api.ts ya trae el motivo en español.
  return error instanceof ApiError && error.kind !== 'http'
    ? error.message
    : generico;
}

// Carga datos al montar. `cargar` tiene que ser estable (una función del módulo
// o un useCallback). `setDatos` actualiza lo cargado sin volver a pedirlo.
export function useDatos<T>(cargar: () => Promise<T>) {
  const [estado, setEstado] = useState<Estado<T>>({
    datos: null,
    error: null,
    cargando: true,
  });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    cargar()
      .then((datos) => {
        if (vigente) {
          setEstado({ datos, error: null, cargando: false });
        }
      })
      .catch((error: unknown) => {
        if (vigente) {
          setEstado({
            datos: null,
            error: mensajeDeError(
              error,
              'No se pudieron cargar los datos. Probá de nuevo.',
            ),
            cargando: false,
          });
        }
      });
    return () => {
      vigente = false;
    };
  }, [cargar, intento]);

  const reintentar = useCallback(() => {
    setEstado((actual) => ({ ...actual, error: null, cargando: true }));
    setIntento((actual) => actual + 1);
  }, []);

  const setDatos = useCallback((cambiar: (datos: T) => T) => {
    setEstado((actual) =>
      actual.datos === null
        ? actual
        : { ...actual, datos: cambiar(actual.datos) },
    );
  }, []);

  return { ...estado, reintentar, setDatos };
}
