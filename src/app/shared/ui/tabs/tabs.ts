import { Component, input, output } from '@angular/core';

/**
 * Tabs simples sin ContentChildren: el consumidor mantiene el estado de la
 * pestana activa y renderiza cada panel condicionalmente con @if/@switch. Se
 * usa en el formulario de paciente (por seccion) y en el detalle de paciente.
 */
@Component({
  selector: 'ui-tabs',
  host: { class: 'block' },
  template: `
    <div
      class="flex min-w-0 gap-6 overflow-x-auto"
      [class]="conBorde() ? 'border-b border-border' : ''"
    >
      @for (tab of tabs(); track tab) {
        <button
          type="button"
          class="min-h-14 shrink-0 whitespace-nowrap border-b-2 px-1 text-sm font-semibold transition-colors"
          [class]="tab === activa() ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
          (click)="cambiarTab.emit(tab)"
        >
          {{ tab }}
        </button>
      }
    </div>
  `,
})
export class TabsComponent<T extends string> {
  tabs = input.required<readonly T[]>();
  activa = input.required<T>();
  /** false: sin linea base propia, para embeberse en un contenedor que ya trae su propio borde. */
  conBorde = input(true);
  cambiarTab = output<T>();
}
