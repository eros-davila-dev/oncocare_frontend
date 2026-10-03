import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** INTRANET = guardado aqui; ENTORNO = variables del servidor; SIN_CONFIGURAR = el chatbot no puede responder. */
export type OrigenConfiguracionGemini = 'INTRANET' | 'ENTORNO' | 'SIN_CONFIGURAR';

export interface EstadoModeloGemini {
  modelo: string;
  disponible: boolean;
  /** Hasta cuando el chatbot no lo usa (cuota agotada, saturado o inexistente). */
  apartadoHasta: string | null;
  motivo: string | null;
}

export interface ConfiguracionGemini {
  origenClave: OrigenConfiguracionGemini;
  /** Solo los ultimos 4 caracteres: la clave completa nunca vuelve al navegador. */
  claveEnmascarada: string | null;
  claveGuardadaIlegible: boolean;
  origenModelos: OrigenConfiguracionGemini;
  modelos: EstadoModeloGemini[];
  actualizadoPor: number | null;
  actualizadoEn: string | null;
}

export interface ActualizarConfiguracionGemini {
  /** null o vacia = conservar la clave actual. */
  apiKey: string | null;
  eliminarClave: boolean;
  modelos: string[];
}

export interface ModeloGeminiDisponible {
  id: string;
  nombre: string;
  descripcion: string | null;
}

export interface ResultadoPruebaGemini {
  exitoso: boolean;
  modelo: string;
  milisegundos: number;
  mensaje: string;
}

/**
 * Configuracion del asistente (solo ADMIN). Listar modelos y probar son POST
 * para que la clave viaje en el cuerpo y no en la URL.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionGeminiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/configuracion/gemini`;

  obtener(): Observable<ConfiguracionGemini> {
    return this.http.get<ConfiguracionGemini>(this.base);
  }

  actualizar(cambios: ActualizarConfiguracionGemini): Observable<ConfiguracionGemini> {
    return this.http.put<ConfiguracionGemini>(this.base, cambios);
  }

  /** apiKey null = la clave vigente. */
  modelosDisponibles(apiKey: string | null): Observable<ModeloGeminiDisponible[]> {
    return this.http.post<ModeloGeminiDisponible[]>(`${this.base}/modelos-disponibles`, { apiKey });
  }

  probar(apiKey: string | null, modelo: string): Observable<ResultadoPruebaGemini> {
    return this.http.post<ResultadoPruebaGemini>(`${this.base}/probar`, { apiKey, modelo });
  }
}
