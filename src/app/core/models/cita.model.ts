export type EstadoCita = 'PROGRAMADA' | 'CONFIRMADA' | 'ATENDIDA' | 'CANCELADA' | 'NO_ASISTIO';

export type OrigenCita = 'INTRANET' | 'PORTAL' | 'CHATBOT_WEB' | 'TELEGRAM' | 'CAPTURA_PRETEST';

export interface Cita {
  id: number;
  pacienteId: number;
  /** null solo en citas del pretest transcritas de las hojas de calculo. */
  medicoId: number | null;
  fecha: string;
  hora: string;
  tipoConsulta: string;
  estado: EstadoCita;
  observaciones: string | null;
  origen: OrigenCita;
  fechaCreacion: string;
  /** Cuando y quien registro ATENDIDA / NO_ASISTIO (dato del indicador TNS). */
  fechaHoraDesenlace: string | null;
  desenlaceRegistradoPor: number | null;
  cierreAutomatico: boolean;
  vecesReprogramada: number;
}

export interface CitaRequest {
  pacienteId: number;
  medicoId: number;
  fecha: string;
  hora: string;
  tipoConsulta: string;
  observaciones?: string | null;
  /** Sesion de medicion del TPR abierta al mostrar el formulario. */
  medicionId?: number | null;
}

export interface ReprogramarCitaRequest {
  fecha: string;
  hora: string;
}
