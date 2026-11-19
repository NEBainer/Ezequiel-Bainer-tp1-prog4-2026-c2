// Secciones del panel de admin que un rol puede habilitar (las mismas que acepta el CHECK de la tabla "roles")
export type Seccion = 'reportes' | 'peliculas' | 'propuestas' | 'funciones' | 'salas' | 'candy' | 'precios' | 'log';

// Para armar los checkboxes y el menú: la sección y cómo se muestra
export const SECCIONES: { seccion: Seccion; titulo: string }[] = [
  { seccion: 'reportes', titulo: '📊 Reportes' },
  { seccion: 'peliculas', titulo: '🎞️ Películas' },
  { seccion: 'propuestas', titulo: '💡 Propuestas' },
  { seccion: 'funciones', titulo: '🕒 Funciones' },
  { seccion: 'salas', titulo: '🪑 Salas' },
  { seccion: 'candy', titulo: '🍿 Candy y combos' },
  { seccion: 'precios', titulo: '🏷️ Precios y cupones' },
  { seccion: 'log', titulo: '📜 Actividad' },
];

// Fila de "roles". Se llama RolPersonalizado para no chocar con el tipo Rol (admin/empleado/cliente).
export interface RolPersonalizado {
  id: number;
  nombre: string;
  secciones: Seccion[];
  created_at: string;
}

export type RolPersonalizadoPorCrear = Pick<RolPersonalizado, 'nombre' | 'secciones'>;

// Fila de "usuario_roles": qué usuario tiene qué rol
export interface AsignacionRol {
  usuario_id: string;
  rol_id: number;
}
