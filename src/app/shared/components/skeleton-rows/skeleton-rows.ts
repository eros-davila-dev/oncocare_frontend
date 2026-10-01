import { Component, input } from '@angular/core';

/**
 * Filas "esqueleto" para el estado de carga de una tabla, en vez de una
 * pantalla vacia o un spinner generico mientras llegan los datos.
 */
@Component({
  selector: 'ui-skeleton-rows',
  template: `
    <div class="animate-pulse divide-y divide-border">
      @for (fila of filas(); track $index) {
        <div class="flex items-center gap-4 px-4 py-4">
          @for (columna of columnas(); track $index) {
            <div class="h-3.5 flex-1 rounded bg-muted"></div>
          }
        </div>
      }
    </div>
  `,
})
export class SkeletonRowsComponent {
  cantidadFilas = input(5);
  cantidadColumnas = input(4);

  filas(): number[] {
    return Array.from({ length: this.cantidadFilas() });
  }

  columnas(): number[] {
    return Array.from({ length: this.cantidadColumnas() });
  }
}
