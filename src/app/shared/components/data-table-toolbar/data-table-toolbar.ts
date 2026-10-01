import { Component, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '../../ui/icon/icon';

/**
 * Barra de busqueda + filtros para las pantallas de listado. La busqueda es
 * opcional (algunas listas solo necesitan filtros): si no se pasa
 * [buscarControl], simplemente no se renderiza el input.
 */
@Component({
  selector: 'ui-data-table-toolbar',
  imports: [ReactiveFormsModule, IconComponent],
  host: { class: 'block' },
  template: `
    <div
      class="flex flex-wrap items-center gap-3 p-4"
      [class]="envolver() ? 'rounded-xl border border-border bg-background shadow-card' : 'border-b border-border'"
    >
      @if (buscarControl()) {
        <div class="relative min-w-[220px] flex-1">
          <ui-icon name="search" [size]="17" clase="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="search" [formControl]="buscarControl()!" [placeholder]="placeholderBusqueda()" class="field pl-10" />
        </div>
      }

      <div class="flex flex-wrap items-center gap-2">
        <ng-content select="[filtros]" />
      </div>

      <div class="ml-auto flex items-center gap-2">
        <ng-content select="[acciones]" />
      </div>
    </div>
  `,
})
export class DataTableToolbarComponent {
  buscarControl = input<FormControl<string> | null>(null);
  placeholderBusqueda = input('Buscar...');
  /** false: sin borde/sombra/fondo propios, para embeberse en una tarjeta contenedora. */
  envolver = input(true);
}
