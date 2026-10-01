import { Component, input, output } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon';
import { ModalComponent } from '../../ui/modal/modal';
import { ButtonComponent } from '../../ui/button/button';

export type VarianteConfirmDialog = 'danger' | 'warning';

@Component({
  selector: 'ui-confirm-dialog',
  imports: [ModalComponent, ButtonComponent, IconComponent],
  template: `
    <ui-modal [abierto]="abierto()" ancho="sm" (cerrar)="cancelar.emit()">
      <div class="flex flex-col items-center text-center">
        <span [class]="clasesIcono()">
          <ui-icon [name]="variante() === 'danger' ? 'trash' : 'triangle-alert'" [size]="24" />
        </span>

        <h2 class="mt-4 font-display text-base font-bold">{{ titulo() }}</h2>
        <p class="mt-1.5 text-sm text-muted-foreground">{{ mensaje() }}</p>

        @if (detalle()) {
          <div class="mt-3 w-full rounded-lg bg-muted p-3 text-left text-sm text-foreground">
            {{ detalle() }}
          </div>
        }

        <div class="mt-6 flex w-full justify-center gap-2">
          <ui-button variante="outline" [anchoCompleto]="true" (click)="cancelar.emit()">Cancelar</ui-button>
          <ui-button
            [variante]="variante() === 'danger' ? 'danger' : 'primary'"
            [anchoCompleto]="true"
            (click)="confirmar.emit()"
          >
            {{ textoConfirmar() }}
          </ui-button>
        </div>
      </div>
    </ui-modal>
  `,
})
export class ConfirmDialogComponent {
  titulo = input('Confirmar accion');
  mensaje = input('¿Esta seguro de continuar?');
  detalle = input('');
  textoConfirmar = input('Confirmar');
  variante = input<VarianteConfirmDialog>('danger');
  abierto = input(false);

  confirmar = output<void>();
  cancelar = output<void>();

  clasesIcono(): string {
    const base = 'flex size-14 items-center justify-center rounded-full';
    return this.variante() === 'danger' ? `${base} bg-destructive-soft text-destructive` : `${base} bg-warning-soft text-warning`;
  }
}
