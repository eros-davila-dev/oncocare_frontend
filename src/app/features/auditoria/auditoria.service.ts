import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditoriaAccion } from '../../core/models/auditoria.model';
import { Pagina } from '../../core/models/pagina.model';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../shared/constants/paginacion';

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/auditoria`;

  buscar(filtros: { usuarioId?: number; entidadAfectada?: string; page?: number; size?: number }): Observable<Pagina<AuditoriaAccion>> {
    let params = new HttpParams()
      .set('page', filtros.page ?? 0)
      .set('size', filtros.size ?? TAMANO_PAGINA_POR_DEFECTO);

    if (filtros.usuarioId) {
      params = params.set('usuarioId', filtros.usuarioId);
    }
    if (filtros.entidadAfectada) {
      params = params.set('entidadAfectada', filtros.entidadAfectada);
    }

    return this.http.get<Pagina<AuditoriaAccion>>(this.baseUrl, { params });
  }
}
