import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActividadDetalle, ActividadResumen, IndicadoresDashboard } from '../../core/models/dashboard.model';

export type FuenteActividad = 'LOCAL' | 'SERVIDOR';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  indicadores(desde?: string, hasta?: string): Observable<IndicadoresDashboard> {
    const params: Record<string, string> = {};
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return this.http.get<IndicadoresDashboard>(`${environment.apiUrl}/dashboard/indicadores`, { params });
  }

  /** fuente: LOCAL = lo que mide esta instalacion; SERVIDOR = eventos importados del servidor de la fundacion. */
  actividad(desde: string, hasta: string, fuente: FuenteActividad = 'LOCAL'): Observable<ActividadResumen> {
    return this.http.get<ActividadResumen>(`${environment.apiUrl}/dashboard/actividad`, { params: { desde, hasta, fuente } });
  }

  actividadDetalle(desde: string, hasta: string, fuente: FuenteActividad = 'LOCAL'): Observable<ActividadDetalle> {
    return this.http.get<ActividadDetalle>(`${environment.apiUrl}/dashboard/actividad/detalle`, { params: { desde, hasta, fuente } });
  }

  /** Pacientes de demostracion activos (0 = no hay datos de demostracion). */
  datosDemo(): Observable<{ pacientes: number }> {
    return this.http.get<{ pacientes: number }>(`${environment.apiUrl}/dashboard/datos-demo`);
  }

  exportarActividad(desde: string, hasta: string, fuente: FuenteActividad = 'LOCAL'): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/dashboard/actividad/exportar.xlsx`, {
      params: { desde, hasta, fuente },
      responseType: 'blob',
    });
  }
}
