export type TipoTratamiento = 'QUIMIOTERAPIA' | 'RADIOTERAPIA' | 'CIRUGIA' | 'CUIDADOS_PALIATIVOS';
export type EstadoCicloTratamiento = 'PROGRAMADO' | 'REALIZADO' | 'SUSPENDIDO' | 'CANCELADO';

export interface CicloTratamiento {
  id: number;
  pacienteId: number;
  tipoTratamiento: TipoTratamiento;
  numeroSesion: number;
  totalSesionesEsquema: number;
  porcentajeCumplimiento: number;
  fechaSesion: string;
  medicoResponsableId: number;
  estado: EstadoCicloTratamiento;
  observaciones: string | null;
  pacienteNombre?: string | null;
  medicoResponsableNombre?: string | null;
}

export interface CicloTratamientoRequest {
  pacienteId: number;
  tipoTratamiento: TipoTratamiento;
  numeroSesion: number;
  totalSesionesEsquema: number;
  fechaSesion: string;
  medicoResponsableId: number;
  observaciones?: string | null;
}
