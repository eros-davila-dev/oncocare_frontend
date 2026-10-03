import { IndicadoresTesis, ResultadoWilcoxon } from '../../core/models/estudio.model';

/** Sentido de mejora de cada indicador segun las hipotesis de la tesis. */
export type SentidoMejora = 'bajar' | 'subir';

export interface DefinicionIndicador {
  clave: 'tpr' | 'tns' | 'nca';
  sigla: string;
  nombre: string;
  hipotesis: string;
  unidad: 'min' | '%';
  sentido: SentidoMejora;
  formula: string;
  valor: (i: IndicadoresTesis) => number | null;
  /** Base del calculo, para que el numero nunca se lea sin su n. */
  base: (i: IndicadoresTesis) => string;
}

export const INDICADORES_TESIS: readonly DefinicionIndicador[] = [
  {
    clave: 'tpr',
    sigla: 'TPR',
    nombre: 'Tiempo promedio de registro',
    hipotesis: 'H1: el sistema reduce el tiempo de registro',
    unidad: 'min',
    sentido: 'bajar',
    formula: 'TPR = Σ tiempo de cada registro / N.° de registros',
    valor: (i) => i.tiempoPromedioRegistroMinutos,
    base: (i) => `${i.registros} ${plural(i.registros, 'registro', 'registros')}`,
  },
  {
    clave: 'tns',
    sigla: 'TA',
    nombre: 'Tasa de ausentismo',
    hipotesis: 'H2: el sistema disminuye el ausentismo',
    unidad: '%',
    sentido: 'bajar',
    formula: 'TA = no asistidas sin aviso / citas elegibles × 100',
    valor: (i) => i.tasaAusentismo,
    base: (i) => `${i.inasistencias} de ${i.citasConDesenlace} ${plural(i.citasConDesenlace, 'cita', 'citas')} con desenlace`,
  },
  {
    clave: 'nca',
    sigla: 'NCA',
    nombre: 'Nivel de consultas atendidas',
    hipotesis: 'H3: el sistema mejora la atencion de consultas',
    unidad: '%',
    sentido: 'subir',
    formula: 'NCA = resueltas en el primer contacto sin derivación / consultas recibidas × 100',
    // Tesis v8: solo cuenta lo que resolvio el chatbot sin derivar al personal.
    valor: (i) => i.nivelConsultasAtendidasAutomatico,
    base: (i) =>
      `${i.consultasResueltasBot} de ${i.consultasCerradas} ${plural(i.consultasCerradas, 'consulta', 'consultas')} resueltas por el chatbot`,
  },
];

function plural(n: number, singular: string, varios: string): string {
  return n === 1 ? singular : varios;
}

/** null es "sin datos" (denominador cero), que no es lo mismo que 0. */
export function formatoValor(valor: number | null, unidad: 'min' | '%'): string {
  if (valor === null || valor === undefined) {
    return 'Sin datos';
  }
  return unidad === 'min' ? `${valor.toFixed(1)} min` : `${valor.toFixed(1)} %`;
}

export function formatoDiferencia(valor: number | null, unidad: 'min' | '%'): string {
  if (valor === null || valor === undefined) {
    return '—';
  }
  const signo = valor > 0 ? '+' : valor < 0 ? '−' : '';
  const sufijo = unidad === 'min' ? ' min' : ' pp';
  return `${signo}${Math.abs(valor).toFixed(1)}${sufijo}`;
}

/**
 * true si la variacion va en el sentido de la hipotesis (bajar TPR/TNS,
 * subir NCA); null si no hay con que comparar.
 */
export function esMejora(diferencia: number | null, sentido: SentidoMejora): boolean | null {
  if (diferencia === null || diferencia === undefined || diferencia === 0) {
    return null;
  }
  return sentido === 'bajar' ? diferencia < 0 : diferencia > 0;
}

export interface LecturaWilcoxon {
  texto: string;
  tono: 'exito' | 'alerta' | 'neutro';
  advertencia: string | null;
}

/** Por debajo de este n la aproximacion normal (p asintotica) es poco fiable. */
const N_MINIMO_ASINTOTICO = 10;

/**
 * Lectura en lenguaje llano de la prueba, con la p asintotica bilateral que
 * SPSS muestra por defecto y alfa = 0,05. La direccion sale de cual total de
 * rangos domina: negativos (post < pre) para TPR/TNS, positivos para NCA.
 */
export function lecturaWilcoxon(w: ResultadoWilcoxon, sentido: SentidoMejora): LecturaWilcoxon {
  if (w.pares === 0 || w.pAsintotica === null) {
    return { texto: 'Sin pares completos todavía', tono: 'neutro', advertencia: null };
  }
  if (w.n === 0) {
    return { texto: 'Sin cambios entre fases (todas las diferencias son cero)', tono: 'neutro', advertencia: null };
  }
  const advertencia =
    w.n < N_MINIMO_ASINTOTICO ? `Con n = ${w.n} la p asintótica es poco fiable: tome como referencia la p exacta.` : null;
  if (w.pAsintotica >= 0.05) {
    return { texto: 'Sin diferencia significativa (p ≥ 0,05)', tono: 'neutro', advertencia };
  }
  const bajo = (w.sumaRangosNegativos ?? 0) > (w.sumaRangosPositivos ?? 0);
  const enSentido = sentido === 'bajar' ? bajo : !bajo;
  return enSentido
    ? { texto: 'Diferencia significativa en el sentido de la hipótesis', tono: 'exito', advertencia }
    : { texto: 'Diferencia significativa en sentido contrario a la hipótesis', tono: 'alerta', advertencia };
}

/** p con tres decimales al estilo de SPSS (",000" se muestra como "< 0,001"). */
export function formatoP(p: number | null): string {
  if (p === null || p === undefined) {
    return '—';
  }
  return p < 0.001 ? '< 0.001' : p.toFixed(3);
}

export function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
