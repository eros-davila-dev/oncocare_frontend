import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EstadoVinculacionTelegram {
  vinculado: boolean;
  vinculadoEn: string | null;
  /** false si el servidor aun no tiene configurado el bot (TELEGRAM_BOT_USERNAME). */
  telegramDisponible: boolean;
  /** Telegram del referido (acompanante), que recibe copia de los recordatorios. */
  referidoVinculado?: boolean;
  referidoVinculadoEn?: string | null;
  /** El paciente autorizo que su referido reciba los recordatorios. */
  referidoAutorizado?: boolean;
  referidoNombre?: string | null;
  /** Enlace generico del bot (el mismo para todos): el QR comun. */
  enlaceBot?: string | null;
}

export interface EnlaceVinculacionTelegram {
  enlace: string;
  expiraEn: string;
  yaVinculado: boolean;
}

export interface BotTelegram {
  disponible: boolean;
  usuario: string | null;
  enlace: string | null;
}

/**
 * Vinculacion de Telegram para recibir recordatorios de cita (TNS) y escribir
 * al bot (NCA). Dos caminos: el enlace personal (portal o recepcion) y el QR
 * comun del bot con "Compartir mi numero", que tambien usa el acompanante.
 * Sin pacienteId opera sobre el paciente autenticado (portal).
 */
@Injectable({ providedIn: 'root' })
export class TelegramService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/telegram`;

  estado(pacienteId?: number | null): Observable<EstadoVinculacionTelegram> {
    return this.http.get<EstadoVinculacionTelegram>(`${this.base}/estado`, { params: this.params(pacienteId) });
  }

  /** Publico: el bot para el QR comun y la guia imprimible. */
  bot(): Observable<BotTelegram> {
    return this.http.get<BotTelegram>(`${this.base}/bot`);
  }

  generarEnlace(pacienteId?: number | null): Observable<EnlaceVinculacionTelegram> {
    return this.http.post<EnlaceVinculacionTelegram>(`${this.base}/enlace`, {}, { params: this.params(pacienteId) });
  }

  desvincular(pacienteId?: number | null): Observable<void> {
    return this.http.delete<void>(`${this.base}/vinculo`, { params: this.params(pacienteId) });
  }

  desvincularReferido(pacienteId?: number | null): Observable<void> {
    return this.http.delete<void>(`${this.base}/vinculo-referido`, { params: this.params(pacienteId) });
  }

  private params(pacienteId?: number | null): HttpParams {
    return pacienteId ? new HttpParams().set('pacienteId', pacienteId) : new HttpParams();
  }
}
