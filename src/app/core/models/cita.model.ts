export type EstadoCita = 'PROGRAMADA' | 'CONFIRMADA' | 'ATENDIDA' | 'CANCELADA' | 'NO_ASISTIO';

export interface Cita {
  id: number;
  pacienteId: number;
  medicoId: number;
  fecha: string;
  hora: string;
  tipoConsulta: string;
  estado: EstadoCita;
  observaciones: string | null;
}

export interface CitaRequest {
  pacienteId: number;
  medicoId: number;
  fecha: string;
  hora: string;
  tipoConsulta: string;
  observaciones?: string | null;
}

export interface ReprogramarCitaRequest {
  fecha: string;
  hora: string;
}
