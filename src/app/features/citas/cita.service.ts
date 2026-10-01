import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cita, CitaRequest, EstadoCita, ReprogramarCitaRequest } from '../../core/models/cita.model';
import { Pagina } from '../../core/models/pagina.model';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../shared/constants/paginacion';

@Injectable({ providedIn: 'root' })
export class CitaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/citas`;

  listar(filtros: {
    pacienteId?: number;
    medicoId?: number;
    desde?: string;
    hasta?: string;
    estado?: EstadoCita;
    page?: number;
    size?: number;
  }): Observable<Pagina<Cita>> {
    let params = new HttpParams()
      .set('page', filtros.page ?? 0)
      .set('size', filtros.size ?? TAMANO_PAGINA_POR_DEFECTO);

    for (const [clave, valor] of Object.entries(filtros)) {
      if (valor !== undefined && clave !== 'page' && clave !== 'size') {
        params = params.set(clave, String(valor));
      }
    }

    return this.http.get<Pagina<Cita>>(this.baseUrl, { params });
  }

  porId(id: number): Observable<Cita> {
    return this.http.get<Cita>(`${this.baseUrl}/${id}`);
  }

  /** Citas del paciente autenticado (seccion 12), no de un id arbitrario. */
  misCitas(filtros: { estado?: EstadoCita; page?: number; size?: number }): Observable<Pagina<Cita>> {
    let params = new HttpParams()
      .set('page', filtros.page ?? 0)
      .set('size', filtros.size ?? TAMANO_PAGINA_POR_DEFECTO);
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<Pagina<Cita>>(`${this.baseUrl}/mias`, { params });
  }

  agendar(datos: CitaRequest): Observable<Cita> {
    return this.http.post<Cita>(this.baseUrl, datos);
  }

  reprogramar(id: number, datos: ReprogramarCitaRequest): Observable<Cita> {
    return this.http.patch<Cita>(`${this.baseUrl}/${id}/reprogramar`, datos);
  }

  cancelar(id: number, motivo: string): Observable<Cita> {
    return this.http.patch<Cita>(`${this.baseUrl}/${id}/cancelar`, { motivo });
  }

  confirmar(id: number): Observable<Cita> {
    return this.http.patch<Cita>(`${this.baseUrl}/${id}/confirmar`, {});
  }

  marcarAtendida(id: number): Observable<Cita> {
    return this.http.patch<Cita>(`${this.baseUrl}/${id}/atender`, {});
  }

  marcarNoAsistio(id: number): Observable<Cita> {
    return this.http.patch<Cita>(`${this.baseUrl}/${id}/no-asistio`, {});
  }
}
