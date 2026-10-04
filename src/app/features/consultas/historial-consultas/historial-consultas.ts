import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { ConsultaService, HistorialConsulta, TurnoConversacion } from '../consulta.service';
import { BadgeComponent, type ColorBadge } from '../../../shared/ui/badge/badge';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { formatoEtiquetaEnum } from '../../../shared/pipes/etiqueta-enum.pipe';

const CANALES: Record<string, string> = {
  CHATBOT_WEB: 'Portal web',
  TELEGRAM: 'Telegram',
  WHATSAPP: 'WhatsApp',
  LLAMADA: 'Llamada',
  PRESENCIAL: 'Presencial',
};

const ESTADOS: Record<string, { texto: string; color: ColorBadge }> = {
  ABIERTA: { texto: 'En curso', color: 'info' },
  ESCALADA: { texto: 'Con el equipo', color: 'warning' },
  RESUELTA_BOT: { texto: 'Respondida por el asistente', color: 'success' },
  RESUELTA_PERSONAL: { texto: 'Atendida por el equipo', color: 'success' },
  NO_RESUELTA: { texto: 'Sin resolver', color: 'neutral' },
};

/**
 * Historial de consultas con su conversacion (lo que escribio el paciente y
 * lo que respondio el asistente). Se usa en "Mis consultas" del portal
 * (modo paciente: solo las suyas) y en la ficha del paciente de la intranet
 * (modo personal, con el id del paciente).
 */
@Component({
  selector: 'app-historial-consultas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, IconComponent],
  host: { class: 'block' },
  template: `
    @if (cargando()) {
      <p class="text-sm text-muted-foreground">Cargando consultas...</p>
    } @else if (error()) {
      <p class="text-sm text-destructive">{{ error() }}</p>
    } @else if (consultas().length === 0) {
      <div class="rounded-2xl border border-dashed border-border p-8 text-center">
        <span class="mx-auto grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
          <ui-icon name="message-circle" [size]="22" />
        </span>
        <p class="mt-3 font-semibold">{{ modo() === 'paciente' ? 'Aún no tienes consultas' : 'Sin consultas registradas' }}</p>
        <p class="mt-1 text-sm text-muted-foreground">
          {{
            modo() === 'paciente'
              ? 'Cuando escribas al asistente virtual (en el portal o por Telegram) tus consultas aparecerán aquí.'
              : 'Las consultas del asistente virtual aparecen cuando el paciente escribe identificado.'
          }}
        </p>
      </div>
    } @else {
      <ul class="space-y-3">
        @for (c of consultas(); track c.id) {
          <li class="overflow-hidden rounded-2xl border border-border bg-card">
            <button
              type="button"
              class="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50"
              [attr.aria-expanded]="abierta() === c.id"
              (click)="alternar(c)"
            >
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <ui-icon [name]="c.canal === 'TELEGRAM' ? 'send' : 'message-circle'" [size]="18" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold">{{ c.categoria ? etiqueta(c.categoria) : 'Consulta' }}</span>
                  <ui-badge [color]="estado(c).color">{{ estado(c).texto }}</ui-badge>
                </span>
                @if (c.resumen) {
                  <span class="mt-1 block truncate text-sm text-muted-foreground">«{{ c.resumen }}»</span>
                }
                <span class="mt-1 block text-xs text-muted-foreground">
                  {{ fecha(c.abiertaEn) }} · {{ canal(c.canal) }} · {{ c.turnos }} {{ c.turnos === 1 ? 'mensaje' : 'mensajes' }}
                </span>
              </span>
              <ui-icon
                name="chevron-down"
                [size]="18"
                [clase]="'mt-2 shrink-0 text-muted-foreground transition-transform ' + (abierta() === c.id ? 'rotate-180' : '')"
              />
            </button>

            @if (abierta() === c.id) {
              <div class="border-t border-border bg-canvas/60 p-4">
                @if (cargandoConversacion()) {
                  <p class="text-sm text-muted-foreground">Cargando conversación...</p>
                } @else if (conversacion().length === 0) {
                  <p class="text-sm text-muted-foreground">
                    {{ modo() === 'paciente' ? 'Esta consulta pasó directo al equipo' : 'Sin mensajes del asistente' }} (se pidió hablar con una persona o se usó un botón del recordatorio).
                  </p>
                } @else {
                  <ol class="space-y-3">
                    @for (t of conversacion(); track $index) {
                      <li class="flex justify-end">
                        <div class="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                          <p class="whitespace-pre-line">{{ t.mensajeUsuario }}</p>
                          <p class="mt-1 text-right text-[11px] opacity-80">{{ modo() === 'paciente' ? 'Tú' : 'Paciente' }} · {{ hora(t.fecha) }}</p>
                        </div>
                      </li>
                      @if (t.respuestaBot) {
                        <li class="flex justify-start">
                          <div class="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-card px-3.5 py-2 text-sm">
                            <p class="whitespace-pre-line">{{ t.respuestaBot }}</p>
                            <p class="mt-1 text-[11px] text-muted-foreground">Asistente virtual</p>
                          </div>
                        </li>
                      }
                    }
                  </ol>
                }
                @if (c.resultado === 'ESCALADA') {
                  <p class="mt-3 flex items-center gap-2 text-sm text-warning">
                    <ui-icon name="info" [size]="16" />
                    {{ modo() === 'paciente' ? 'El equipo de la fundación revisará tu consulta y te contactará.' : 'Pendiente en la bandeja de consultas.' }}
                  </p>
                }
              </div>
            }
          </li>
        }
      </ul>

      @if (totalPaginas() > 1) {
        <div class="mt-4 flex items-center justify-between text-sm">
          <button type="button" class="rounded-lg px-3 py-2 font-semibold text-primary disabled:opacity-40" [disabled]="pagina() === 0" (click)="cargar(pagina() - 1)">
            Anteriores
          </button>
          <span class="text-muted-foreground">Página {{ pagina() + 1 }} de {{ totalPaginas() }}</span>
          <button
            type="button"
            class="rounded-lg px-3 py-2 font-semibold text-primary disabled:opacity-40"
            [disabled]="pagina() + 1 >= totalPaginas()"
            (click)="cargar(pagina() + 1)"
          >
            Siguientes
          </button>
        </div>
      }
    }
  `,
})
export class HistorialConsultasComponent {
  private readonly consultaService = inject(ConsultaService);

