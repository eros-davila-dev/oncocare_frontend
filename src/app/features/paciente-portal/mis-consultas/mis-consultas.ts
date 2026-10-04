import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HistorialConsultasComponent } from '../../consultas/historial-consultas/historial-consultas';

/**
 * "Mis consultas": lo que el paciente pregunto al asistente virtual (portal
 * o Telegram) y lo que se le respondio, de la mas reciente a la mas antigua.
 */
@Component({
  selector: 'app-mis-consultas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HistorialConsultasComponent],
  template: `
    <header>
      <p class="font-semibold text-primary">Portal del paciente</p>
      <h1 class="mt-1 font-display text-3xl font-extrabold tracking-tight">Mis consultas</h1>
      <p class="mt-2 text-muted-foreground">
        Tus preguntas al asistente virtual y sus respuestas. Toca una consulta para ver la conversación.
      </p>
    </header>
    <app-historial-consultas class="mt-6" modo="paciente" />
  `,
})
export class MisConsultasComponent {}
