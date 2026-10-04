import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Consulta } from '../../core/models/estudio.model';
import { Pagina } from '../../core/models/pagina.model';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../shared/constants/paginacion';

export interface TurnoConversacion {
  fecha: string;
  mensajeUsuario: string;
  respuestaBot: string | null;
  intencion: string | null;
}

/** Una consulta del historial ("Mis consultas" y ficha del paciente). */
export interface HistorialConsulta {
  id: number;
  abiertaEn: string;
  cerradaEn: string | null;
  canal: string;
  categoria: string | null;
  resultado: string | null;
  derivada: boolean;
  resumen: string | null;
  turnos: number;
}

export interface PreguntaFrecuente {
  id: number | null;
  pregunta: string;
  respuesta: string;
  categoria: string;
  orden: number;
  activa: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConsultaService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/consultas`;
  private readonly basePreguntas = `${environment.apiUrl}/preguntas-frecuentes`;

  /** Consultas que el chatbot escalo al personal (las mas antiguas primero). */
  bandeja(page = 0): Observable<Pagina<Consulta>> {
    return this.http.get<Pagina<Consulta>>(`${this.base}/bandeja`, {
      params: { page, size: TAMANO_PAGINA_POR_DEFECTO },
    });
  }

  conversacion(id: number): Observable<TurnoConversacion[]> {
    return this.http.get<TurnoConversacion[]>(`${this.base}/${id}/conversacion`);
  }

  /** Consultas del paciente autenticado (portal). */
  misConsultas(page = 0): Observable<Pagina<HistorialConsulta>> {
    return this.http.get<Pagina<HistorialConsulta>>(`${this.base}/mias`, { params: { page, size: 10 } });
  }

  miConversacion(id: number): Observable<TurnoConversacion[]> {
    return this.http.get<TurnoConversacion[]>(`${this.base}/mias/${id}/conversacion`);
  }

  /** Historial de un paciente (ficha en la intranet). */
  dePaciente(pacienteId: number, page = 0): Observable<Pagina<HistorialConsulta>> {
    return this.http.get<Pagina<HistorialConsulta>>(`${this.base}/paciente/${pacienteId}`, { params: { page, size: 10 } });
  }

  resolver(id: number, resuelta: boolean, nota: string | null): Observable<Consulta> {
    return this.http.patch<Consulta>(`${this.base}/${id}/resolver`, { resuelta, nota });
  }

  preguntasFrecuentes(): Observable<PreguntaFrecuente[]> {
    return this.http.get<PreguntaFrecuente[]>(`${this.basePreguntas}/todas`);
  }

  guardarPregunta(pregunta: PreguntaFrecuente): Observable<PreguntaFrecuente> {
    return pregunta.id
      ? this.http.put<PreguntaFrecuente>(`${this.basePreguntas}/${pregunta.id}`, pregunta)
      : this.http.post<PreguntaFrecuente>(this.basePreguntas, pregunta);
  }
}
