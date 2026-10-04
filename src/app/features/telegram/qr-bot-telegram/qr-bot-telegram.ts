import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toDataURL } from 'qrcode';
import { TelegramService } from '../telegram.service';

/**
 * QR comun del bot (el mismo para todos) con su nombre de usuario debajo,
 * para el inicio del portal. No aparece si Telegram no esta configurado.
 */
@Component({
  selector: 'app-qr-bot-telegram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (qr(); as codigo) {
      <div class="text-center">
        <img [src]="codigo" alt="Código QR del bot de la fundación en Telegram" class="size-40 rounded-xl border border-border bg-white p-2" />
        <p class="mt-2 font-mono text-sm font-semibold">{{ '@' + usuario() }}</p>
      </div>
    }
  `,
})
export class QrBotTelegramComponent {
  protected readonly qr = signal<string | null>(null);
  protected readonly usuario = signal<string | null>(null);

  constructor() {
    inject(TelegramService).bot().subscribe({
      next: async (b) => {
        if (b.disponible && b.enlace) {
          this.usuario.set(b.usuario);
          this.qr.set(await toDataURL(b.enlace, { width: 320, margin: 1 }));
        }
      },
      error: () => this.qr.set(null),
    });
  }
}
