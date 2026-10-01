import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { toDataURL } from 'qrcode';
import { EnlaceVinculacionTelegram, EstadoVinculacionTelegram, TelegramService } from '../telegram.service';
import { ErrorResponse } from '../../../core/models/error.model';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { BadgeComponent } from '../../../shared/ui/badge/badge';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';

/**
 * Vincular Telegram para recibir recordatorios con botones. En el celular el
 * paciente abre el enlace directamente; en recepcion escanea el QR con su
 * telefono. El enlace es de un solo uso y vence en 30 minutos.
 */
@Component({
  selector: 'app-vinculo-telegram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ButtonComponent, BadgeComponent],
  template: `
    <div class="rounded-xl border border-border bg-card p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="font-display text-base font-bold">Recordatorios por Telegram</h3>
          <p class="mt-1 text-sm text-muted-foreground">
            {{
              pacienteId()
                ? 'El paciente recibirá un aviso antes de cada cita y podrá confirmar o cancelar con un botón.'
                : 'Recibe un aviso antes de cada cita y confírmala o cancélala con un botón.'
            }}
          </p>
        </div>
        @if (estado(); as e) {
          <ui-badge [color]="e.vinculado ? 'success' : 'neutral'">{{ e.vinculado ? 'Vinculado' : 'Sin vincular' }}</ui-badge>
        }
      </div>

      @if (estado(); as e) {
        @if (!e.telegramDisponible) {
          <p class="mt-4 text-sm text-muted-foreground">Telegram aún no está habilitado en el sistema.</p>
        } @else if (e.vinculado && !enlace()) {
          <p class="mt-4 text-sm">Vinculado desde el {{ e.vinculadoEn | date: 'dd/MM/yyyy' }}.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <ui-button variante="outline" [cargando]="cargando()" (click)="generar()">Vincular otro teléfono</ui-button>
            <ui-button variante="ghost" [cargando]="cargando()" (click)="desvincular()">Dejar de recibir mensajes</ui-button>
          </div>
        } @else if (enlace(); as en) {
          <div class="mt-4 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
            @if (qr()) {
              <img [src]="qr()" alt="Código QR para vincular Telegram" class="size-44 rounded-lg border border-border bg-white p-2" />
            }
            <div class="min-w-0">
              <p class="text-sm">
                {{ pacienteId() ? 'Pida al paciente que escanee el código con la cámara de su celular' : 'Escanea el código con tu celular o toca el botón' }}
                y luego pulse <strong>Iniciar</strong> en Telegram.
              </p>
              <a
                [href]="en.enlace"
                target="_blank"
                rel="noopener"
                class="mt-3 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
              >
                Abrir en Telegram
              </a>
              <p class="mt-2 text-xs text-muted-foreground">Válido hasta las {{ en.expiraEn | date: 'HH:mm' }} y para un solo uso.</p>
              <ui-button class="mt-2 inline-block" variante="ghost" (click)="refrescar()">Ya lo vinculé</ui-button>
            </div>
          </div>
        } @else {
          <ui-button class="mt-4 inline-block" [cargando]="cargando()" (click)="generar()">Vincular Telegram</ui-button>
        }
      }
    </div>
  `,
})
export class VinculoTelegramComponent {
  private readonly telegramService = inject(TelegramService);
  private readonly toast = inject(ToastService);

  /** Vacio en el portal (paciente autenticado); el id del paciente en la intranet. */
  pacienteId = input<number | null>(null);

  protected readonly estado = signal<EstadoVinculacionTelegram | null>(null);
  protected readonly enlace = signal<EnlaceVinculacionTelegram | null>(null);
  protected readonly qr = signal<string | null>(null);
  protected readonly cargando = signal(false);

  constructor() {
    effect(() => {
      this.pacienteId();
      this.enlace.set(null);
      this.refrescar();
    });
  }

  protected refrescar(): void {
    this.telegramService.estado(this.pacienteId()).subscribe({
      next: (estado) => {
        this.estado.set(estado);
        if (estado.vinculado) {
          this.enlace.set(null);
        }
      },
      error: () => this.estado.set({ vinculado: false, vinculadoEn: null, telegramDisponible: false }),
    });
  }

  protected generar(): void {
    this.cargando.set(true);
    this.telegramService.generarEnlace(this.pacienteId()).subscribe({
      next: async (enlace) => {
        this.qr.set(await toDataURL(enlace.enlace, { width: 320, margin: 1 }));
        this.enlace.set(enlace);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.toast.error((e.error as ErrorResponse | undefined)?.message ?? 'No se pudo generar el enlace');
      },
    });
  }

  protected desvincular(): void {
    this.cargando.set(true);
    this.telegramService.desvincular(this.pacienteId()).subscribe({
      next: () => {
        this.cargando.set(false);
        this.toast.exito('Telegram desvinculado: ya no se enviarán mensajes a ese chat.');
        this.refrescar();
      },
      error: () => this.cargando.set(false),
    });
  }
}
