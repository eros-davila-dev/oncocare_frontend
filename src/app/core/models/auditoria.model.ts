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
}
