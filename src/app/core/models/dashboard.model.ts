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
