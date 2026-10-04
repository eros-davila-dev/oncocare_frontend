import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { EstudioService } from '../estudio.service';
import {
  CategoriaConsulta,
  DetalleRecoleccion,
  Fase,
  FilaConsultaRecoleccion,
  ResumenRecoleccion,
  SesionRecoleccion,
} from '../../../core/models/estudio.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { CardComponent } from '../../../shared/ui/card/card';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { BadgeComponent } from '../../../shared/ui/badge/badge';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { descargarBlob, fechaCorta } from '../indicadores.util';

const DIA = new Intl.DateTimeFormat('es-PE', { weekday: 'long', timeZone: 'UTC' });

const CATEGORIA: Record<CategoriaConsulta, string> = {
  CITAS: 'Citas',
  HORARIOS: 'Horarios',
  INFORMACION_INSTITUCIONAL: 'Información institucional',
  REQUISITOS: 'Requisitos',
  UBICACION: 'Ubicación',
  SEGUIMIENTO_ADMINISTRATIVO: 'Seguimiento administrativo',
  OTRO: 'Otro',
};

const ESTADO_CITA: Record<string, string> = {
  ATENDIDA: 'Asistió',
  NO_ASISTIO: 'No asistió',
  CANCELADA: 'Cancelada',
  PROGRAMADA: 'Pendiente',
  CONFIRMADA: 'Pendiente',
};

/**
 * Recoleccion de datos por sesion (tesis v8): un valor de TPR, tasa de
 * ausentismo y NCA por cada sesion (lunes, miercoles y viernes) de la fase,
 * las fichas evento por evento de la sesion elegida y la descarga en Excel
 * con las columnas del Instrumento de la tesis.
 */
