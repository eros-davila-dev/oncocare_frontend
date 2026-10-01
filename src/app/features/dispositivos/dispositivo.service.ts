import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Dispositivo, DispositivoRequest, LecturaDispositivo } from '../../core/models/dispositivo.model';

@Injectable({ providedIn: 'root' })
export class DispositivoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dispositivos`;

  listar(): Observable<Dispositivo[]> {
    return this.http.get<Dispositivo[]>(this.baseUrl);
  }

  registrar(datos: DispositivoRequest): Observable<Dispositivo> {
    return this.http.post<Dispositivo>(this.baseUrl, datos);
  }

  lecturasPorPaciente(pacienteId: number): Observable<LecturaDispositivo[]> {
    return this.http.get<LecturaDispositivo[]>(`${this.baseUrl}/lecturas/paciente/${pacienteId}`);
  }
}
