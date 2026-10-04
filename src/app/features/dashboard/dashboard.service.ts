import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActividadDetalle, ActividadResumen, IndicadoresDashboard } from '../../core/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);

  indicadores(desde?: string, hasta?: string): Observable<IndicadoresDashboard> {
    const params: Record<string, string> = {};
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return this.http.get<IndicadoresDashboard>(`${environment.apiUrl}/dashboard/indicadores`, { params });
  }

  actividad(desde: string, hasta: string): Observable<ActividadResumen> {
    return this.http.get<ActividadResumen>(`${environment.apiUrl}/dashboard/actividad`, { params: { desde, hasta } });
  }

  actividadDetalle(desde: string, hasta: string): Observable<ActividadDetalle> {
    return this.http.get<ActividadDetalle>(`${environment.apiUrl}/dashboard/actividad/detalle`, { params: { desde, hasta } });
  }

  exportarActividad(desde: string, hasta: string): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/dashboard/actividad/exportar.xlsx`, {
      params: { desde, hasta },
      responseType: 'blob',
    });
  }
}
