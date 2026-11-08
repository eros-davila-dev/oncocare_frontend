import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { EstudioService, FuenteRecoleccion } from '../estudio.service';
import {
  CanalConsulta,
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

const CANAL: Partial<Record<CanalConsulta, string>> = {
  CHATBOT_WEB: 'Chatbot web',
  TELEGRAM: 'Telegram',
  WHATSAPP: 'WhatsApp',
  PRESENCIAL: 'Presencial',
  LLAMADA: 'Llamada',
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
 * con las columnas del Instrumento de la tesis. Abre con los datos del
 * servidor de la fundacion si se importaron (es de donde salen los de la tesis).
 */
@Component({
  selector: 'app-estudio-recoleccion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CardComponent, ButtonComponent, BadgeComponent, IconComponent, LoadingSpinnerComponent],
  template: `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Etapa">
          @for (f of fases; track f) {
            <button
              type="button"
              class="min-h-9 rounded-md px-4 text-sm font-semibold transition-colors"
              [class]="fase() === f ? 'bg-background text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'"
              [attr.aria-pressed]="fase() === f"
              (click)="cambiarFase(f)"
            >
              {{ f === 'POSTEST' ? 'Postest (con el sistema)' : 'Pretest (proceso manual)' }}
            </button>
          }
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Fuente:</span>
          <div class="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Fuente de los datos">
            @for (o of fuentes; track o.valor) {
              <button
                type="button"
                class="min-h-8 rounded-md px-3 text-xs font-semibold transition-colors"
                [class]="fuente() === o.valor ? 'bg-background text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'"
                [attr.aria-pressed]="fuente() === o.valor"
                (click)="cambiarFuente(o.valor)"
              >
                {{ o.etiqueta }}
              </button>
            }
          </div>
        </div>
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
        @if (fuente() === 'LOCAL') {
          <a routerLink="/estudio/muestra" class="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
            Configurar las fechas de la fase
          </a>
        }
      </ui-card>
    } @else if (resumen(); as r) {
      <p class="mt-4 rounded-lg bg-info-soft px-3 py-2 text-sm text-foreground">
        <strong>{{ r.sesiones.length }} sesiones</strong> del {{ fechaCorta(r.desde) }} al {{ fechaCorta(r.hasta) }}
        ({{ dias(r.diasSesion) }}).
        @if (fuente() === 'SERVIDOR' && fase() === 'PRETEST') {
          Fichas manuales del pretest (instrumento validado por la fundación), con cada paciente identificado solo por su código;
          el sistema calcula cada sesión con las reglas de la tesis.
        } @else if (fuente() === 'SERVIDOR') {
          Datos medidos por el sistema en el servidor de la fundación, con cada paciente identificado solo por su código; el sistema
          calcula cada sesión con las reglas de la tesis.
        } @else {
          Datos medidos por esta instalación.
        }
        Cada sesión aporta un valor por indicador; el promedio de las sesiones es el que se analiza en SPSS.
      </p>

      <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        @for (k of tarjetas(); track k.sigla) {
          <ui-card>
            <p class="text-xs font-bold uppercase tracking-wide text-primary">{{ k.hipotesis }} · {{ k.nombre }}</p>
            <p class="mt-2 font-display text-3xl font-bold">
              {{ k.valor }} <span class="text-base font-semibold">{{ k.unidad }}</span>
            </p>
            <p class="mt-1 text-xs text-muted-foreground">Promedio de {{ k.conDatos }} sesiones · meta: {{ k.meta }}</p>
            <p class="mt-3 rounded-md bg-muted px-2 py-1.5 text-xs text-foreground">
              <span class="font-semibold">{{ k.sigla }}</span> = {{ k.formula }}
            </p>
            <p class="mt-2 text-xs text-muted-foreground">{{ k.detalle }}</p>
          </ui-card>
        }
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

      <h3 class="mt-8 font-display text-lg font-bold">Valor de cada sesión</h3>
      <p class="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <ui-icon name="info" [size]="16" clase="shrink-0 text-primary" />
        Pulse una fila para ver, debajo, las fichas con cada paciente de esa sesión.
      </p>
      <div class="mt-3 overflow-x-auto rounded-xl border border-border">
        <table class="w-full border-collapse text-left text-sm">
          <thead class="bg-muted/70 text-xs text-muted-foreground">
            <tr>
              <th class="px-3 py-2 font-semibold" rowspan="2">Sesión</th>
              <th class="px-3 py-2 font-semibold" rowspan="2">Fecha</th>
              <th class="border-l border-border px-3 pt-2 text-center font-bold text-foreground" colspan="2">Tiempo de registro</th>
              <th class="border-l border-border px-3 pt-2 text-center font-bold text-foreground" colspan="3">Ausentismo</th>
              <th class="border-l border-border px-3 pt-2 text-center font-bold text-foreground" colspan="3">Consultas atendidas</th>
            </tr>
            <tr>
              <th class="border-l border-border px-3 pb-2 text-right font-semibold">Registros</th>
              <th class="px-3 pb-2 text-right font-semibold">TPR (min)</th>
              <th class="border-l border-border px-3 pb-2 text-right font-semibold">Citas</th>
              <th class="px-3 pb-2 text-right font-semibold">No asistieron</th>
              <th class="px-3 pb-2 text-right font-semibold">TA (%)</th>
              <th class="border-l border-border px-3 pb-2 text-right font-semibold">Consultas</th>
              <th class="px-3 pb-2 text-right font-semibold">Resueltas</th>
              <th class="px-3 pb-2 text-right font-semibold">NCA (%)</th>
            </tr>
          </thead>
          <tbody>
            @for (s of r.sesiones; track s.fecha) {
              <tr
                class="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                [class.bg-primary-soft]="seleccionada() === s.fecha"
                tabindex="0"
                [attr.aria-selected]="seleccionada() === s.fecha"
                (click)="verSesion(s)"
                (keydown.enter)="verSesion(s)"
              >
                <td class="px-3 py-2 font-semibold">{{ s.numero }}</td>
                <td class="whitespace-nowrap px-3 py-2">{{ fechaCorta(s.fecha) }} <span class="text-muted-foreground">{{ diaDe(s.fecha) }}</span></td>
                <td class="border-l border-border px-3 py-2 text-right tabular-nums">{{ s.registros }}</td>
                <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ celda(s.tprMin) }}</td>
                <td class="border-l border-border px-3 py-2 text-right tabular-nums">{{ s.citasElegibles }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ s.inasistencias }}</td>
                <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ celda(s.taPct) }}</td>
                <td class="border-l border-border px-3 py-2 text-right tabular-nums">{{ s.consultas }}</td>
                <td class="px-3 py-2 text-right tabular-nums">{{ s.resueltas }}</td>
                <td class="px-3 py-2 text-right font-semibold tabular-nums">{{ celda(s.ncaPct) }}</td>
              </tr>
            }
          </tbody>
          <tfoot class="border-t-2 border-border bg-muted/40 text-sm font-bold">
            <tr>
              <td class="px-3 py-2" colspan="2">Promedio de las sesiones</td>
              <td class="border-l border-border px-3 py-2 text-right tabular-nums">{{ r.registros }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ celda(r.promedioSesiones.tprMin) }}</td>
              <td class="border-l border-border px-3 py-2 text-right tabular-nums">{{ r.citasElegibles }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ inasistenciasTotales() }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ celda(r.promedioSesiones.taPct) }}</td>
              <td class="border-l border-border px-3 py-2 text-right tabular-nums">{{ r.consultas }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ resueltasTotales() }}</td>
              <td class="px-3 py-2 text-right tabular-nums">{{ celda(r.promedioSesiones.ncaPct) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="mt-2 text-xs text-muted-foreground">
        En la última fila, las cantidades son totales de la etapa y los indicadores son el promedio de las sesiones.
        «—» = sesión sin eventos de ese indicador (la tesis la excluye del análisis).
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
                            <td class="py-1 pr-3 text-right tabular-nums">{{ t.minutos.toFixed(2) }}</td>
                            <td class="py-1"><ui-badge [color]="t.sospechosa ? 'warning' : 'success'">{{ t.sospechosa ? 'Revisar' : 'OK' }}</ui-badge></td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                } @else {
                  <p class="text-sm text-muted-foreground">Sin registros en esta sesión.</p>
                }
              </ui-card>

              <ui-card [titulo]="'Ficha 02 · Citas (' + d.citas.length + ')'">
                @if (d.citas.length) {
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm">
                      <thead class="text-xs text-muted-foreground">
                        <tr><th class="py-1 pr-3">Código</th><th class="py-1 pr-3">Estado</th><th class="py-1 pr-3">Recordatorio</th><th class="py-1">Cuenta para el ausentismo</th></tr>
                      </thead>
                      <tbody>
                        @for (c of d.citas; track $index) {
                          <tr class="border-t border-border">
                            <td class="py-1 pr-3 font-mono">{{ c.codigo ?? '—' }}</td>
                            <td class="py-1 pr-3">
                              <ui-badge [color]="c.estado === 'NO_ASISTIO' ? 'danger' : c.estado === 'ATENDIDA' ? 'success' : 'neutral'">
                                {{ estadoCita(c.estado) }}
                              </ui-badge>
                            </td>
                            <td class="py-1 pr-3">{{ c.recordatorioEnviado ? 'Sí' : 'No' }}</td>
                            <td class="py-1">{{ c.estado === 'ATENDIDA' || c.estado === 'NO_ASISTIO' ? 'Sí' : 'No (sin desenlace o cancelada)' }}</td>
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
                        <tr><th class="py-1 pr-3">Código</th><th class="py-1 pr-3">Categoría</th><th class="py-1 pr-3">Canal</th><th class="py-1 pr-3">Resuelta en el 1.er contacto</th><th class="py-1 pr-3">Derivada al personal</th><th class="py-1 text-right">T. resp. (min)</th></tr>
                      </thead>
                      <tbody>
                        @for (k of d.consultas; track $index) {
                          <tr class="border-t border-border">
                            <td class="py-1 pr-3 font-mono">{{ k.codigo ?? 'Anónimo' }}</td>
                            <td class="py-1 pr-3">{{ k.categoria ? categoria[k.categoria] : 'Sin categoría' }}</td>
                            <td class="py-1 pr-3">{{ canal(k.canal) }}</td>
                            <td class="py-1 pr-3">
                              @if (!k.resultado) {
                                <ui-badge color="warning">Abierta</ui-badge>
                              } @else {
                                <ui-badge [color]="resuelta(k) ? 'success' : 'neutral'">{{ resuelta(k) ? 'Sí' : 'No' }}</ui-badge>
                              }
                            </td>
                            <td class="py-1 pr-3">{{ derivada(k) ? 'Sí' : 'No' }}</td>
                            <td class="py-1 text-right tabular-nums">{{ k.tiempoRespuestaMin != null ? k.tiempoRespuestaMin.toFixed(2) : '—' }}</td>
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

  protected readonly fases: Fase[] = ['PRETEST', 'POSTEST'];
  protected readonly fuentes: { valor: FuenteRecoleccion; etiqueta: string }[] = [
    { valor: 'SERVIDOR', etiqueta: 'Servidor de la fundación' },
    { valor: 'LOCAL', etiqueta: 'Esta instalación' },
  ];
  protected readonly categoria = CATEGORIA;
  protected readonly fechaCorta = fechaCorta;

  protected readonly fase = signal<Fase>('PRETEST');
  protected readonly fuente = signal<FuenteRecoleccion>('SERVIDOR');
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

  protected readonly inasistenciasTotales = computed(() => (this.resumen()?.sesiones ?? []).reduce((a, s) => a + s.inasistencias, 0));
  protected readonly resueltasTotales = computed(() => (this.resumen()?.sesiones ?? []).reduce((a, s) => a + s.resueltas, 0));

  /** Una tarjeta por hipotesis, con la formula de la tesis en palabras. */
  protected readonly tarjetas = computed(() => {
    const r = this.resumen();
    if (!r) return [];
    const p = r.promedioSesiones;
    const pretest = this.fase() === 'PRETEST';
    return [
      {
        sigla: 'TPR',
        hipotesis: 'H1',
        nombre: 'Tiempo promedio de registro',
        valor: this.celda(p.tprMin),
        unidad: 'min',
        meta: 'bajar',
        conDatos: this.conDatos('tprMin'),
        formula: 'suma de los tiempos de registro ÷ n.º de registros',
        detalle: `${r.registros} pacientes registrados por el personal${pretest ? ' (a mano)' : ' (en el sistema)'}.`,
      },
      {
        sigla: 'TA',
        hipotesis: 'H2',
        nombre: 'Tasa de ausentismo',
        valor: this.celda(p.taPct),
        unidad: '%',
        meta: 'bajar',
        conDatos: this.conDatos('taPct'),
        formula: 'citas no asistidas sin aviso ÷ citas con desenlace × 100',
        detalle: `${this.inasistenciasTotales()} de ${r.citasElegibles} citas no asistidas · con recordatorio: ${r.citasConRecordatorio}. Las canceladas con aviso no cuentan.`,
      },
      {
        sigla: 'NCA',
        hipotesis: 'H3',
        nombre: 'Nivel de consultas atendidas',
        valor: this.celda(p.ncaPct),
        unidad: '%',
        meta: 'subir',
        conDatos: this.conDatos('ncaPct'),
        formula: 'consultas resueltas en el primer contacto y sin derivación ÷ consultas recibidas × 100',
        detalle: `${this.resueltasTotales()} de ${r.consultas} consultas resueltas${pretest ? ' en forma presencial' : ' por el chatbot'}.`,
      },
    ];
  });

  constructor() {
    this.cargar();
  }

  protected cambiarFase(fase: Fase): void {
    this.fase.set(fase);
    this.cargar();
  }

  protected cambiarFuente(fuente: FuenteRecoleccion): void {
    this.fuente.set(fuente);
    this.cargar();
  }

  protected verSesion(s: SesionRecoleccion): void {
    this.seleccionada.set(s.fecha);
    this.cargandoDetalle.set(true);
    this.estudioService.detalleRecoleccion(this.fase(), s.fecha, this.fuente()).subscribe({
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
    this.estudioService.exportarRecoleccion(this.fase(), this.fuente()).subscribe({
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

  protected celda(v: number | null | undefined): string {
    return v == null ? '—' : v.toFixed(2);
  }

  protected diaDe(iso: string): string {
    return DIA.format(new Date(`${iso}T00:00:00Z`));
  }

  protected dias(dias: string[]): string {
    const nombres: Record<string, string> = {
      MONDAY: 'lunes', TUESDAY: 'martes', WEDNESDAY: 'miércoles', THURSDAY: 'jueves', FRIDAY: 'viernes', SATURDAY: 'sábado', SUNDAY: 'domingo',
    };
    const lista = dias.map((d) => nombres[d] ?? d);
    return lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista[lista.length - 1]}` : lista.join('');
  }

  protected hora(h: string | null): string {
    return h ? h.substring(0, 5) : '—';
  }

  protected estadoCita(estado: string): string {
    return ESTADO_CITA[estado] ?? estado;
  }

  protected canal(canal: CanalConsulta): string {
    return CANAL[canal] ?? canal;
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
    this.estudioService.recoleccion(this.fase(), this.fuente()).subscribe({
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
