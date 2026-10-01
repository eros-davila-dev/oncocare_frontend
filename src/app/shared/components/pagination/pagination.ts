import { Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../constants/paginacion';

/** Un numero de pagina o un separador "..." cuando hay demasiadas paginas para listarlas todas. */
type ItemPaginacion = number | 'salto';

/**
 * Paginador reutilizable, espejo literal del footer de routes/index.tsx
 * ("Mostrando X a Y de Z resultados" + nav de botones). Opera unicamente
 * sobre el contrato {totalElements, totalPages, pageNumber, pageSize} que
 * devuelve cualquier listado paginado de la API.
 */
@Component({
  selector: 'ui-pagination',
  imports: [IconComponent],
  template: `
    @if (totalPages() > 1) {
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border p-4 text-xs text-muted-foreground sm:px-6">
        <span class="truncate">
          Mostrando <span class="font-medium text-foreground">{{ desde() }}</span> a
          <span class="font-medium text-foreground">{{ hasta() }}</span> de
          <span class="font-medium text-foreground">{{ totalElements() }}</span> resultados
        </span>
        <nav class="flex items-center gap-1" aria-label="Paginación">
          <button
            type="button"
            class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            [disabled]="pageNumber() === 0"
            (click)="cambiarPagina.emit(pageNumber() - 1)"
            aria-label="Página anterior"
          >
            <ui-icon name="chevron-left" [size]="17" />
          </button>

          @for (item of itemsPaginacion(); track $index) {
            @if (item === 'salto') {
              <span class="px-1.5">&hellip;</span>
            } @else {
              <button
                type="button"
                class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sm font-semibold transition-colors"
                [class]="
                  item === pageNumber()
                    ? 'bg-primary text-primary-foreground shadow-button'
                    : 'border border-border bg-background text-foreground hover:bg-muted'
                "
                [attr.aria-current]="item === pageNumber() ? 'page' : null"
                (click)="cambiarPagina.emit(item)"
              >
                {{ item + 1 }}
              </button>
            }
          }

          <button
            type="button"
            class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            [disabled]="esUltimaPagina()"
            (click)="cambiarPagina.emit(pageNumber() + 1)"
            aria-label="Página siguiente"
          >
            <ui-icon name="chevron-right" [size]="17" />
          </button>
        </nav>
      </div>
    }
  `,
})
export class PaginationComponent {
  totalElements = input.required<number>();
  totalPages = input.required<number>();
  pageNumber = input.required<number>();
  pageSize = input(TAMANO_PAGINA_POR_DEFECTO);

  cambiarPagina = output<number>();

  esUltimaPagina = computed(() => this.pageNumber() >= this.totalPages() - 1);

  desde = computed(() => (this.totalElements() === 0 ? 0 : this.pageNumber() * this.pageSize() + 1));
  hasta = computed(() => Math.min(this.totalElements(), (this.pageNumber() + 1) * this.pageSize()));

  itemsPaginacion = computed<ItemPaginacion[]>(() => {
    const total = this.totalPages();
    const actual = this.pageNumber();
    const maxVisibles = 5;

    if (total <= maxVisibles + 2) {
      return Array.from({ length: total }, (_, i) => i);
    }

    const items = new Set<number>([0, total - 1, actual]);
    for (let delta = 1; delta <= 2; delta++) {
      if (actual - delta >= 0) {
        items.add(actual - delta);
      }
      if (actual + delta <= total - 1) {
        items.add(actual + delta);
      }
    }

    const ordenados = [...items].sort((a, b) => a - b);
    const resultado: ItemPaginacion[] = [];
    for (let i = 0; i < ordenados.length; i++) {
      if (i > 0 && ordenados[i] - ordenados[i - 1] > 1) {
        resultado.push('salto');
      }
      resultado.push(ordenados[i]);
    }
    return resultado;
  });
}
