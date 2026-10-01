import { Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon';

interface PosicionMenu {
  top: number;
  left: number;
}

/**
 * Menu "⋮" reutilizable para las acciones de fila en las tablas, en vez de
 * amontonar botones de texto. Reemplaza unicamente lo que se proyecta dentro
 * de <ng-template #accionesFila> en DataTableComponent; su API no cambia.
 *
 * El menu se posiciona con `position: fixed` calculado en JS (no
 * `absolute` relativo a la fila) porque la tabla envolvente usa
 * `overflow-x-auto`: por especificacion CSS, un `overflow-x` distinto de
 * `visible` fuerza a `overflow-y` a comportarse como `auto` tambien, asi
 * que un menu `absolute` quedaba recortado y disparaba un scroll interno no
 * deseado en la tabla en vez de superponerse a la pagina.
 */
@Component({
  selector: 'ui-row-actions',
  imports: [IconComponent],
  host: { class: 'inline-block' },
  template: `
    <div class="relative inline-block text-left">
      <button
        type="button"
        class="flex min-w-11 min-h-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        (click)="alternar($event)"
        aria-label="Abrir acciones"
      >
        <ui-icon name="ellipsis-vertical" [size]="18" />
      </button>

      @if (abierto()) {
        <div
          class="fixed z-50 w-44 rounded-lg border border-border bg-background p-1 shadow-modal"
          [style.top.px]="posicion().top"
          [style.left.px]="posicion().left"
        >
          <ng-content />
        </div>
      }
    </div>
  `,
})
export class RowActionsComponent {
  private readonly elementRef = inject(ElementRef);

  protected readonly abierto = signal(false);
  protected readonly posicion = signal<PosicionMenu>({ top: 0, left: 0 });

  private static readonly ANCHO_MENU = 176;

  protected alternar(evento: MouseEvent): void {
    evento.stopPropagation();
    if (!this.abierto()) {
      const boton = (evento.currentTarget as HTMLElement).getBoundingClientRect();
      this.posicion.set({
        top: boton.bottom + 4,
        left: Math.max(8, boton.right - RowActionsComponent.ANCHO_MENU),
      });
    }
    this.abierto.update((valor) => !valor);
  }

  @HostListener('document:click', ['$event'])
  protected alClickFuera(evento: MouseEvent): void {
    if (this.abierto() && !this.elementRef.nativeElement.contains(evento.target)) {
      this.abierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected alPresionarEscape(): void {
    this.abierto.set(false);
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  protected alDesplazarOResize(): void {
    this.abierto.set(false);
  }
}
