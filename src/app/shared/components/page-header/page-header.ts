import { Component, input } from '@angular/core';
import { IconComponent } from '../../ui/icon/icon';

/**
 * Espejo literal de la seccion "bg-welcome" del diseño real (routes/index.tsx):
 * eyebrow + titulo + descripcion + icono decorativo, con un slot opcional
 * [metricas] para anidar la fila de metric-card dentro de la misma tarjeta,
 * igual que en el diseño original. Al vivir en un unico componente compartido,
 * todos los modulos comparten la misma tarjeta de encabezado por construccion.
 */
@Component({
  selector: 'ui-page-header',
  imports: [IconComponent],
  host: { class: 'block' },
  template: `
    <div class="relative overflow-hidden rounded-xl bg-welcome p-5 sm:p-7">
      <div class="relative z-10 max-w-xl">
        @if (eyebrow()) {
          <p class="mb-1 text-sm font-semibold text-primary">{{ eyebrow() }}</p>
        }
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="font-display text-3xl font-bold tracking-normal sm:text-4xl">{{ titulo() }}</h1>
            @if (descripcion()) {
              <p class="mt-2 text-sm text-muted-foreground sm:text-base">{{ descripcion() }}</p>
            }
          </div>
          <div class="flex items-center gap-2">
            <ng-content />
          </div>
        </div>
      </div>
      <ui-icon
        name="heart-pulse"
        [size]="176"
        [clase]="'pointer-events-none absolute -right-4 -bottom-10 text-primary/10 sm:right-10'"
      />
      <div class="relative z-10">
        <ng-content select="[metricas]" />
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  titulo = input.required<string>();
  descripcion = input('');
  eyebrow = input('');
}
