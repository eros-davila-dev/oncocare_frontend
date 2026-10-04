import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TelegramService } from '../telegram.service';

const CLAVE_OCULTO = 'onco.aviso-telegram.oculto';

/**
 * Recordatorio amable en "Mis citas" mientras el paciente no vincule su
 * Telegram. Es recomendado, no obligatorio: se puede cerrar y no vuelve a
 * aparecer en ese navegador.
 */
@Component({
  selector: 'app-aviso-telegram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (visible()) {
      <div class="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary-soft px-4 py-3">
        <p class="text-sm">
          <strong>¿No quieres olvidar tus citas?</strong> Activa los recordatorios por Telegram (también para tu acompañante).
        </p>
        <div class="flex items-center gap-3">
          <a routerLink="/mi-perfil" fragment="telegram" class="text-sm font-semibold text-primary hover:underline">Activar</a>
          <button type="button" class="text-sm text-muted-foreground hover:text-foreground" (click)="ocultar()">Ahora no</button>
        </div>
      </div>
    }
  `,
})
export class AvisoTelegramComponent {
  protected readonly visible = signal(false);

  constructor() {
    if (this.leerOculto()) {
      return;
    }
    inject(TelegramService).estado().subscribe({
      next: (e) => this.visible.set(e.telegramDisponible && !e.vinculado),
      error: () => this.visible.set(false),
    });
  }

  protected ocultar(): void {
    this.visible.set(false);
    try {
      localStorage.setItem(CLAVE_OCULTO, '1');
    } catch {
      // sin almacenamiento (modo privado): solo se oculta en esta visita
    }
  }

  private leerOculto(): boolean {
    try {
      return localStorage.getItem(CLAVE_OCULTO) === '1';
    } catch {
      return false;
    }
  }
}
