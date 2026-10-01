import { InjectionToken } from '@angular/core';

/**
 * El mismo codigo se compila como dos aplicaciones independientes:
 * - portal: pagina publica + autoservicio del paciente (mobile-first).
 * - intranet: herramientas del personal de la fundacion.
 * Cada una provee su audiencia para que la autenticacion lleve a cada
 * cuenta a la aplicacion que le corresponde.
 */
export type Audiencia = 'portal' | 'intranet';

export const AUDIENCIA = new InjectionToken<Audiencia>('AUDIENCIA');
