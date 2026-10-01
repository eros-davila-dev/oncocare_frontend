import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Pagina } from '../../core/models/pagina.model';
import { CicloTratamiento, CicloTratamientoRequest, EstadoCicloTratamiento } from '../../core/models/tratamiento.model';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../shared/constants/paginacion';

@Injectable({ providedIn: 'root' })
export class TratamientoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/tratamientos`;

  listar(pacienteId: number | undefined, page: number, size = TAMANO_PAGINA_POR_DEFECTO): Observable<Pagina<CicloTratamiento>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (pacienteId) {
      params = params.set('pacienteId', pacienteId);
    }
    return this.http.get<Pagina<CicloTratamiento>>(this.baseUrl, { params });
  }

  porPaciente(pacienteId: number): Observable<CicloTratamiento[]> {
    return this.http.get<CicloTratamiento[]>(`${this.baseUrl}/paciente/${pacienteId}`);
  }

  programar(datos: CicloTratamientoRequest): Observable<CicloTratamiento> {
    return this.http.post<CicloTratamiento>(this.baseUrl, datos);
  }

  actualizarEstado(id: number, estado: EstadoCicloTratamiento, observaciones?: string): Observable<CicloTratamiento> {
    return this.http.patch<CicloTratamiento>(`${this.baseUrl}/${id}/estado`, { estado, observaciones });
  }
}
