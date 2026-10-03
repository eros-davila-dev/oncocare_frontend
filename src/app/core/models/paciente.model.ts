import type { Especialidad } from './usuario.model';

export type ConvenioSeguro = 'ESSALUD' | 'SIS' | 'EPS' | 'PARTICULAR';

export type EstadoTratamientoPaciente = 'PENDIENTE' | 'EN_TRATAMIENTO' | 'FINALIZADO' | 'SUSPENDIDO';

export interface Paciente {
  id: number;
  nombres: string;
  apellidos: string;
  documentoIdentidad: string;
  fechaNacimiento: string;
  edad: number;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  tipoCancer: string | null;
  estadioClinico: string | null;
  fechaDiagnostico: string | null;
  medicoTratanteId: number | null;
  convenioSeguro: ConvenioSeguro;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTelefono: string;
  /** Correo del referido (contacto de emergencia): copia de los recordatorios si el paciente lo autoriza. */
  contactoEmergenciaEmail: string | null;
  contactoRecibeRecordatorios: boolean;
  activo: boolean;
  fechaRegistro: string;
}

export interface PacienteRequest {
  nombres: string;
  apellidos: string;
  documentoIdentidad: string;
  fechaNacimiento: string;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  tipoCancer: string | null;
  estadioClinico: string | null;
  fechaDiagnostico: string | null;
  medicoTratanteId: number | null;
  convenioSeguro: ConvenioSeguro;
  contactoEmergenciaNombre: string;
  contactoEmergenciaTelefono: string;
  /** Correo del referido (contacto de emergencia): copia de los recordatorios si el paciente lo autoriza. */
  contactoEmergenciaEmail: string | null;
  contactoRecibeRecordatorios: boolean;
  /**
   * Sesion de medicion del TPR abierta al mostrar el formulario
   * (MedicionRegistroService). El tiempo lo mide el servidor, nunca el navegador.
   */
  medicionId?: number | null;
}

/** Proyeccion de lectura enriquecida: estado derivado de tratamiento, medico y ultima/proxima cita. */
export interface PacienteResumen {
  id: number;
  nombres: string;
  apellidos: string;
  documentoIdentidad: string;
  edad: number;
  tipoCancer: string | null;
  convenioSeguro: ConvenioSeguro;
  activo: boolean;
  estadoTratamiento: EstadoTratamientoPaciente;
  medicoTratanteNombre: string | null;
  medicoTratanteEspecialidad: Especialidad | null;
  ultimaCita: string | null;
  proximaCita: string | null;
}

export interface EstadisticasPacientes {
  pacientesRegistrados: number;
  variacionPacientesRegistradosPorcentaje: number | null;
  pacientesEnTratamiento: number;
  variacionPacientesEnTratamientoPorcentaje: number | null;
  citasEstaSemana: number;
  variacionCitasPorcentaje: number | null;
  asistenciaCitasPorcentaje: number;
  variacionAsistenciaPorcentaje: number | null;
}
