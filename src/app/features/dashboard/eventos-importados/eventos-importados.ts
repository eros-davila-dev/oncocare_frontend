import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { fechaCorta } from '../../estudio/indicadores.util';

export type TipoEvento = 'REGISTRO' | 'CITA' | 'CONSULTA';
type Etapa = 'PRETEST' | 'POSTEST';

interface EventoImportado {
  fase: Etapa;
  tipo: TipoEvento;
  numero: number;
  fecha: string;
  codigoPaciente: string;
  horaInicio: string | null;
  horaFin: string | null;
  minutos: number | null;
  modalidad: string | null;
  estado: string | null;
  motivo: string | null;
  recordatorio: boolean | null;
  categoria: string | null;
  canal: string | null;
  resuelta: boolean | null;
  derivada: boolean | null;
  tiempoRespuesta: number | null;
  controlCalidad: string | null;
  fuente: string;
}

/**
 * Eventos por paciente del instrumento (pretest de las fichas manuales y
 * postest exportado del servidor de la fundacion), con el paciente solo por
 * su codigo anonimo. Se muestran aparte de lo que mide esta instalacion.
 */
@Component({
  selector: 'app-eventos-importados',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section [attr.aria-label]="'Datos del instrumento por paciente: ' + titulo()">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="font-display text-lg font-bold">Datos del instrumento por paciente</h2>
          <p class="text-sm text-muted-foreground">
            {{ titulo() }} de cada paciente, identificado solo por su código.
            {{ etapa() === 'PRETEST' ? 'Pretest: ficha aplicada a mano y validada por la fundación.' : 'Postest: registro del servidor de la fundación, importado.' }}
          </p>
        </div>
        <div class="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Etapa">
          @for (e of etapas; track e.valor) {
            <button
              type="button"
              class="min-h-9 rounded-md px-3 text-sm font-semibold transition-colors"
              [class]="etapa() === e.valor ? 'bg-background text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'"
              [attr.aria-pressed]="etapa() === e.valor"
              (click)="etapa.set(e.valor)"
            >
              {{ e.etiqueta }}
            </button>
          }
        </div>
      </div>

      @if (cargando()) {
        <p class="mt-3 text-sm text-muted-foreground">Cargando...</p>
      } @else if (eventos().length === 0) {
        <p class="mt-3 text-sm text-muted-foreground">No se importaron datos de esta etapa (Estudio › Fases y sesiones).</p>
      } @else {
        <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          @for (m of metricas(); track m.etiqueta) {
            <div class="rounded-lg border border-border bg-card px-3 py-2">
              <p class="text-xs text-muted-foreground">{{ m.etiqueta }}</p>
              <p class="font-display text-lg font-bold tabular-nums">{{ m.valor }}</p>
            </div>
          }
        </div>
        <div class="mt-3 max-h-[28rem] overflow-auto rounded-xl border border-border">
          <table class="w-full border-collapse text-left text-sm">
            <thead class="sticky top-0 bg-muted text-xs text-muted-foreground">
              <tr>
                <th class="px-3 py-2 font-semibold">N.°</th>
                <th class="px-3 py-2 font-semibold">Fecha</th>
                <th class="px-3 py-2 font-semibold">Paciente</th>
                @switch (tipo()) {
                  @case ('REGISTRO') {
                    <th class="px-3 py-2 font-semibold">Inicio</th>
                    <th class="px-3 py-2 font-semibold">Fin</th>
                    <th class="px-3 py-2 text-right font-semibold">Tiempo (min)</th>
                    <th class="px-3 py-2 font-semibold">Modalidad</th>
                  }
                  @case ('CITA') {
                    <th class="px-3 py-2 font-semibold">Estado</th>
                    <th class="px-3 py-2 font-semibold">Motivo</th>
                    <th class="px-3 py-2 font-semibold">Recordatorio</th>
                  }
                  @case ('CONSULTA') {
                    <th class="px-3 py-2 font-semibold">Tema</th>
                    <th class="px-3 py-2 font-semibold">Canal</th>
                    <th class="px-3 py-2 font-semibold">Primer contacto</th>
                    <th class="px-3 py-2 font-semibold">Derivada</th>
                    <th class="px-3 py-2 text-right font-semibold">Respuesta (min)</th>
                  }
                }
              </tr>
            </thead>
            <tbody>
              @for (e of eventos(); track e.numero) {
                <tr class="border-t border-border">
                  <td class="px-3 py-1.5 text-muted-foreground tabular-nums">{{ e.numero }}</td>
                  <td class="px-3 py-1.5">{{ fechaCorta(e.fecha) }}</td>
                  <td class="px-3 py-1.5 font-semibold">{{ e.codigoPaciente }}</td>
                  @switch (tipo()) {
                    @case ('REGISTRO') {
                      <td class="px-3 py-1.5 tabular-nums">{{ e.horaInicio?.slice(0, 5) ?? '—' }}</td>
                      <td class="px-3 py-1.5 tabular-nums">{{ e.horaFin?.slice(0, 5) ?? '—' }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ e.minutos ?? '—' }}</td>
                      <td class="px-3 py-1.5">{{ e.modalidad ?? '—' }}</td>
                    }
                    @case ('CITA') {
                      <td class="px-3 py-1.5">{{ e.estado ?? '—' }}</td>
                      <td class="px-3 py-1.5">{{ e.motivo || '—' }}</td>
                      <td class="px-3 py-1.5">{{ siNo(e.recordatorio) }}</td>
                    }
                    @case ('CONSULTA') {
                      <td class="px-3 py-1.5">{{ e.categoria ?? '—' }}</td>
                      <td class="px-3 py-1.5">{{ e.canal ?? '—' }}</td>
                      <td class="px-3 py-1.5">{{ siNo(e.resuelta) }}</td>
                      <td class="px-3 py-1.5">{{ siNo(e.derivada) }}</td>
                      <td class="px-3 py-1.5 text-right tabular-nums">{{ e.tiempoRespuesta ?? '—' }}</td>
                    }
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">Fuente: {{ eventos()[0].fuente }}. {{ eventos().length }} eventos.</p>
      }
    </section>
  `,
})
export class EventosImportadosComponent {
  private readonly http = inject(HttpClient);

  readonly tipo = input.required<TipoEvento>();

  protected readonly etapas: { valor: Etapa; etiqueta: string }[] = [
    { valor: 'PRETEST', etiqueta: 'Pretest' },
    { valor: 'POSTEST', etiqueta: 'Postest (servidor)' },
  ];
  protected readonly fechaCorta = fechaCorta;
  protected readonly etapa = signal<Etapa>('POSTEST');
  protected readonly cargando = signal(true);
  protected readonly eventos = signal<EventoImportado[]>([]);

  protected readonly titulo = computed(() =>
    ({ REGISTRO: 'Registros (tiempo de registro)', CITA: 'Citas (ausentismo)', CONSULTA: 'Consultas (consultas atendidas)' })[this.tipo()],
  );

  /** Resumen de los eventos de la etapa, calculado con la misma regla del indicador. */
  protected readonly metricas = computed(() => {
    const ev = this.eventos();
    const pacientes = new Set(ev.map((e) => e.codigoPaciente)).size;
    const dias = new Set(ev.map((e) => e.fecha)).size;
    const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(2) + ' %' : '—');
    switch (this.tipo()) {
      case 'REGISTRO': {
        const t = ev.map((e) => e.minutos).filter((v): v is number => v != null);
        return [
          { etiqueta: 'Registros', valor: String(ev.length) },
          { etiqueta: 'Pacientes', valor: String(pacientes) },
          { etiqueta: 'Sesiones', valor: String(dias) },
          { etiqueta: 'TPR (todos los registros)', valor: t.length ? (t.reduce((a, b) => a + b, 0) / t.length).toFixed(2) + ' min' : '—' },
        ];
      }
      case 'CITA': {
        const noAsistio = ev.filter((e) => (e.estado ?? '').toLowerCase().startsWith('no asist')).length;
        const asistio = ev.filter((e) => (e.estado ?? '').toLowerCase().startsWith('asist')).length;
        return [
          { etiqueta: 'Citas', valor: String(ev.length) },
          { etiqueta: 'Asistieron', valor: String(asistio) },
          { etiqueta: 'No asistieron', valor: String(noAsistio) },
          { etiqueta: 'TA (todas las citas)', valor: pct(noAsistio, asistio + noAsistio) },
        ];
      }
      case 'CONSULTA': {
        const resueltas = ev.filter((e) => e.resuelta && !e.derivada).length;
        const derivadas = ev.filter((e) => e.derivada).length;
        return [
          { etiqueta: 'Consultas', valor: String(ev.length) },
          { etiqueta: 'Resueltas sin derivar', valor: String(resueltas) },
          { etiqueta: 'Derivadas', valor: String(derivadas) },
          { etiqueta: 'NCA (todas las consultas)', valor: pct(resueltas, ev.length) },
        ];
      }
    }
  });

  constructor() {
    effect(() => {
      const tipo = this.tipo();
      const fase = this.etapa();
      this.cargando.set(true);
      this.http
        .get<EventoImportado[]>(`${environment.apiUrl}/estudio/eventos-importados`, { params: { tipo, fase } })
        .subscribe({
          next: (e) => {
            this.eventos.set(e);
            this.cargando.set(false);
          },
          error: () => {
            this.eventos.set([]);
            this.cargando.set(false);
          },
        });
    });
  }

  protected siNo(v: boolean | null): string {
    return v == null ? '—' : v ? 'Sí' : 'No';
  }
}
