import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { IniciarMedicionResponse, TipoMedicion } from '../models/estudio.model';

/**
 * Indicador TPR (tiempo promedio de registro): al mostrar un formulario de
 * registro se abre una sesion de medicion en el servidor, que sella el
 * inicio; al guardar, el formulario reenvia el medicionId y el servidor sella
 * el fin. El navegador nunca calcula ni envia una duracion.
 *
 * Si abrir la sesion falla, devuelve null: el registro del paciente o la cita
 * se guarda igual (solo ese dato no cuenta para el indicador).
 */
@Injectable({ providedIn: 'root' })
export class MedicionRegistroService {
  private readonly http = inject(HttpClient);

  iniciar(tipo: TipoMedicion): Observable<number | null> {
    return this.http
      .post<IniciarMedicionResponse>(`${environment.apiUrl}/mediciones/registro`, { tipo })
      .pipe(
        map((respuesta) => respuesta.medicionId),
        catchError(() => of(null)),
      );
  }
}
