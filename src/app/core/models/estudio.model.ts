/**
 * Modulo de estudio de la tesis: indicadores TPR (min), TNS (%) y NCA (%),
 * fases pretest/postest, muestra de participantes y fichas del Anexo 2.
 * Un indicador null significa "sin datos" (denominador cero), nunca 0.
 */

export type Fase = 'PRETEST' | 'POSTEST';
export type EstadoFase = 'ABIERTA' | 'CERRADA';
export type AlcanceIndicador = 'GLOBAL' | 'MUESTRA';
export type TipoMedicion = 'REGISTRO_CITA' | 'REGISTRO_PACIENTE' | 'ACTUALIZACION_PACIENTE';
export type CanalMedicion = 'INTRANET' | 'PORTAL' | 'CHATBOT_WEB' | 'TELEGRAM' | 'MANUAL';
export type EstadoMedicion = 'EN_CURSO' | 'COMPLETADA' | 'ABANDONADA' | 'ANULADA';
export type CanalConsulta = 'CHATBOT_WEB' | 'TELEGRAM' | 'WHATSAPP' | 'LLAMADA' | 'PRESENCIAL';
export type ResultadoConsulta = 'RESUELTA_BOT' | 'RESUELTA_PERSONAL' | 'ESCALADA' | 'NO_RESUELTA' | 'ANULADA';
export type MotivoExclusion =
  | 'SUSPENDIO_TRATAMIENTO'
  | 'FALLECIO'
  | 'RETIRO_CONSENTIMIENTO'
  | 'REGISTROS_INCOMPLETOS'
  | 'OTRO';
export type TipoFicha = 'tiempos' | 'asistencias' | 'consultas';

export interface IniciarMedicionResponse {
  medicionId: number;
  tipo: TipoMedicion;
  canal: CanalMedicion;
  inicio: string;
}

export interface IndicadoresTesis {
  tiempoPromedioRegistroMinutos: number | null;
  registros: number;
  tasaAusentismo: number | null;
  inasistencias: number;
  citasCumplidas: number;
  citasConDesenlace: number;
  nivelConsultasAtendidas: number | null;
  nivelConsultasAtendidasAutomatico: number | null;
  consultasResueltas: number;
  consultasResueltasBot: number;
  consultasCerradas: number;
}

export interface ResultadoIndicadores {
  fase: Fase | null;
  desde: string;
  hasta: string;
  alcance: AlcanceIndicador;
  tipoRegistro: TipoMedicion;
  canalesRegistro: CanalMedicion[];
  indicadores: IndicadoresTesis;
}

export interface Variacion {
  diferencia: number | null;
  porcentaje: number | null;
}

export interface FaseIndicadores {
  desde: string;
  hasta: string;
  indicadores: IndicadoresTesis;
}

export interface ComparativoIndicadores {
  alcance: AlcanceIndicador;
  pretest: FaseIndicadores;
  postest: FaseIndicadores;
  tiempoPromedioRegistro: Variacion;
  tasaAusentismo: Variacion;
  nivelConsultasAtendidas: Variacion;
}

export interface FilaPareada {
  codigo: string;
  pretest: IndicadoresTesis;
  postest: IndicadoresTesis;
}

/** Prueba de Wilcoxon preliminar (mismas convenciones que SPSS). */
export interface ResultadoWilcoxon {
  pares: number;
  empates: number;
  n: number;
  rangosNegativos: number;
  rangosPositivos: number;
  sumaRangosNegativos: number | null;
  sumaRangosPositivos: number | null;
  medianaPretest: number | null;
  medianaPostest: number | null;
  z: number | null;
  pAsintotica: number | null;
  pExacta: number | null;
  tamanoEfecto: number | null;
}

export interface AnalisisPareado {
  tiempoPromedioRegistro: ResultadoWilcoxon;
  tasaAusentismo: ResultadoWilcoxon;
  nivelConsultasAtendidas: ResultadoWilcoxon;
}

export interface FaseEstudio {
  fase: Fase;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoFase;
}

