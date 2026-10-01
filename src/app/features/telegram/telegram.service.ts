import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EstadoVinculacionTelegram {
  vinculado: boolean;
  vinculadoEn: string | null;
  /** false si el servidor aun no tiene configurado el bot (TELEGRAM_BOT_USERNAME). */
  telegramDisponible: boolean;
}

export interface EnlaceVinculacionTelegram {
  enlace: string;
  expiraEn: string;
  yaVinculado: boolean;
}

/**
 * Vinculacion del chat de Telegram del paciente: lo que permite enviarle
 * recordatorios de cita (TNS) y reconocerlo cuando escribe al bot (NCA).
 * Sin pacienteId opera sobre el paciente autenticado (portal).
 */
@Injectable({ providedIn: 'root' })
export class TelegramService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/telegram`;

  estado(pacienteId?: number | null): Observable<EstadoVinculacionTelegram> {
    return this.http.get<EstadoVinculacionTelegram>(`${this.base}/estado`, { params: this.params(pacienteId) });
  }

  generarEnlace(pacienteId?: number | null): Observable<EnlaceVinculacionTelegram> {
    return this.http.post<EnlaceVinculacionTelegram>(`${this.base}/enlace`, {}, { params: this.params(pacienteId) });
  }

  desvincular(pacienteId?: number | null): Observable<void> {
    return this.http.delete<void>(`${this.base}/vinculo`, { params: this.params(pacienteId) });
  }

  private params(pacienteId?: number | null): HttpParams {
    return pacienteId ? new HttpParams().set('pacienteId', pacienteId) : new HttpParams();
  }
}
