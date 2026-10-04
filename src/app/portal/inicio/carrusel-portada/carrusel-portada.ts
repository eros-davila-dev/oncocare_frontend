import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../../shared/ui/icon/icon';

export interface DiapositivaPortada {
  imagen: string;
  alt: string;
  etiqueta: string;
  titulo: string;
  texto: string;
  accion: { texto: string; ruta: string };
  accionSecundaria?: { texto: string; ruta: string };
}

const DURACION_MS = 5000;
const PASO_MS = 50;

/**
 * Carrusel de la portada: cambia de foto cada 5 segundos con un fundido y un
 * zoom lento. Pensado para que cualquiera lo pueda usar (WCAG 2.2.2):
 * - boton visible de pausa, y se detiene solo al pasar el mouse, al enfocar
 *   con el teclado o si la pestaña no esta visible;
 * - flechas, puntos, teclado (izquierda/derecha) y deslizar en el celular;
 * - si el sistema pide menos movimiento, arranca en pausa.
 */
@Component({
  selector: 'app-carrusel-portada',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  host: { class: 'block' },
  template: `
    <section
      class="relative isolate h-[min(82vh,760px)] min-h-[560px] overflow-hidden bg-portal-oscuro text-white"
      aria-roledescription="carrusel"
      aria-label="Lo que puedes hacer en el portal"
      tabindex="-1"
      (mouseenter)="enHover.set(true)"
      (mouseleave)="enHover.set(false)"
      (focusin)="conFoco.set(true)"
      (focusout)="conFoco.set(false)"
      (keydown.arrowLeft)="anterior()"
      (keydown.arrowRight)="siguiente()"
      (touchstart)="inicioToque($event)"
      (touchend)="finToque($event)"
    >
      @for (d of diapositivas(); track d.imagen; let i = $index) {
        <div
          class="absolute inset-0 transition-opacity duration-1000 ease-out"
          [class]="i === indice() ? 'opacity-100' : 'pointer-events-none opacity-0'"
          role="group"
          aria-roledescription="diapositiva"
          [attr.aria-label]="i + 1 + ' de ' + diapositivas().length + ': ' + d.titulo"
          [attr.aria-hidden]="i !== indice()"
          [attr.inert]="i !== indice() ? '' : null"
        >
          <img
            [src]="d.imagen"
            [alt]="d.alt"
            class="absolute inset-0 -z-10 size-full object-cover"
            [class.zoom-lento]="i === indice()"
            [attr.fetchpriority]="i === 0 ? 'high' : null"
            [attr.loading]="i === 0 ? 'eager' : 'lazy'"
            decoding="async"
          />
          <!-- Velo para que el texto se lea sobre cualquier foto -->
          <div class="absolute inset-0 -z-10 bg-gradient-to-r from-[oklch(0.16_0.05_264/92%)] via-[oklch(0.18_0.06_270/70%)] to-[oklch(0.2_0.06_270/15%)]"></div>
          <div class="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[oklch(0.14_0.04_264/80%)] to-transparent"></div>

          @if (i === indice()) {
            <div class="mx-auto flex h-full max-w-6xl items-center px-4 sm:px-6">
              <div class="entrar-texto max-w-2xl pb-16">
                <p class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-semibold backdrop-blur">
                  <span class="size-2 rounded-full bg-[oklch(0.8_0.14_190)]"></span>
                  {{ d.etiqueta }}
                </p>
                <h2 class="mt-5 font-display text-4xl leading-[1.08] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                  {{ d.titulo }}
                </h2>
                <p class="mt-5 max-w-xl text-lg text-white/85 sm:text-xl">{{ d.texto }}</p>
                <div class="mt-8 flex flex-wrap gap-3">
                  <a
                    [routerLink]="d.accion.ruta"
                    class="group inline-flex min-h-13 items-center gap-2 rounded-xl bg-white px-6 text-lg font-bold text-[oklch(0.25_0.08_264)] shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-white/95"
                  >
                    {{ d.accion.texto }}
                    <ui-icon name="arrow-right" [size]="20" clase="transition-transform group-hover:translate-x-1" />
                  </a>
                  @if (d.accionSecundaria) {
                    <a
                      [routerLink]="d.accionSecundaria.ruta"
                      class="inline-flex min-h-13 items-center rounded-xl border border-white/35 bg-white/5 px-6 text-lg font-semibold backdrop-blur transition hover:bg-white/15"
                    >
                      {{ d.accionSecundaria.texto }}
                    </a>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Controles -->
      <div class="absolute inset-x-0 bottom-0 z-10">
        <div class="mx-auto flex max-w-6xl items-center gap-4 px-4 pb-8 sm:px-6">
          <div class="flex flex-1 gap-2" role="group" aria-label="Elegir diapositiva">
            @for (d of diapositivas(); track d.imagen; let i = $index) {
              <button
                type="button"
                class="group relative h-11 flex-1 sm:max-w-36"
                [attr.aria-label]="'Ir a la diapositiva ' + (i + 1) + ': ' + d.etiqueta"
                [attr.aria-current]="i === indice() ? 'true' : null"
                (click)="ir(i)"
              >
                <span class="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
                  <span
                    class="block h-full rounded-full bg-white"
                    [style.width.%]="i < indice() ? 100 : i === indice() ? progreso() * 100 : 0"
                  ></span>
                </span>
                <span class="absolute inset-x-0 top-0 hidden truncate text-left text-xs font-semibold text-white/70 group-hover:text-white sm:block">
                  {{ d.etiqueta }}
                </span>
              </button>
            }
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <button type="button" class="control-carrusel" aria-label="Diapositiva anterior" (click)="anterior()">
              <ui-icon name="chevron-left" [size]="22" />
            </button>
            <button
              type="button"
              class="control-carrusel"
              [attr.aria-label]="pausadoPorUsuario() ? 'Reanudar el carrusel' : 'Pausar el carrusel'"
              [attr.aria-pressed]="pausadoPorUsuario()"
              (click)="pausadoPorUsuario.update((v) => !v)"
            >
              <ui-icon [name]="pausadoPorUsuario() ? 'play' : 'pause'" [size]="18" />
            </button>
            <button type="button" class="control-carrusel" aria-label="Diapositiva siguiente" (click)="siguiente()">
              <ui-icon name="chevron-right" [size]="22" />
            </button>
          </div>
        </div>
      </div>

      <p class="sr-only" [attr.aria-live]="enPausa() ? 'polite' : 'off'">
        Diapositiva {{ indice() + 1 }} de {{ diapositivas().length }}: {{ diapositivas()[indice()].titulo }}
      </p>
    </section>
  `,
  styles: `
    .control-carrusel {
      display: grid;
      place-items: center;
      width: 2.75rem;
      height: 2.75rem;
      border-radius: 999px;
      border: 1px solid rgb(255 255 255 / 30%);
      background: rgb(255 255 255 / 10%);
      color: white;
      backdrop-filter: blur(8px);
      transition: background 0.2s;
    }
    .control-carrusel:hover {
      background: rgb(255 255 255 / 22%);
    }
    .control-carrusel:focus-visible,
    button:focus-visible,
    a:focus-visible {
      outline: 3px solid oklch(0.85 0.12 200);
      outline-offset: 2px;
    }
  `,
})
export class CarruselPortadaComponent {
  readonly diapositivas = input.required<DiapositivaPortada[]>();