  readonly modo = input<'paciente' | 'personal'>('paciente');
  /** Solo en modo personal. */
  readonly pacienteId = input<number | null>(null);

  protected readonly etiqueta = formatoEtiquetaEnum;
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly consultas = signal<HistorialConsulta[]>([]);
  protected readonly pagina = signal(0);
  protected readonly totalPaginas = signal(0);
  protected readonly abierta = signal<number | null>(null);
  protected readonly cargandoConversacion = signal(false);
  protected readonly conversacion = signal<TurnoConversacion[]>([]);

  constructor() {
    effect(() => {
      // Recarga si cambia el paciente (la ficha se reutiliza entre pacientes).
      this.pacienteId();
      this.modo();
      this.abierta.set(null);
      this.cargar(0);
    });
  }

  protected cargar(pagina: number): void {
    const pacienteId = this.pacienteId();
    if (this.modo() === 'personal' && pacienteId === null) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    const peticion =
      this.modo() === 'paciente' ? this.consultaService.misConsultas(pagina) : this.consultaService.dePaciente(pacienteId!, pagina);
    peticion.subscribe({
      next: (p) => {
        this.consultas.set(p.content);
        this.pagina.set(p.pageNumber);
        this.totalPaginas.set(p.totalPages);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las consultas.');
        this.cargando.set(false);
      },
    });
  }

  protected alternar(c: HistorialConsulta): void {
    if (this.abierta() === c.id) {
      this.abierta.set(null);
      return;
    }
    this.abierta.set(c.id);
    this.conversacion.set([]);
    this.cargandoConversacion.set(true);
    const peticion = this.modo() === 'paciente' ? this.consultaService.miConversacion(c.id) : this.consultaService.conversacion(c.id);
    peticion.subscribe({
      next: (turnos) => {
        this.conversacion.set(turnos);
        this.cargandoConversacion.set(false);
      },
      error: () => this.cargandoConversacion.set(false),
    });
  }

  protected estado(c: HistorialConsulta): { texto: string; color: ColorBadge } {
    return ESTADOS[c.resultado ?? 'ABIERTA'] ?? { texto: formatoEtiquetaEnum(c.resultado ?? ''), color: 'neutral' };
  }

  protected canal(canal: string): string {
    return CANALES[canal] ?? formatoEtiquetaEnum(canal);
  }

  protected fecha(iso: string): string {
    return new Date(iso).toLocaleString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  protected hora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }
}
