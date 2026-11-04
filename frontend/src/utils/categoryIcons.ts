import almacen from '../assets/categorias/almacen.webp';
import bebidas from '../assets/categorias/bebidas.webp';
import cigarrillos from '../assets/categorias/cigarrillos.webp';
import golosinas from '../assets/categorias/golosinas.webp';
import lacteos from '../assets/categorias/lacteos.webp';
import limpieza from '../assets/categorias/limpieza.webp';
import type { Category } from '../types';

// Una foto por categoría (las 6 de docs/CONTRATO.md §3).
export const CATEGORY_ICONS: Record<Category, string> = {
  bebidas,
  golosinas_snacks: golosinas,
  lacteos,
  almacen,
  limpieza,
  cigarrillos,
};
