import { Pipe, PipeTransform } from '@angular/core';

/**
 * Convierte valores de enum del backend (ej. NO_ASISTIO, CUIDADOS_PALIATIVOS)
 * a una etiqueta legible en español (ej. "No asistio"). Exportada como
 * funcion plana ademas de pipe para poder usarse dentro de ColumnaTabla.valor
 * (una funcion de TypeScript, no un contexto de plantilla donde aplicar pipes).
 */
export function formatoEtiquetaEnum(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }
  const texto = valor.toLowerCase().replaceAll('_', ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

@Pipe({ name: 'etiquetaEnum' })
export class EtiquetaEnumPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatoEtiquetaEnum(valor);
  }
}
