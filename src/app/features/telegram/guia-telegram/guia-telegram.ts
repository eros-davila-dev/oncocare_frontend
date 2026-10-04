import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toDataURL } from 'qrcode';
import { TelegramService } from '../telegram.service';
import { PasosTelegramComponent } from '../pasos-telegram/pasos-telegram';

/**
 * Guia publica e imprimible para activar los recordatorios por Telegram con
 * el QR comun del bot. Pensada para recepcion y la sala de espera: una hoja
 * con el codigo, los 3 pasos y el aviso de seguridad, sin enlaces personales.
 */
@Component({
  selector: 'app-guia-telegram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PasosTelegramComponent],
  template: `
    <article class="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 print:border-0 print:p-0">
      <p class="text-sm font-semibold text-primary">Recordatorios de citas</p>
      <h1 class="mt-1 font-display text-2xl font-bold sm:text-3xl">Recibe el aviso de tus citas en Telegram</h1>
      <p class="mt-2 text-sm text-muted-foreground">
        Te avisamos antes de cada cita y puedes confirmarla o cancelarla con un botón. También sirve para el familiar o
        la persona que te acompaña. Es gratis y opcional.
      </p>

      @if (bot(); as b) {
        @if (b.disponible) {
          <div class="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            @if (qr()) {
              <div class="text-center">
                <img [src]="qr()" alt="Código QR del bot de la fundación" class="size-52 rounded-xl border border-border bg-white p-3" />
                <p class="mt-2 font-mono text-sm font-semibold">{{ '@' + b.usuario }}</p>
              </div>
            }
            <div class="min-w-0 flex-1">
              <app-pasos-telegram [usuarioBot]="b.usuario" />
            </div>
          </div>

          <div class="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div class="rounded-lg border border-border p-3">
              <p class="font-semibold">¿No tienes Telegram?</p>
              <p class="mt-1 text-muted-foreground">
                Descárgalo gratis desde Play Store o App Store. Si prefieres no usarlo, recepción te llamará un día antes de tu cita.
              </p>
            </div>
            <div class="rounded-lg border border-border p-3">
              <p class="font-semibold">¿El bot no encuentra tu número?</p>
              <p class="mt-1 text-muted-foreground">Acércate a recepción para revisar el número registrado en tu ficha.</p>
            </div>
          </div>

          <div class="mt-6 flex justify-end print:hidden">
            <button type="button" (click)="imprimir()"
                    class="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
              Imprimir esta guía
            </button>
          </div>
        } @else {
          <p class="mt-6 text-sm text-muted-foreground">Los recordatorios por Telegram aún no están disponibles.</p>
        }
      }
    </article>
  `,
})
export class GuiaTelegramComponent {
  private readonly telegramService = inject(TelegramService);

  protected readonly bot = signal<{ disponible: boolean; usuario: string | null } | null>(null);
  protected readonly qr = signal<string | null>(null);

  constructor() {
    this.telegramService.bot().subscribe({
      next: async (b) => {
        this.bot.set(b);
        if (b.enlace) {
          this.qr.set(await toDataURL(b.enlace, { width: 400, margin: 1 }));
        }
      },
      error: () => this.bot.set({ disponible: false, usuario: null }),
    });
  }

  protected imprimir(): void {
    window.print();
  }
}
