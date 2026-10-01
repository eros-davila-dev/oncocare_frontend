import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Pagina } from '../../core/models/pagina.model';
import { CrearUsuarioRequest, Especialidad, Rol, UsuarioResumen } from '../../core/models/usuario.model';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../shared/constants/paginacion';

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/usuarios`;

  listar(page: number, size = TAMANO_PAGINA_POR_DEFECTO): Observable<Pagina<UsuarioResumen>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Pagina<UsuarioResumen>>(this.baseUrl, { params });
  }

  medicosPorEspecialidad(especialidad: Especialidad): Observable<UsuarioResumen[]> {
    const params = new HttpParams().set('especialidad', especialidad);
    return this.http.get<UsuarioResumen[]>(`${this.baseUrl}/medicos`, { params });
  }

  crear(datos: CrearUsuarioRequest): Observable<UsuarioResumen> {
    return this.http.post<UsuarioResumen>(this.baseUrl, datos);
  }

  cambiarRol(id: number, rol: Rol): Observable<UsuarioResumen> {
    return this.http.put<UsuarioResumen>(`${this.baseUrl}/${id}/rol`, { rol });
  }
}
