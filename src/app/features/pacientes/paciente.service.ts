import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Pagina } from '../../core/models/pagina.model';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../shared/constants/paginacion';
import {
  EstadisticasPacientes,
  EstadoTratamientoPaciente,
  Paciente,
  PacienteRequest,
  PacienteResumen,
} from '../../core/models/paciente.model';

@Injectable({ providedIn: 'root' })
export class PacienteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/pacientes`;

  buscar(texto: string, page: number, size = TAMANO_PAGINA_POR_DEFECTO): Observable<Pagina<Paciente>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (texto) {
      params = params.set('texto', texto);
    }
    return this.http.get<Pagina<Paciente>>(this.baseUrl, { params });
  }

  porId(id: number): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.baseUrl}/${id}`);
  }

  /** Portal de autoservicio (seccion 7): el propio paciente autenticado. */
  miPerfil(): Observable<Paciente> {
    return this.http.get<Paciente>(`${this.baseUrl}/mi-perfil`);
  }

  completarPerfil(datos: PacienteRequest): Observable<Paciente> {
    return this.http.post<Paciente>(`${this.baseUrl}/mi-perfil`, datos);
  }

  registrar(datos: PacienteRequest): Observable<Paciente> {
    return this.http.post<Paciente>(this.baseUrl, datos);
  }

  actualizar(id: number, datos: PacienteRequest): Observable<Paciente> {
    return this.http.put<Paciente>(`${this.baseUrl}/${id}`, datos);
  }

  documentoDisponible(documento: string, idExcluido?: number): Observable<{ disponible: boolean }> {
    let params = new HttpParams().set('documento', documento);
    if (idExcluido) {
      params = params.set('idExcluido', idExcluido);
    }
    return this.http.get<{ disponible: boolean }>(`${this.baseUrl}/documento-disponible`, { params });
  }

  buscarResumen(
    texto: string,
    estado: EstadoTratamientoPaciente | null,
    page: number,
    size = TAMANO_PAGINA_POR_DEFECTO,
  ): Observable<Pagina<PacienteResumen>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (texto) {
      params = params.set('texto', texto);
    }
    if (estado) {
      params = params.set('estado', estado);
    }
    return this.http.get<Pagina<PacienteResumen>>(`${this.baseUrl}/resumen`, { params });
  }

  estadisticas(): Observable<EstadisticasPacientes> {
    return this.http.get<EstadisticasPacientes>(`${this.baseUrl}/estadisticas`);
  }
}
