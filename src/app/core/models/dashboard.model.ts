import { IndicadoresTesis } from './estudio.model';

/**
 * Dashboard de gestion: los tres indicadores de la tesis sobre todo el
 * sistema (alcance GLOBAL) en el periodo consultado, calculados exactamente
 * igual que en el modulo de estudio.
 */
export interface IndicadoresDashboard {
  desde: string;
  hasta: string;
  indicadores: IndicadoresTesis;
  cumplimientoTratamientoPorcentaje: number | null;
}

/** Todo lo que paso en el periodo (GET /dashboard/actividad). null = sin eventos. */
export interface ActividadResumen {
  desde: string;
  hasta: string;
  registros: { total: number; promedioMin: number | null; minimoMin: number | null; maximoMin: number | null; porRevisar: number };
  citas: {
    total: number;
    atendidas: number;
    noAsistio: number;
    canceladas: number;
    pendientes: number;
    sinDesenlace: number;
    reprogramadas: number;
    ausentismoPct: number | null;
  };
  recordatorios: {
    enviados: number;
    fallidos: number;
    pendientes: number;
    respondidos: number;
    enviadosPorCanal: Record<string, number>;
    citasConRecordatorio: number;
    coberturaPct: number | null;
  };
  consultas: {
    total: number;
    abiertas: number;
    cerradas: number;
    resueltasPorAsistente: number;
    derivadas: number;
    atendidasAutomaticoPct: number | null;
    tiempoRespuestaPromedioMin: number | null;
    porCategoria: Record<string, number>;
  };
  dias: ActividadDia[];
}

export interface ActividadDia {
  fecha: string;
  registros: number;
  tprMin: number | null;
  citasElegibles: number;
  inasistencias: number;
  ausentismoPct: number | null;
  recordatoriosEnviados: number;
  consultas: number;
  resueltasPorAsistente: number;
  atendidasAutomaticoPct: number | null;
}

/** Fila por fila, con nombres (GET /dashboard/actividad/detalle). */
export interface ActividadDetalle {
  registros: {
    paciente: string | null;
    registradoPor: string | null;
    fecha: string;
    hora: string;
    minutos: number;
    canal: string;
    sospechosa: boolean;
  }[];
  citas: {
    paciente: string | null;
    medico: string | null;
    fecha: string;
    hora: string;
    estado: string;
    recordatorioEnviado: boolean;
    vecesReprogramada: number;
  }[];
  recordatorios: {
    paciente: string | null;
    fechaCita: string;
    tipo: string;
    canal: string;
    estado: string;
    programadoPara: string | null;
    enviadoEn: string | null;
    respuesta: string | null;
  }[];
  consultas: {
    paciente: string | null;
    fecha: string;
    hora: string;
    categoria: string | null;
    canal: string;
    resultado: string | null;
    derivada: boolean;
    reabierta: boolean;
    tiempoRespuestaMin: number | null;
  }[];
}
