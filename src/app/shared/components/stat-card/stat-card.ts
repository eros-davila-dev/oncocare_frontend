import { Component, input } from '@angular/core';

/** Espejo literal de .metric-card (styles.css) + el bloque de metricas de routes/index.tsx. */
@Component({
  selector: 'ui-stat-card',
  host: { class: 'block' },
  template: `
    <article class="metric-card">
      <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
        <ng-content select="[icono]" />
      </div>
      <div class="min-w-0">
        <p class="text-xl font-bold">{{ valor() }}</p>
        <p class="truncate text-xs text-muted-foreground">{{ etiqueta() }}</p>
      </div>
      @if (variacion() != null) {
        <span
          class="ml-auto hidden shrink-0 rounded-full px-2 py-1 text-[10px] font-bold sm:block"
          [class]="variacion()! >= 0 ? 'bg-success-soft text-success' : 'bg-destructive-soft text-destructive'"
        >
          {{ variacion()! >= 0 ? '↑' : '↓' }} {{ formatoVariacion(variacion()!) }}
        </span>
      }
    </article>
  `,
})
export class StatCardComponent {
  etiqueta = input.required<string>();
  valor = input.required<string | number>();
  variacion = input<number | null>(null);

  formatoVariacion(valor: number): string {
    return `${Math.abs(valor).toFixed(1)}%`;
  }
}
