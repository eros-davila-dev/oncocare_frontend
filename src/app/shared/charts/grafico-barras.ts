import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

export interface ItemBarra {
  etiqueta: string;
  valor: number;
}

/**
 * Barras horizontales de una sola medida por categoria (p. ej. consultas por
 * tema). Barras de 20 px con el extremo redondeado y el valor en la punta; el
 * nombre de la categoria va como texto, nunca en el color de la barra.
 */
@Component({
  selector: 'app-grafico-barras',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (filas().length === 0) {
      <p class="grid h-24 place-items-center text-sm text-muted-foreground">Sin datos en el periodo.</p>
    } @else {
      <ul class="space-y-3" [attr.aria-label]="titulo()">
        @for (f of filas(); track f.etiqueta; let i = $index) {
          <li
            tabindex="0"
            class="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            [attr.aria-label]="f.etiqueta + ': ' + f.texto"
            (pointerenter)="activo.set(i)"
            (pointerleave)="activo.set(null)"
            (focus)="activo.set(i)"
            (blur)="activo.set(null)"
          >
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="truncate text-foreground">{{ f.etiqueta }}</span>
              <span class="shrink-0 font-semibold tabular-nums text-foreground">{{ f.texto }}</span>
            </div>
            <div class="mt-1 h-5">
              <div
                class="h-5 rounded-r-[4px] bg-primary transition-opacity"
                [class.opacity-60]="activo() !== null && activo() !== i"
                [style.width.%]="f.porcentaje"
                [style.min-width.px]="f.valor > 0 ? 4 : 0"
              ></div>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class GraficoBarrasComponent {
  readonly titulo = input.required<string>();
  readonly items = input.required<ItemBarra[]>();
  readonly unidad = input('');
  /** Si se da, el texto incluye el porcentaje del total. */
  readonly mostrarPorcentaje = input(false);

  protected readonly activo = signal<number | null>(null);

  protected readonly filas = computed(() => {
    const items = [...this.items()].sort((a, b) => b.valor - a.valor);
    const maximo = Math.max(1, ...items.map((i) => i.valor));
    const total = items.reduce((s, i) => s + i.valor, 0);
    return items.map((i) => ({
      ...i,
      porcentaje: (i.valor / maximo) * 100,
      texto:
        i.valor.toLocaleString('es-PE') +
        (this.unidad() ? ' ' + this.unidad() : '') +
        (this.mostrarPorcentaje() && total > 0 ? ` (${Math.round((i.valor / total) * 100)} %)` : ''),
    }));
  });
}