export interface Participante {
  id: number;
  pacienteId: number;
  codigo: string;
  nombreCompleto: string | null;
  documentoIdentidad: string | null;
  fechaConsentimiento: string;
  incluido: boolean;
  motivoExclusion: MotivoExclusion | null;
  observacion: string | null;
  fechaInclusion: string;
  fechaExclusion: string | null;
}

export interface MedicionRegistro {
  id: number;
  tipo: TipoMedicion;
  canal: CanalMedicion;
  estado: EstadoMedicion;
  sospechosa: boolean;
  usuarioId: number | null;
  pacienteId: number | null;
  entidadId: number | null;
  inicio: string;
  fin: string | null;
  duracionSegundos: number | null;
  observacion: string | null;
}

export interface Consulta {
  id: number;
  canal: CanalConsulta;
  pacienteId: number | null;
  intencion: string | null;
  resumen: string | null;
  resultado: ResultadoConsulta | null;
  abiertaEn: string;
  cerradaEn: string | null;
  tiempoPrimeraRespuestaMs: number | null;
  valoracion: number | null;
  resueltaPorUsuarioId: number | null;
  capturaManual: boolean;
  observacion: string | null;
}

export interface FichaTiempoRequest {
  pacienteId: number;
  tipo?: TipoMedicion;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  observacion?: string | null;
}

export interface FichaAsistenciaRequest {
  pacienteId: number;
  fecha: string;
  hora?: string | null;
  tipoConsulta?: string | null;
  asistio: boolean;
}

export interface FichaConsultaRequest {
  fecha: string;
  hora?: string | null;
  canal: CanalConsulta;
  pacienteId?: number | null;
  resumen: string;
  resuelta: boolean;
  observacion?: string | null;
}

export interface ErrorFila {
  fila: number;
  mensaje: string;
}

export interface ResultadoImportacion {
  ficha: string;
  filasLeidas: number;
  filasValidas: number;
  errores: ErrorFila[];
  aplicado: boolean;
}

// --- Recoleccion por sesion (tesis v8: 13 sesiones L-M-V por etapa) ---------

export type CategoriaConsulta =
  | 'CITAS'
  | 'HORARIOS'
  | 'INFORMACION_INSTITUCIONAL'
  | 'REQUISITOS'
  | 'UBICACION'
  | 'SEGUIMIENTO_ADMINISTRATIVO'
  | 'OTRO';

/** Un valor por sesion; ausente/null = sesion sin eventos (se excluye del analisis). */
export interface SesionRecoleccion {
  numero: number;
  fecha: string;
  registros: number;
  tprMin?: number | null;
  citasElegibles: number;
  inasistencias: number;
  taPct?: number | null;
  consultas: number;
  resueltas: number;
  ncaPct?: number | null;
}

export interface IndicadoresRecoleccion {
  tprMin?: number | null;
  taPct?: number | null;
  ncaPct?: number | null;
}

export interface AvisosRecoleccion {
  citasSinDesenlace: number;
  consultasAbiertas: number;
  registrosSospechosos: number;
  eventosFueraDeSesion: number;
}

export interface ResumenRecoleccion {
  fase: Fase;
  desde: string;
  hasta: string;
  diasSesion: string[];
  sesiones: SesionRecoleccion[];
  promedioSesiones: IndicadoresRecoleccion;
  global: IndicadoresRecoleccion;
  registros: number;
  citasElegibles: number;
  consultas: number;
  avisos: AvisosRecoleccion;
}

export interface FilaTiempoRecoleccion {
  codigo: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  minutos: number;
  canal: CanalMedicion;
  sospechosa: boolean;
}

export interface FilaCitaRecoleccion {
  codigo: string | null;
  fecha: string;
  hora: string;
  estado: string;
  recordatorioEnviado: boolean;
  vecesReprogramada: number;
}

export interface FilaConsultaRecoleccion {
  codigo?: string | null;
  fecha: string;
  hora: string;
  categoria?: CategoriaConsulta | null;
  canal: CanalConsulta;
  resultado?: ResultadoConsulta | null;
  derivada: boolean;
  reabierta: boolean;
  tiempoRespuestaMin?: number | null;
}

export interface DetalleRecoleccion {
  tiempos: FilaTiempoRecoleccion[];
  citas: FilaCitaRecoleccion[];
  consultas: FilaConsultaRecoleccion[];
}
