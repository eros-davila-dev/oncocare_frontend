import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PreguntaPublica {
  id: number;
  pregunta: string;
  respuesta: string;
  categoria: string;
}

/**
 * Preguntas frecuentes oficiales (las mismas que usa el asistente virtual).
 * Lectura publica: no requiere sesion.
 */
@Injectable({ providedIn: 'root' })
export class PreguntasFrecuentesPublicasService {
  private readonly http = inject(HttpClient);

  listar(): Observable<PreguntaPublica[]> {
    return this.http
      .get<PreguntaPublica[]>(`${environment.apiUrl}/preguntas-frecuentes`)
      .pipe(catchError(() => of<PreguntaPublica[]>([])));
  }
}
