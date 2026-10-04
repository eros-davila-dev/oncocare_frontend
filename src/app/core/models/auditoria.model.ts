export interface AuditoriaAccion {
  id: number;
  usuarioId: number | null;
  accion: string;
  entidadAfectada: string;
  entidadId: string | null;
  valoresPrevios: string | null;
  valoresNuevos: string | null;
  ipOrigen: string | null;
  fecha: string;
  resultado: 'EXITO' | 'FALLIDO';
  /** Quien hizo la accion y sobre que, con nombres (resueltos por el backend). */
  usuarioNombre?: string | null;
  entidadDescripcion?: string | null;
}
