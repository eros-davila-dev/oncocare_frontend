import { Component, inject } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon';
import { ToastService } from './toast.service';

@Component({
  selector: 'ui-toast-notification',
  imports: [IconComponent],
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="flex w-80 cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 shadow-modal"
          (click)="toastService.cerrar(toast.id)"
        >
          <span [class]="clasesIcono(toast.tipo)">
            <ui-icon [name]="iconoPorTipo(toast.tipo)" [size]="18" />
          </span>
          <p class="flex-1 text-sm text-foreground">{{ toast.mensaje }}</p>
        </div>
      }
    </div>
  `,
})
export class ToastNotificationComponent {
  protected readonly toastService = inject(ToastService);

  iconoPorTipo(tipo: string): 'circle-check-big' | 'circle-x' | 'info' {
    if (tipo === 'exito') return 'circle-check-big';
    if (tipo === 'error') return 'circle-x';
    return 'info';
  }

  clasesIcono(tipo: string): string {
    const base = 'flex size-8 shrink-0 items-center justify-center rounded-full';
    const colores: Record<string, string> = {
      exito: 'bg-success-soft text-success',
      error: 'bg-destructive-soft text-destructive',
      info: 'bg-primary-soft text-primary',
    };
    return `${base} ${colores[tipo] ?? colores['info']}`;
  }
}
