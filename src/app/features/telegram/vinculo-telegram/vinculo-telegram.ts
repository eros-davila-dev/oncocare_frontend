import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, interval, take } from 'rxjs';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { toDataURL } from 'qrcode';
import { EnlaceVinculacionTelegram, EstadoVinculacionTelegram, TelegramService } from '../telegram.service';
import { ErrorResponse } from '../../../core/models/error.model';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { BadgeComponent } from '../../../shared/ui/badge/badge';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { PasosTelegramComponent } from '../pasos-telegram/pasos-telegram';
import { environment } from '../../../../environments/environment';

/**
 * Recordatorios por Telegram del paciente y de su acompanante (referido).
 *
 * Dos caminos para vincular, pensados para personas mayores que desconfian de
 * un enlace recibido por mensaje:
 * - Enlace personal: el paciente lo abre desde su propio portal (o recepcion
 *   lo muestra como QR en la ficha). Un toque, sin datos que escribir.
 * - QR comun del bot (el mismo para todos): "Compartir mi numero" + los 3
 *   ultimos digitos del DNI. Es el camino del acompanante y el de la guia
 *   impresa en recepcion.
 */
@Component({
  selector: 'app-vinculo-telegram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ButtonComponent, BadgeComponent, PasosTelegramComponent],
  template: `
    <div class="rounded-xl border border-border bg-card p-5">
      <h3 class="font-display text-base font-bold">Recordatorios por Telegram</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        {{
          enIntranet()
            ? 'El paciente (y su acompañante, si lo autorizó) recibe un aviso antes de cada cita y puede confirmarla o cancelarla con un botón.'
            : 'Recibe un aviso antes de cada cita y confírmala o cancélala con un botón. Es gratis y opcional.'
        }}
      </p>

      @if (estado(); as e) {
        @if (!e.telegramDisponible) {
          <p class="mt-4 text-sm text-muted-foreground">Telegram aún no está habilitado en el sistema.</p>
        } @else {
          <!-- Paciente -->
          <section class="mt-5 border-t border-border pt-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4 class="text-sm font-semibold">{{ enIntranet() ? 'Telegram del paciente' : 'Tu Telegram' }}</h4>
              <ui-badge [color]="e.vinculado ? 'success' : 'neutral'">{{ e.vinculado ? 'Vinculado' : 'Sin vincular' }}</ui-badge>
            </div>

            @if (e.vinculado && !enlace()) {
              <p class="mt-2 text-sm">Vinculado desde el {{ e.vinculadoEn | date: 'dd/MM/yyyy' }}.</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <ui-button variante="outline" [cargando]="cargando()" (click)="generar()">Vincular otro teléfono</ui-button>
                <ui-button variante="ghost" [cargando]="cargando()" (click)="desvincular()">Dejar de recibir mensajes</ui-button>
              </div>
            } @else if (enlace(); as en) {
              <div class="mt-3 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
                @if (qrPersonal()) {
                  <img [src]="qrPersonal()" alt="Código QR personal para vincular Telegram"
                       class="hidden size-40 rounded-lg border border-border bg-white p-2 sm:block" />
                }
                <div class="min-w-0">
                  <p class="text-sm">
                    {{ enIntranet() ? 'Pida al paciente que escanee el código con la cámara de su celular' : 'Desde tu celular, toca el botón (o escanea el código desde otra pantalla)' }}
                    y luego pulse <strong>Iniciar</strong> en Telegram.
                  </p>
                  <a [href]="en.enlace" target="_blank" rel="noopener"
                     class="mt-3 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">
                    Abrir en Telegram
                  </a>
                  <p class="mt-2 text-xs text-muted-foreground">Válido hasta las {{ en.expiraEn | date: 'HH:mm' }} y para un solo uso.</p>
                  <ui-button class="mt-2 inline-block" variante="ghost" (click)="refrescar()">Ya lo vinculé</ui-button>
                </div>
              </div>
            } @else {
              <ui-button class="mt-3 inline-block" [cargando]="cargando()" (click)="generar()">
                {{ enIntranet() ? 'Mostrar QR para el paciente' : 'Vincular mi Telegram' }}
              </ui-button>
              @if (qrComun()) {
                <details class="mt-4 rounded-lg border border-border p-3">
                  <summary class="cursor-pointer text-sm font-medium">
                    {{ enIntranet() ? 'Con el código común del bot (sin enlace personal)' : '¿Prefieres hacerlo sin enlace? Usa el código común del bot' }}
                  </summary>
                  <div class="mt-3 flex flex-col gap-4 sm:flex-row">
                    <img [src]="qrComun()" alt="Código QR del bot de la fundación"
                         class="mx-auto size-36 shrink-0 rounded-lg border border-border bg-white p-2 sm:mx-0" />
                    <app-pasos-telegram [usuarioBot]="usuarioBot()" />
                  </div>
                </details>
              }
            }
          </section>

          <!-- Acompanante (referido) -->
          <section class="mt-5 border-t border-border pt-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h4 class="text-sm font-semibold">
                Acompañante{{ e.referidoNombre ? ': ' + e.referidoNombre : '' }}
              </h4>
              <ui-badge [color]="e.referidoVinculado ? 'success' : e.referidoAutorizado ? 'neutral' : 'warning'">
                {{ e.referidoVinculado ? 'Vinculado' : e.referidoAutorizado ? 'Sin vincular' : 'No autorizado' }}
              </ui-badge>
            </div>

            @if (!e.referidoAutorizado) {
              <p class="mt-2 text-sm text-muted-foreground">
                {{
                  enIntranet()
                    ? 'El paciente no autorizó que su acompañante reciba los recordatorios. Si lo autoriza, márquelo al editar la ficha del paciente.'
                    : 'Tu acompañante no está autorizado para recibir tus recordatorios. Si quieres que los reciba, pídelo en recepción.'
                }}
              </p>
            } @else if (e.referidoVinculado) {
              <p class="mt-2 text-sm">Recibe los recordatorios desde el {{ e.referidoVinculadoEn | date: 'dd/MM/yyyy' }}.</p>
              <ui-button class="mt-3 inline-block" variante="ghost" [cargando]="cargando()" (click)="desvincularReferido()">
                Quitar al acompañante
              </ui-button>
            } @else {
              <p class="mt-2 text-sm text-muted-foreground">
                {{ enIntranet() ? 'Pida al acompañante que haga estos pasos desde su celular:' : 'Pídele a tu acompañante que haga estos pasos desde su celular:' }}
              </p>
              <div class="mt-3 flex flex-col gap-4 sm:flex-row">
                @if (qrComun()) {
                  <img [src]="qrComun()" alt="Código QR del bot de la fundación"
                       class="mx-auto size-36 shrink-0 rounded-lg border border-border bg-white p-2 sm:mx-0" />
                }
                <app-pasos-telegram [usuarioBot]="usuarioBot()" [paraAcompanante]="true" />
              </div>
            }
          </section>

          <p class="mt-5 text-xs text-muted-foreground">
            ¿Necesitas la guía impresa? <a [href]="guiaUrl" target="_blank" rel="noopener" class="font-semibold text-primary hover:underline">Ver guía para imprimir</a>
          </p>
        }
      }
    </div>
  `,
})
export class VinculoTelegramComponent {
  private readonly telegramService = inject(TelegramService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private espera: Subscription | null = null;

  /** Vacio en el portal (paciente autenticado); el id del paciente en la intranet. */
  pacienteId = input<number | null>(null);

  protected readonly estado = signal<EstadoVinculacionTelegram | null>(null);
  protected readonly enlace = signal<EnlaceVinculacionTelegram | null>(null);
  protected readonly qrPersonal = signal<string | null>(null);
  protected readonly qrComun = signal<string | null>(null);
  protected readonly usuarioBot = signal<string | null>(null);
  protected readonly cargando = signal(false);
  /** La guia vive en el portal (publica), tambien cuando se abre desde la intranet. */
  protected readonly guiaUrl = `${environment.portalUrl}/recordatorios-telegram`;

  constructor() {
    effect(() => {
      this.pacienteId();
      this.enlace.set(null);
      this.refrescar();
    });
  }

  protected enIntranet(): boolean {
    return this.pacienteId() != null;
  }

  protected refrescar(): void {
    this.telegramService.estado(this.pacienteId()).subscribe({
      next: async (estado) => {
        this.estado.set(estado);
        if (estado.vinculado) {
          this.enlace.set(null);
        }
        if (estado.enlaceBot && !this.qrComun()) {
          this.usuarioBot.set(estado.enlaceBot.split('/').pop() ?? null);
          this.qrComun.set(await toDataURL(estado.enlaceBot, { width: 288, margin: 1 }));
        }
      },
      error: () => this.estado.set({ vinculado: false, vinculadoEn: null, telegramDisponible: false }),
    });
  }

  protected generar(): void {
    this.cargando.set(true);
    this.telegramService.generarEnlace(this.pacienteId()).subscribe({
      next: async (enlace) => {
        this.qrPersonal.set(await toDataURL(enlace.enlace, { width: 320, margin: 1 }));
        this.enlace.set(enlace);
        this.cargando.set(false);
        this.esperarVinculacion();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.toast.error((e.error as ErrorResponse | undefined)?.message ?? 'No se pudo generar el enlace');
      },
    });
  }

  /**
   * Mientras el enlace esta a la vista, se consulta cada 4 s (hasta 5 min) si
   * el paciente ya pulso Iniciar: asi ve "Vinculado" sin recargar la pagina.
   */
  private esperarVinculacion(): void {
    this.espera?.unsubscribe();
    this.espera = interval(4000)
      .pipe(take(75), takeUntilDestroyed(this.destroyRef))
      .subscribe(() =>
        this.telegramService.estado(this.pacienteId()).subscribe((estado) => {
          if (estado.vinculado) {
            this.espera?.unsubscribe();
            this.estado.set(estado);
            this.enlace.set(null);
            this.toast.exito('¡Telegram vinculado! Desde ahora recibirá los recordatorios de las citas.');
          }
        }),
      );
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

  protected desvincularReferido(): void {
    this.cargando.set(true);
    this.telegramService.desvincularReferido(this.pacienteId()).subscribe({
      next: () => {
        this.cargando.set(false);
        this.toast.exito('El acompañante ya no recibirá los recordatorios.');
        this.refrescar();
      },
      error: () => this.cargando.set(false),
    });
  }
}
