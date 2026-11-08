import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, signal } from '@angular/core';

/** Linea horizontal de referencia (p. ej. el promedio del pretest). */
export interface ReferenciaSerie {
  valor: number;
  etiqueta: string;
}

export interface PuntoSerie {
  /** Texto del eje X (p. ej. "03/10"). */
  etiqueta: string;
  /** Texto completo para el tooltip y la tabla (p. ej. "03/10/2026"). */
  detalle: string;
  /** null = ese dia no hubo eventos del indicador (no es cero). */
  valor: number | null;
}

const ALTO = 220;
const MARGEN = { arriba: 22, derecha: 12, abajo: 28, izquierda: 44 };
const ANCHO_MAX_COLUMNA = 24;
const RADIO = 4;

/**
 * Columnas de una sola serie a lo largo del tiempo (un valor por dia). Sigue
 * la guia de visualizacion del proyecto: columnas de hasta 24 px con el
 * extremo redondeado, cuadricula de 1 px recesiva, etiqueta solo en el maximo
 * y en el ultimo dia, tooltip al pasar el mouse o con el teclado y una vista
 * de tabla para quien no puede leer el grafico.
 */
@Component({
  selector: 'app-grafico-columnas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (verTabla()) {
      <div class="max-h-64 overflow-auto rounded-lg border border-border">
        <table class="w-full text-left text-sm">
          <caption class="sr-only">{{ titulo() }}</caption>
          <thead class="sticky top-0 bg-muted text-xs text-muted-foreground">
            <tr>
              <th scope="col" class="px-3 py-2 font-semibold">Fecha</th>
              <th scope="col" class="px-3 py-2 text-right font-semibold">{{ titulo() }}</th>
            </tr>
          </thead>
          <tbody>
            @for (p of puntos(); track p.detalle) {
              <tr class="border-t border-border">
                <td class="px-3 py-1.5">{{ p.detalle }}</td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ texto(p.valor) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @for (ref of referencias(); track ref.etiqueta) {
        <p class="mt-2 text-xs text-muted-foreground">{{ ref.etiqueta }}: {{ texto(ref.valor) }}</p>
      }
    } @else if (puntos().length === 0) {
      <p class="grid h-[220px] place-items-center text-sm text-muted-foreground">Sin datos en el periodo.</p>
    } @else {
      <div class="relative" (pointerleave)="activo.set(null)">
        <svg
          [attr.viewBox]="'0 0 ' + ancho() + ' ' + alto"
          [attr.width]="ancho()"
          [attr.height]="alto"
          class="block max-w-full overflow-visible"
          role="img"
          [attr.aria-label]="titulo() + ': ' + resumenAccesible()"
        >
          <!-- Cuadricula y eje Y -->
          @for (t of geometria().ticks; track t.valor) {
            <line [attr.x1]="margen.izquierda" [attr.x2]="ancho() - margen.derecha" [attr.y1]="t.y" [attr.y2]="t.y" class="stroke-border" stroke-width="1" />
            <text [attr.x]="margen.izquierda - 8" [attr.y]="t.y" text-anchor="end" dominant-baseline="middle" class="fill-muted-foreground text-[11px] tabular-nums">
              {{ t.texto }}
            </text>
          }

          @for (c of geometria().columnas; track c.i) {
            @if (c.d) {
              <path [attr.d]="c.d" class="fill-primary transition-opacity" [class.opacity-60]="activo() !== null && activo() !== c.i" />
            } @else {
              <!-- Dia sin eventos del indicador: una marca en la base, no una columna en cero -->
              <line [attr.x1]="c.x + c.w / 2 - 4" [attr.x2]="c.x + c.w / 2 + 4" [attr.y1]="geometria().base" [attr.y2]="geometria().base" class="stroke-muted-foreground" stroke-width="2" stroke-linecap="round" />
            }
            @if (c.etiquetaValor) {
              <text [attr.x]="c.x + c.w / 2" [attr.y]="c.yTope - 6" text-anchor="middle" class="fill-foreground text-[11px] font-semibold tabular-nums">{{ c.etiquetaValor }}</text>
            }
            @if (c.mostrarEje) {
              <text [attr.x]="c.x + c.w / 2" [attr.y]="alto - 8" text-anchor="middle" class="fill-muted-foreground text-[11px]">{{ c.etiqueta }}</text>
            }
            <!-- Zona de interaccion: toda la franja, mas grande que la columna -->
            <rect
              [attr.x]="c.banda"
              [attr.y]="margen.arriba"
              [attr.width]="c.anchoBanda"
              [attr.height]="geometria().base - margen.arriba"
              fill="transparent"
              tabindex="0"
              class="cursor-default outline-none focus-visible:stroke-ring focus-visible:stroke-2"
              [attr.aria-label]="c.detalle + ': ' + texto(c.valor)"
              (pointerenter)="activo.set(c.i)"
              (focus)="activo.set(c.i)"
              (blur)="activo.set(null)"
            />
          }
          <line [attr.x1]="margen.izquierda" [attr.x2]="ancho() - margen.derecha" [attr.y1]="geometria().base" [attr.y2]="geometria().base" class="stroke-muted-foreground/40" stroke-width="1" />
          @for (ref of geometria().referencias; track ref.texto) {
            <!-- Referencia: linea neutra (no es una serie), con su texto al extremo derecho -->
            <line
              [attr.x1]="margen.izquierda"
              [attr.x2]="ancho() - margen.derecha"
              [attr.y1]="ref.y"
              [attr.y2]="ref.y"
              class="pointer-events-none stroke-foreground/55"
              stroke-width="1.5"
              [attr.stroke-dasharray]="ref.punteada ? '6 4' : null"
            />
          }
        </svg>

        @if (geometria().referencias.length) {
          <!-- Leyenda de las lineas de referencia: fuera del area del grafico, para no tapar columnas -->
          <ul class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            @for (ref of geometria().referencias; track ref.texto) {
              <li class="flex items-center gap-2">
                <svg width="18" height="6" aria-hidden="true">
                  <line x1="0" x2="18" y1="3" y2="3" class="stroke-foreground/55" stroke-width="1.5" [attr.stroke-dasharray]="ref.punteada ? '4 3' : null" />
                </svg>
                <span class="font-semibold text-foreground">{{ ref.texto }}</span>
              </li>
            }
          </ul>
        }
        @if (tooltip(); as t) {
          <div
            class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-modal"
            [style.left.px]="t.x"
            [style.top.px]="t.y"
            role="status"
          >
            <p class="text-sm font-semibold tabular-nums text-foreground">{{ t.valor }}</p>
            <p class="flex items-center gap-1.5 text-muted-foreground">
              <span class="inline-block h-0.5 w-3 rounded-full bg-primary"></span>{{ t.detalle }}
            </p>
          </div>
        }
      </div>
    }
  `,
})
export class GraficoColumnasComponent {
  readonly titulo = input.required<string>();
  /** Los valores ausentes (null o undefined, el backend omite los nulos) cuentan como "sin eventos". */
  readonly puntos = input.required<PuntoSerie[], PuntoSerie[]>({
    transform: (puntos) => puntos.map((p) => ({ ...p, valor: p.valor ?? null })),
  });
  readonly unidad = input('');
  readonly decimales = input(1);
  /** Fija el maximo del eje (p. ej. 100 para porcentajes). */
  readonly maximo = input<number | null>(null);
  readonly verTabla = input(false);
  /** Lineas de referencia (p. ej. promedio del pretest y del postest importado). */
  readonly referencias = input<ReferenciaSerie[]>([]);

  protected readonly alto = ALTO;
  protected readonly margen = MARGEN;
  protected readonly activo = signal<number | null>(null);
  protected readonly ancho = signal(560);

  constructor() {
    const elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const observador = new ResizeObserver(([entrada]) => {
      const w = Math.floor(entrada.contentRect.width);
      if (w > 0) this.ancho.set(Math.max(280, w));
    });
    observador.observe(elemento);
    inject(DestroyRef).onDestroy(() => observador.disconnect());
  }

  protected readonly geometria = computed(() => {
    const puntos = this.puntos();
    const ancho = this.ancho();
    const valores = puntos.map((p) => p.valor).filter((v): v is number => v !== null);
    const maximoDato = Math.max(0, ...valores, ...this.referencias().map((r) => r.valor));
    // Conteos (sin decimales): tope multiplo de 4 para que las 4 divisiones del eje sean enteras.
    const tope = this.maximo() ?? (this.decimales() === 0 ? Math.max(4, Math.ceil(maximoDato / 4) * 4) : escalaLimpia(maximoDato));
    const base = ALTO - MARGEN.abajo;
    const altoUtil = base - MARGEN.arriba;
    const y = (v: number) => base - (tope === 0 ? 0 : (v / tope) * altoUtil);

    const anchoBanda = (ancho - MARGEN.izquierda - MARGEN.derecha) / Math.max(1, puntos.length);
    const w = Math.min(ANCHO_MAX_COLUMNA, Math.max(4, anchoBanda * 0.6));
    const pasoEje = Math.max(1, Math.ceil(puntos.length / Math.floor((ancho - MARGEN.izquierda) / 56)));
    const iMax = valores.length ? puntos.findIndex((p) => p.valor === Math.max(...valores)) : -1;
    let iUltimo = -1;
    puntos.forEach((p, i) => {
      if (p.valor !== null) iUltimo = i;
    });

    const columnas = puntos.map((p, i) => {
      const banda = MARGEN.izquierda + i * anchoBanda;
      const x = banda + (anchoBanda - w) / 2;
      const yTope = p.valor === null ? base : y(p.valor);
      const alto = base - yTope;
      return {
        i,
        x,
        w,
        banda,
        anchoBanda,
        yTope,
        valor: p.valor,
        etiqueta: p.etiqueta,
        detalle: p.detalle,
        d: p.valor === null ? null : columna(x, yTope, w, alto),
        etiquetaValor: (i === iMax || i === iUltimo) && p.valor !== null ? this.numero(p.valor) : null,
        mostrarEje: i % pasoEje === 0 || i === puntos.length - 1,
      };
    });

    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
      const valor = tope * f;
      // Decimales justos para que cada division se lea exacta (7.5, no 8).
      const paso = tope / 4;
      const decimalesEje = Number.isInteger(paso) ? 0 : Number.isInteger(paso * 10) ? 1 : 2;
      return { valor, y: y(valor), texto: this.numero(valor, decimalesEje) };
    });
    const referencias = this.referencias().map((ref, i) => ({
      y: y(Math.min(ref.valor, tope)),
      texto: `${ref.etiqueta}: ${this.numero(ref.valor)}${this.unidad() ? ' ' + this.unidad() : ''}`,
      // La segunda referencia va punteada para distinguirla sin depender del color
      punteada: i > 0,
    }));
    return { columnas, ticks, base, referencias };
  });

  protected readonly tooltip = computed(() => {
    const i = this.activo();
    if (i === null) return null;
    const c = this.geometria().columnas[i];
    if (!c) return null;
    return { x: c.x + c.w / 2, y: Math.min(c.yTope, this.geometria().base) - 10, valor: this.texto(c.valor), detalle: c.detalle };
  });

  protected readonly resumenAccesible = computed(() => {
    const conDato = this.puntos().filter((p) => p.valor !== null);
    if (conDato.length === 0) return 'sin datos';
    const ultimo = conDato[conDato.length - 1];
    return `${conDato.length} días con datos; último ${ultimo.detalle}: ${this.texto(ultimo.valor)}`;
  });

  protected texto(v: number | null | undefined): string {
    return v == null ? 'Sin eventos ese día' : `${this.numero(v)}${this.unidad() ? ' ' + this.unidad() : ''}`;
  }

  private numero(v: number, decimales = this.decimales()): string {
    return v.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: decimales });
  }
}

/** Columna con el extremo superior redondeado y la base recta. */
function columna(x: number, y: number, w: number, alto: number): string {
  const r = Math.min(RADIO, w / 2, alto);
  const base = y + alto;
  if (alto <= 0) return '';
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${base} Z`;
}

/** Tope del eje redondeado a un numero limpio (1, 2, 2.5, 5 × 10^n). */
export function escalaLimpia(maximo: number): number {
  if (maximo <= 0) return 1;
  const potencia = 10 ** Math.floor(Math.log10(maximo));
  const paso = [1, 2, 2.5, 5, 10].find((m) => m * potencia >= maximo) ?? 10;
  return paso * potencia;
}
