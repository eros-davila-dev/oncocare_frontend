import { Component, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon';

/** Espejo literal de components/ui/modal.tsx del diseño real. */
@Component({
  selector: 'ui-modal',
  imports: [IconComponent],
  host: { class: 'contents' },
  template: `
    @if (abierto()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-overlay p-4" (click)="cerrar.emit()">
        <div
          class="max-h-[92vh] w-full overflow-y-auto rounded-xl bg-background shadow-modal"
          [class]="anchoClase()"
          (click)="$event.stopPropagation()"
        >
          <header class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 border-b border-border p-6">
            <div class="min-w-0">
              @if (titulo()) {
                <h2 class="font-display text-xl font-bold">{{ titulo() }}</h2>
              }
              @if (descripcion()) {
                <p class="mt-1 text-sm text-muted-foreground">{{ descripcion() }}</p>
              }
            </div>
            <button
              type="button"
              class="flex min-w-11 items-center justify-center rounded-lg py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              (click)="cerrar.emit()"
              aria-label="Cerrar modal"
            >
              <ui-icon name="x" [size]="20" />
            </button>
          </header>
          <div class="p-6">
            <ng-content />
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  titulo = input('');
  descripcion = input('');
  abierto = input(false);
  ancho = input<'sm' | 'md' | 'lg'>('md');
  cerrar = output<void>();

  private readonly anchos: Record<'sm' | 'md' | 'lg', string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  anchoClase(): string {
    return this.anchos[this.ancho()];
  }
}
