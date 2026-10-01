import { Injectable, signal } from '@angular/core';

export type TipoToast = 'exito' | 'error' | 'info';

export interface Toast {
  id: number;
  tipo: TipoToast;
  mensaje: string;
}

let contadorId = 0;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly listaToasts = signal<Toast[]>([]);

  readonly toasts = this.listaToasts.asReadonly();

  mostrar(mensaje: string, tipo: TipoToast = 'info'): void {
    const id = contadorId++;
    this.listaToasts.update((actual) => [...actual, { id, tipo, mensaje }]);
    setTimeout(() => this.cerrar(id), 5000);
  }

  exito(mensaje: string): void {
    this.mostrar(mensaje, 'exito');
  }

  error(mensaje: string): void {
    this.mostrar(mensaje, 'error');
  }

  cerrar(id: number): void {
    this.listaToasts.update((actual) => actual.filter((toast) => toast.id !== id));
  }
}