@Component({
  selector: 'app-estudio-recoleccion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CardComponent, ButtonComponent, BadgeComponent, IconComponent, LoadingSpinnerComponent],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Fase">
        @for (f of fases; track f) {
          <button
            type="button"
            class="min-h-9 rounded-md px-3 text-sm font-semibold transition-colors"
            [class]="fase() === f ? 'bg-background text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'"
            [attr.aria-pressed]="fase() === f"
            (click)="cambiarFase(f)"
          >
            {{ f === 'POSTEST' ? 'Postest' : 'Pretest' }}
          </button>
        }
      </div>
      @if (resumen()) {
        <ui-button variante="outline" [cargando]="descargando()" (click)="descargar()">
          <ui-icon name="download" [size]="16" /> Descargar Excel (Instrumento)
        </ui-button>
      }
    </div>

    @if (cargando()) {
      <ui-loading-spinner class="mt-6 block" />
    } @else if (error()) {
      <ui-card class="mt-6 block">
        <p class="text-sm text-muted-foreground">{{ error() }}</p>
        <a routerLink="/estudio/muestra" class="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
          Configurar las fechas de la fase
        </a>
      </ui-card>
    } @else if (resumen(); as r) {
      <p class="mt-4 text-sm text-muted-foreground">
        Del {{ fechaCorta(r.desde) }} al {{ fechaCorta(r.hasta) }} · {{ r.sesiones.length }} sesiones
        ({{ dias(r.diasSesion) }}) · cada sesión es una observación independiente.
      </p>

      <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ui-card>
          <p class="text-xs font-semibold uppercase text-muted-foreground">H1 · Tiempo promedio de registro</p>
          <p class="mt-1 font-display text-3xl font-bold">{{ valor(r.promedioSesiones.tprMin, ' min') }}</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Promedio de {{ conDatos('tprMin') }} sesiones con datos · {{ r.registros }} registros del personal
          </p>
        </ui-card>
        <ui-card>
          <p class="text-xs font-semibold uppercase text-muted-foreground">H2 · Tasa de ausentismo</p>
          <p class="mt-1 font-display text-3xl font-bold">{{ valor(r.promedioSesiones.taPct, ' %') }}</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Promedio de {{ conDatos('taPct') }} sesiones con datos · {{ r.citasElegibles }} citas elegibles
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            Recordatorio enviado: {{ r.citasConRecordatorio }} de {{ r.citasElegibles }}
            ({{ valor(r.coberturaRecordatorioPct, ' %') }})
          </p>
        </ui-card>
        <ui-card>
          <p class="text-xs font-semibold uppercase text-muted-foreground">H3 · Nivel de consultas atendidas</p>
          <p class="mt-1 font-display text-3xl font-bold">{{ valor(r.promedioSesiones.ncaPct, ' %') }}</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Promedio de {{ conDatos('ncaPct') }} sesiones con datos · {{ r.consultas }} consultas con desenlace
          </p>
        </ui-card>
      </div>

      @if (hayAvisos()) {
        <ui-card class="mt-4 block">
          <p class="flex items-center gap-2 text-sm font-semibold">
            <ui-icon name="triangle-alert" [size]="16" clase="text-destructive" /> Revisar antes de exportar
          </p>
          <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            @if (r.avisos.citasSinDesenlace) {
              <li>
                {{ r.avisos.citasSinDesenlace }} citas pasadas sin marcar «Llegó» o «No asistió» (no entran al ausentismo).
                <a routerLink="/agenda" class="font-semibold text-primary hover:underline">Ir a la agenda</a>
              </li>
            }
            @if (r.avisos.consultasAbiertas) {
              <li>
                {{ r.avisos.consultasAbiertas }} consultas aún abiertas (no entran al NCA hasta cerrarse).
                <a routerLink="/consultas" class="font-semibold text-primary hover:underline">Ir a la bandeja</a>
              </li>
            }
            @if (r.avisos.registrosSospechosos) {
              <li>{{ r.avisos.registrosSospechosos }} tiempos de registro marcados para revisar.</li>
            }
            @if (r.avisos.eventosFueraDeSesion) {
              <li>{{ r.avisos.eventosFueraDeSesion }} eventos en días que no son de sesión (no se incluyen).</li>
            }
          </ul>
        </ui-card>
      }

      <div class="mt-6 overflow-x-auto rounded-xl border border-border">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="bg-muted/70 text-xs text-muted-foreground">
            <tr>
              <th class="px-3 py-3 font-semibold">Sesión</th>
              <th class="px-3 py-3 font-semibold">Fecha</th>
              <th class="px-3 py-3 text-right font-semibold">Registros</th>
              <th class="px-3 py-3 text-right font-semibold">TPR (min)</th>
              <th class="px-3 py-3 text-right font-semibold">Citas eleg.</th>
              <th class="px-3 py-3 text-right font-semibold">No asist.</th>
              <th class="px-3 py-3 text-right font-semibold">Ausentismo (%)</th>
              <th class="px-3 py-3 text-right font-semibold">Consultas</th>
              <th class="px-3 py-3 text-right font-semibold">Resueltas</th>
              <th class="px-3 py-3 text-right font-semibold">NCA (%)</th>
            </tr>
          </thead>
          <tbody>
            @for (s of r.sesiones; track s.fecha) {
              <tr
                class="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                [class.bg-primary-soft]="seleccionada() === s.fecha"
                tabindex="0"
                (click)="verSesion(s)"
                (keydown.enter)="verSesion(s)"
              >
                <td class="px-3 py-2 font-semibold">{{ s.numero }}</td>
                <td class="whitespace-nowrap px-3 py-2">{{ fechaCorta(s.fecha) }} <span class="text-muted-foreground">{{ diaDe(s.fecha) }}</span></td>
                <td class="px-3 py-2 text-right">{{ s.registros }}</td>
                <td class="px-3 py-2 text-right font-medium">{{ celda(s.tprMin) }}</td>
                <td class="px-3 py-2 text-right">{{ s.citasElegibles }}</td>
                <td class="px-3 py-2 text-right">{{ s.inasistencias }}</td>
                <td class="px-3 py-2 text-right font-medium">{{ celda(s.taPct) }}</td>
                <td class="px-3 py-2 text-right">{{ s.consultas }}</td>
                <td class="px-3 py-2 text-right">{{ s.resueltas }}</td>
                <td class="px-3 py-2 text-right font-medium">{{ celda(s.ncaPct) }}</td>
              </tr>
            }
          </tbody>
          <tfoot class="border-t-2 border-border text-sm font-semibold">
            <tr>
              <td class="px-3 py-2" colspan="3">Promedio de sesiones</td>
              <td class="px-3 py-2 text-right">{{ celda(r.promedioSesiones.tprMin) }}</td>
              <td class="px-3 py-2" colspan="2"></td>
              <td class="px-3 py-2 text-right">{{ celda(r.promedioSesiones.taPct) }}</td>
              <td class="px-3 py-2" colspan="2"></td>
              <td class="px-3 py-2 text-right">{{ celda(r.promedioSesiones.ncaPct) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="mt-2 text-xs text-muted-foreground">
        «—» = sesión sin eventos de ese indicador: la tesis la excluye del análisis. Pulse una sesión para ver sus fichas.
      </p>

      @if (seleccionada(); as fecha) {
        <section class="mt-6" aria-labelledby="titulo-fichas">
          <h3 id="titulo-fichas" class="font-display text-base font-bold">Fichas de la sesión del {{ fechaCorta(fecha) }}</h3>
          @if (cargandoDetalle()) {
            <ui-loading-spinner class="mt-4 block" />
          } @else if (detalle(); as d) {
            <div class="mt-3 grid gap-4">
              <ui-card [titulo]="'Ficha 01 · Tiempos de registro (' + d.tiempos.length + ')'">
                @if (d.tiempos.length) {
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                      <thead class="text-xs text-muted-foreground">
                        <tr><th class="py-1 pr-3">Código</th><th class="py-1 pr-3">Inicio</th><th class="py-1 pr-3">Fin</th><th class="py-1 pr-3 text-right">Minutos</th><th class="py-1">Control</th></tr>
                      </thead>
                      <tbody>
                        @for (t of d.tiempos; track $index) {
                          <tr class="border-t border-border">
                            <td class="py-1 pr-3 font-mono">{{ t.codigo ?? '—' }}</td>
                            <td class="py-1 pr-3">{{ hora(t.horaInicio) }}</td>
                            <td class="py-1 pr-3">{{ hora(t.horaFin) }}</td>
                            <td class="py-1 pr-3 text-right">{{ t.minutos.toFixed(2) }}</td>
                            <td class="py-1"><ui-badge [color]="t.sospechosa ? 'warning' : 'success'">{{ t.sospechosa ? 'Revisar' : 'OK' }}</ui-badge></td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <p class="text-sm text-muted-foreground">Sin registros del personal en esta sesión.</p>
                }
              </ui-card>

              <ui-card [titulo]="'Ficha 02 · Citas (' + d.citas.length + ')'">
                @if (d.citas.length) {
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                      <thead class="text-xs text-muted-foreground">
                        <tr><th class="py-1 pr-3">Código</th><th class="py-1 pr-3">Hora</th><th class="py-1 pr-3">Estado</th><th class="py-1 pr-3">Recordatorio</th><th class="py-1">Elegible</th></tr>
                      </thead>
                      <tbody>
                        @for (c of d.citas; track $index) {
                          <tr class="border-t border-border">
                            <td class="py-1 pr-3 font-mono">{{ c.codigo ?? '—' }}</td>
                            <td class="py-1 pr-3">{{ hora(c.hora) }}</td>
                            <td class="py-1 pr-3">{{ estadoCita(c.estado) }}</td>
                            <td class="py-1 pr-3">{{ c.recordatorioEnviado ? 'Sí' : 'No' }}</td>
                            <td class="py-1">{{ c.estado === 'ATENDIDA' || c.estado === 'NO_ASISTIO' ? 'Sí' : 'No' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <p class="text-sm text-muted-foreground">Sin citas en esta sesión.</p>
                }
              </ui-card>

              <ui-card [titulo]="'Ficha 03 · Consultas (' + d.consultas.length + ')'">
                @if (d.consultas.length) {
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                      <thead class="text-xs text-muted-foreground">
                        <tr><th class="py-1 pr-3">Código</th><th class="py-1 pr-3">Hora</th><th class="py-1 pr-3">Categoría</th><th class="py-1 pr-3">Canal</th><th class="py-1 pr-3">Resuelta 1.er contacto</th><th class="py-1 pr-3">Derivada</th><th class="py-1 text-right">T. resp. (min)</th></tr>
                      </thead>
                      <tbody>
                        @for (k of d.consultas; track $index) {
                          <tr class="border-t border-border">
                            <td class="py-1 pr-3 font-mono">{{ k.codigo ?? 'Anónimo' }}</td>
                            <td class="py-1 pr-3">{{ hora(k.hora) }}</td>
                            <td class="py-1 pr-3">{{ k.categoria ? categoria[k.categoria] : 'Sin categoría' }}</td>
                            <td class="py-1 pr-3">{{ k.canal === 'TELEGRAM' ? 'Telegram' : k.canal === 'CHATBOT_WEB' ? 'Chatbot web' : k.canal }}</td>
                            <td class="py-1 pr-3">
                              @if (!k.resultado) {
                                <ui-badge color="warning">Abierta</ui-badge>
                              } @else {
                                {{ resuelta(k) ? 'Sí' : 'No' }}
                              }
                            </td>
                            <td class="py-1 pr-3">{{ derivada(k) ? 'Sí' : 'No' }}</td>
                            <td class="py-1 text-right">{{ k.tiempoRespuestaMin != null ? k.tiempoRespuestaMin.toFixed(2) : '—' }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <p class="text-sm text-muted-foreground">Sin consultas en esta sesión.</p>
                }
              </ui-card>
            </div>
          }
        </section>
      }
    }
  `,
})
export class EstudioRecoleccionComponent {
  private readonly estudioService = inject(EstudioService);

  protected readonly fases: Fase[] = ['POSTEST', 'PRETEST'];
  protected readonly categoria = CATEGORIA;
  protected readonly fechaCorta = fechaCorta;

  protected readonly fase = signal<Fase>('POSTEST');
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly resumen = signal<ResumenRecoleccion | null>(null);
  protected readonly seleccionada = signal<string | null>(null);
  protected readonly detalle = signal<DetalleRecoleccion | null>(null);
  protected readonly cargandoDetalle = signal(false);
  protected readonly descargando = signal(false);

  protected readonly hayAvisos = computed(() => {
    const a = this.resumen()?.avisos;
    return !!a && (a.citasSinDesenlace > 0 || a.consultasAbiertas > 0 || a.registrosSospechosos > 0 || a.eventosFueraDeSesion > 0);
  });

  constructor() {
    this.cargar();
  }

  protected cambiarFase(fase: Fase): void {
    this.fase.set(fase);
    this.cargar();
  }

  protected verSesion(s: SesionRecoleccion): void {
    this.seleccionada.set(s.fecha);
    this.cargandoDetalle.set(true);
    this.estudioService.detalleRecoleccion(this.fase(), s.fecha).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.cargandoDetalle.set(false);
      },
      error: () => this.cargandoDetalle.set(false),
    });
  }

  protected descargar(): void {
    this.descargando.set(true);
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    this.estudioService.exportarRecoleccion(this.fase()).subscribe({
      next: (blob) => {
        descargarBlob(blob, `recoleccion-${this.fase().toLowerCase()}-${hoy}.xlsx`);
        this.descargando.set(false);
      },
      error: () => this.descargando.set(false),
    });
  }

  protected conDatos(campo: 'tprMin' | 'taPct' | 'ncaPct'): string {
    const r = this.resumen();
    if (!r) return '0';
    return `${r.sesiones.filter((s) => s[campo] != null).length} de ${r.sesiones.length}`;
  }

  protected valor(v: number | null | undefined, sufijo: string): string {
    return v == null ? 'Sin datos' : `${v.toFixed(2)}${sufijo}`;
  }

  protected celda(v: number | null | undefined): string {
    return v == null ? '—' : v.toFixed(2);
  }

  protected diaDe(iso: string): string {
    return DIA.format(new Date(`${iso}T00:00:00Z`));
  }

  protected dias(dias: string[]): string {
    const nombres: Record<string, string> = {
      MONDAY: 'lun', TUESDAY: 'mar', WEDNESDAY: 'mié', THURSDAY: 'jue', FRIDAY: 'vie', SATURDAY: 'sáb', SUNDAY: 'dom',
    };
    return dias.map((d) => nombres[d] ?? d).join(', ');
  }

  protected hora(h: string): string {
    return h ? h.substring(0, 5) : '—';
  }

  protected estadoCita(estado: string): string {
    return ESTADO_CITA[estado] ?? estado;
  }

  /** Misma regla que el backend (RecoleccionSesiones.FilaConsulta). */
  protected derivada(k: FilaConsultaRecoleccion): boolean {
    const automatizado = k.canal === 'CHATBOT_WEB' || k.canal === 'TELEGRAM';
    return k.derivada || k.resultado === 'ESCALADA' || (k.resultado === 'RESUELTA_PERSONAL' && automatizado);
  }

  protected resuelta(k: FilaConsultaRecoleccion): boolean {
    if (!k.resultado || k.reabierta || this.derivada(k)) return false;
    const automatizado = k.canal === 'CHATBOT_WEB' || k.canal === 'TELEGRAM';
    return k.resultado === 'RESUELTA_BOT' || (k.resultado === 'RESUELTA_PERSONAL' && !automatizado);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.seleccionada.set(null);
    this.detalle.set(null);
    this.estudioService.recoleccion(this.fase()).subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.resumen.set(null);
        this.error.set((e.error as ErrorResponse | undefined)?.message ?? 'No se pudo cargar la recolección');
        this.cargando.set(false);
      },
    });
  }
}
