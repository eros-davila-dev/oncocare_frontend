import { Component, ContentChild, ContentChildren, QueryList, TemplateRef, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { PaginationComponent } from '../pagination/pagination';
import { SkeletonRowsComponent } from '../skeleton-rows/skeleton-rows';
import { EmptyStateComponent } from '../empty-state/empty-state';
import { CellTemplateDirective } from './cell-template.directive';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../constants/paginacion';

export interface ColumnaTabla<T> {
  encabezado: string;
  valor: (fila: T) => string | number;
  /** Si se define, la celda se renderiza con <ng-template uiCellTemplate="clave"> en vez de `valor()`. */
  clave?: string;
}

/**
 * Tabla generica con paginacion integrada: espejo literal de la tabla de
 * routes/index.tsx (thead bg-muted/70, filas border-t border-border,
 * hover:bg-muted/40).
 */
@Component({
  selector: 'ui-data-table',
  imports: [PaginationComponent, SkeletonRowsComponent, EmptyStateComponent, NgTemplateOutlet],
  host: { class: 'block' },
  template: `
    <div
      class="overflow-x-auto"
      [class]="envolver() ? 'rounded-xl border border-border bg-background shadow-card' : ''"
    >
      @if (cargando()) {
        <ui-skeleton-rows [cantidadColumnas]="columnas().length" />
      } @else if (items().length === 0) {
        <ui-empty-state [titulo]="mensajeVacio()" />
      } @else {
        <table class="w-full border-collapse text-left text-sm">
          <thead class="bg-muted/70 text-xs text-muted-foreground">
            <tr>
              @for (columna of columnas(); track columna.encabezado) {
                <th class="px-3 py-4 font-semibold">{{ columna.encabezado }}</th>
              }
              @if (plantillaAcciones) {
                <th class="px-3 py-4 font-semibold">
                  <span class="sr-only">Acciones</span>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (fila of items(); track $index) {
              <tr class="border-t border-border transition-colors hover:bg-muted/40">
                @for (columna of columnas(); track columna.encabezado) {
                  <td class="break-words px-3 py-3">
                    @if (columna.clave && plantillaPara(columna.clave); as plantilla) {
                      <ng-container [ngTemplateOutlet]="plantilla" [ngTemplateOutletContext]="{ $implicit: fila }" />
                    } @else {
                      {{ columna.valor(fila) }}
                    }
                  </td>
                }
                @if (plantillaAcciones) {
                  <td class="relative px-3 py-3 text-right">
                    <ng-container [ngTemplateOutlet]="plantillaAcciones" [ngTemplateOutletContext]="{ $implicit: fila }" />
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      }

      <ui-pagination
        [totalElements]="totalElements()"
        [totalPages]="totalPages()"
        [pageNumber]="pageNumber()"
        [pageSize]="pageSize()"
        (cambiarPagina)="cambiarPagina.emit($event)"
      />
    </div>
  `,
})
export class DataTableComponent<T> {
  items = input.required<T[]>();
  columnas = input.required<ColumnaTabla<T>[]>();
  cargando = input(false);
  mensajeVacio = input('No se encontraron resultados');
  /** false: sin borde/sombra/fondo propios, para embeberse en una tarjeta contenedora. */
  envolver = input(true);

  totalElements = input(0);
  totalPages = input(0);
  pageNumber = input(0);
  pageSize = input(TAMANO_PAGINA_POR_DEFECTO);

  cambiarPagina = output<number>();

  @ContentChild('accionesFila') plantillaAcciones?: TemplateRef<{ $implicit: T }>;
  @ContentChildren(CellTemplateDirective) plantillasCelda?: QueryList<CellTemplateDirective>;

  plantillaPara(clave: string): TemplateRef<{ $implicit: unknown }> | undefined {
    return this.plantillasCelda?.find((plantilla) => plantilla.clave === clave)?.template;
  }
}