  protected readonly indice = signal(0);
  protected readonly progreso = signal(0);
  protected readonly pausadoPorUsuario = signal(this.prefiereMenosMovimiento());
  protected readonly enHover = signal(false);
  protected readonly conFoco = signal(false);
  private readonly pestanaOculta = signal(typeof document !== 'undefined' && document.hidden);

  protected readonly enPausa = computed(
    () => this.pausadoPorUsuario() || this.enHover() || this.conFoco() || this.pestanaOculta(),
  );

  private inicioX: number | null = null;

  constructor() {
    const temporizador = setInterval(() => {
      if (this.enPausa() || this.diapositivas().length < 2) return;
      const nuevo = this.progreso() + PASO_MS / DURACION_MS;
      if (nuevo >= 1) {
        this.siguiente();
      } else {
        this.progreso.set(nuevo);
      }
    }, PASO_MS);
    const alCambiarVisibilidad = () => this.pestanaOculta.set(document.hidden);
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(temporizador);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    });
  }

  protected ir(i: number): void {
    const total = this.diapositivas().length;
    this.indice.set((i + total) % total);
    this.progreso.set(0);
  }

  protected siguiente(): void {
    this.ir(this.indice() + 1);
  }

  protected anterior(): void {
    this.ir(this.indice() - 1);
  }

  protected inicioToque(evento: TouchEvent): void {
    this.inicioX = evento.touches[0]?.clientX ?? null;
  }

  protected finToque(evento: TouchEvent): void {
    if (this.inicioX === null) return;
    const delta = (evento.changedTouches[0]?.clientX ?? this.inicioX) - this.inicioX;
    this.inicioX = null;
    if (Math.abs(delta) > 50) {
      if (delta < 0) {
        this.siguiente();
      } else {
        this.anterior();
      }
    }
  }

  private prefiereMenosMovimiento(): boolean {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
