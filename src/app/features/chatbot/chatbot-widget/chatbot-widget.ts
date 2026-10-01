import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface MensajeChat {
  autor: 'usuario' | 'bot';
  texto: string;
}

interface RespuestaChatbot {
  respuesta: string;
}

/**
 * Widget de chat embebido (seccion 13): habla contra el backend propio
 * (POST /chatbot/mensaje), nunca directo con Gemini ni con n8n. El backend es
 * quien decide que intents ejecutar y con que datos reales; este componente
 * solo envia el texto y el id de sesion (para que el backend arme el
 * historial de la conversacion) y muestra la respuesta.
 *
 * Si hay una sesion iniciada, el interceptor JWT ya adjunta el token de
 * acceso automaticamente (esta ruta no esta en su lista de exclusion), asi
 * que el backend puede personalizar la respuesta y autorizar acciones sobre
 * las citas propias del paciente sin que este widget necesite saberlo.
 */
@Component({
  selector: 'app-chatbot-widget',
  imports: [FormsModule],
  templateUrl: './chatbot-widget.html',
})
export class ChatbotWidgetComponent {
  private readonly http = inject(HttpClient);
  private readonly sesionId = crypto.randomUUID();

  protected readonly abierto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly mensajeActual = signal('');
  protected readonly mensajes = signal<MensajeChat[]>([
    { autor: 'bot', texto: 'Hola, soy el asistente virtual de la Fundacion Three Partners. ¿En que puedo ayudarte?' },
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
    this.enviando.set(true);

    this.http
      .post<RespuestaChatbot>(`${environment.apiUrl}/chatbot/mensaje`, { sesionId: this.sesionId, mensaje: texto })
      .pipe(
        catchError(() =>
          of<RespuestaChatbot>({ respuesta: 'No pude conectarme con el asistente. Intenta nuevamente en unos minutos.' }),
        ),
      )
      .subscribe((respuesta) => {
        this.mensajes.update((actual) => [...actual, { autor: 'bot', texto: respuesta.respuesta }]);
        this.enviando.set(false);
      });
  }
}
