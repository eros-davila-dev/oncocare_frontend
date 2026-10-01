import { Pipe, PipeTransform } from '@angular/core';
import { ColorBadge } from '../ui/badge/badge';

const COLORES_POR_ESTADO: Record<string, ColorBadge> = {
  PROGRAMADA: 'info',
  PROGRAMADO: 'info',
  CONFIRMADA: 'brand',
  ATENDIDA: 'success',
  REALIZADO: 'success',
  CANCELADA: 'danger',
  CANCELADO: 'danger',
  NO_ASISTIO: 'danger',
  SUSPENDIDO: 'danger',
  PENDIENTE: 'warning',
  EN_TRATAMIENTO: 'success',
  FINALIZADO: 'lavender',
};

/**
 * Traduce EstadoCita / EstadoCicloTratamiento a un color de badge consistente
 * en toda la app (seccion 7: shared/ui/badge, "color por EstadoCita o
 * TipoTratamiento").
 */
@Pipe({ name: 'estadoColor' })
export class EstadoColorPipe implements PipeTransform {
  transform(estado: string): ColorBadge {
    return COLORES_POR_ESTADO[estado] ?? 'neutral';
  }
}
