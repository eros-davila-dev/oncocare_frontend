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
  /** Nombres resueltos por el backend (nunca se muestra el id crudo). */
  pacienteNombre?: string | null;
  medicoNombre?: string | null;
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

/** Cita en la agenda de recepcion, con los datos minimos para identificar al paciente. */
export interface CitaAgenda {
  cita: Cita;
  pacienteNombre: string;
  pacienteDocumento: string;
  pacienteTelefono: string | null;
  medicoNombre: string | null;
  /** Sin Telegram, el recordatorio lo hace recepcion por llamada. */
  pacienteConTelegram: boolean;
}

/** Recordatorio por llamada pendiente (pacientes sin Telegram). */
export interface LlamadaPendiente {
  recordatorioId: number;
  citaId: number;
  pacienteNombre: string;
  telefono: string | null;
  fecha: string;
  hora: string;
  intentosPrevios: number;
}
