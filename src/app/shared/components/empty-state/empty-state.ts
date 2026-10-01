import { Component, input } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon';

export type VarianteEmptyState = 'vacio' | 'error';

/**
 * Estado vacio/error amigable para tablas y listados, en vez de un mensaje de
 * texto plano. DataTableComponent lo usa internamente para su estado vacio,
 * reutilizando el mismo input `mensajeVacio: string` que ya reciben las 6
 * pantallas de listado (sin romper su API).
 */
@Component({
  selector: 'ui-empty-state',
  imports: [IconComponent],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <span [class]="clasesIcono()">
        <ui-icon [name]="variante() === 'error' ? 'circle-alert' : 'inbox'" [size]="24" />
      </span>
      <div>
        <p class="text-sm font-medium text-foreground">{{ titulo() }}</p>
        @if (descripcion()) {
          <p class="mt-1 text-sm text-muted-foreground">{{ descripcion() }}</p>
        }
      </div>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  titulo = input.required<string>();
  descripcion = input('');
  variante = input<VarianteEmptyState>('vacio');

  clasesIcono(): string {
    const base = 'flex size-12 items-center justify-center rounded-full';
    return this.variante() === 'error' ? `${base} bg-destructive-soft text-destructive` : `${base} bg-muted text-muted-foreground`;
  }
}
