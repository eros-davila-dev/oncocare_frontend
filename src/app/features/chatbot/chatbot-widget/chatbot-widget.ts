import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ResultadoConsulta } from '../../../core/models/estudio.model';
import { IconComponent } from '../../../shared/ui/icon/icon';

interface MensajeChat {
  autor: 'usuario' | 'bot';
  texto: string;
  consultaId?: number | null;
  /** Solo las respuestas que resolvieron la consulta se pueden valorar. */
  valorable?: boolean;
  valoracion?: 1 | -1;
}

interface RespuestaChatbot {
  respuesta: string;
  consultaId: number | null;
  estadoConsulta: ResultadoConsulta | null;
}

const CLAVE_SESION = 'onco.chatbot.sesion';

/**
 * Widget de chat embebido (seccion 13): habla contra el backend propio
 * (POST /chatbot/mensaje), nunca directo con Gemini ni con n8n. El backend es
 * quien decide que intents ejecutar y con que datos reales.
 *
 * Cada respuesta llega asociada a una consulta (indicador NCA). El usuario
 * puede valorarla (👎 la pasa al personal) o pedir una persona en cualquier
 * momento: asi el sistema distingue "el bot lo resolvio" de "el bot
 * respondio algo".
 *
 * Si hay una sesion iniciada, el interceptor JWT adjunta el token y el
 * backend puede gestionar las citas propias del paciente.
 */
@Component({
  selector: 'app-chatbot-widget',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  templateUrl: './chatbot-widget.html',
})
export class ChatbotWidgetComponent {
  private readonly http = inject(HttpClient);
  private readonly sesionId = this.recuperarSesion();

  protected readonly abierto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly mensajeActual = signal('');
  protected readonly mensajes = signal<MensajeChat[]>([
    { autor: 'bot', texto: 'Hola, soy el asistente virtual de la fundación. ¿En qué puedo ayudarte?' },
  ]);

  protected alternar(): void {
    this.abierto.update((valor) => !valor);
  }

  protected enviar(): void {
    const texto = this.mensajeActual().trim();
    if (!texto || this.enviando()) {
      return;
    }
    this.mensajes.update((actual) => [...actual, { autor: 'usuario', texto }]);
    this.mensajeActual.set('');
    this.conversar(
      this.http.post<RespuestaChatbot>(`${environment.apiUrl}/chatbot/mensaje`, { sesionId: this.sesionId, mensaje: texto }),
    );
  }

  protected valorar(indice: number, valor: 1 | -1): void {
    const mensaje = this.mensajes()[indice];
    if (!mensaje?.consultaId || mensaje.valoracion) {
      return;
    }
    this.mensajes.update((actual) => actual.map((m, i) => (i === indice ? { ...m, valoracion: valor } : m)));
    this.conversar(
      this.http.post<RespuestaChatbot>(`${environment.apiUrl}/chatbot/consultas/${mensaje.consultaId}/valoracion`, {
        sesionId: this.sesionId,
        valor,
      }),
      false,
    );
  }

  protected hablarConUnaPersona(): void {
    if (this.enviando()) {
      return;
    }
    this.mensajes.update((actual) => [...actual, { autor: 'usuario', texto: 'Quiero hablar con una persona' }]);
    this.conversar(this.http.post<RespuestaChatbot>(`${environment.apiUrl}/chatbot/escalar`, { sesionId: this.sesionId }), false);
  }

  private conversar(peticion: Observable<RespuestaChatbot>, valorable = true): void {
    this.enviando.set(true);
    peticion
      .pipe(
        catchError(() =>
          of<RespuestaChatbot>({
            respuesta: 'No pude conectarme con el asistente. Intenta nuevamente en unos minutos.',
            consultaId: null,
            estadoConsulta: null,
          }),
        ),
      )
      .subscribe((respuesta) => {
        this.mensajes.update((actual) => [
          ...actual,
          {
            autor: 'bot',
            texto: respuesta.respuesta,
            consultaId: respuesta.consultaId,
            valorable: valorable && respuesta.estadoConsulta === 'RESUELTA_BOT',
          },
        ]);
        this.enviando.set(false);
      });
  }

  /**
   * La sesion se conserva mientras la pestana este abierta, para que el
   * backend mantenga el contexto si el paciente recarga la pagina.
   */
  private recuperarSesion(): string {
    try {
      const guardada = sessionStorage.getItem(CLAVE_SESION);
      if (guardada) {
        return guardada;
      }
      const nueva = crypto.randomUUID();
      sessionStorage.setItem(CLAVE_SESION, nueva);
      return nueva;
    } catch {
      return crypto.randomUUID();
    }
  }
}
