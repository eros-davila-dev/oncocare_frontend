import { IndicadoresTesis } from '../../core/models/estudio.model';

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
    formula: 'TPR = Σ TRC / NCR',
    valor: (i) => i.tiempoPromedioRegistroMinutos,
    base: (i) => `${i.registros} ${i.registros === 1 ? 'registro' : 'registros'}`,
  },
  {
    clave: 'tns',
    sigla: 'TNS',
    nombre: 'Tasa de ausentismo',
    hipotesis: 'H2: el sistema disminuye el ausentismo',
    unidad: '%',
    sentido: 'bajar',
    formula: 'TNS = NI / (NI + NCC) × 100',
    valor: (i) => i.tasaAusentismo,
    base: (i) => `${i.inasistencias} de ${i.citasConDesenlace} citas con desenlace`,
  },
  {
    clave: 'nca',
    sigla: 'NCA',
    nombre: 'Nivel de consultas atendidas',
    hipotesis: 'H3: el sistema mejora la atencion de consultas',
    unidad: '%',
    sentido: 'subir',
    formula: 'NCA = CA / TCR × 100',
    valor: (i) => i.nivelConsultasAtendidas,
    base: (i) => `${i.consultasResueltas} de ${i.consultasCerradas} consultas (${i.consultasResueltasBot} por el chatbot)`,
  },
];

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
