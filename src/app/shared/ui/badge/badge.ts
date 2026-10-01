import { Component, input } from '@angular/core';

export type ColorBadge = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'lavender' | 'neutral';

/**
 * Espejo literal de la pastilla de estado del diseño real (status-badge +
 * status-success/info/warning/lavender en styles.css): circulo de color
 * solido + texto, sin variante "light/solid" generica.
 */
@Component({
  selector: 'ui-badge',
  template: `
    <span [class]="clases()">
      @if (conPunto()) {
        <span class="size-1.5 rounded-full bg-current"></span>
      }
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  color = input<ColorBadge>('neutral');
  conPunto = input(true);

  private readonly colores: Record<ColorBadge, string> = {
    brand: 'status-badge bg-primary-soft text-primary',
    success: 'status-badge status-success',
    warning: 'status-badge status-warning',
    danger: 'status-badge status-danger',
    info: 'status-badge status-info',
    lavender: 'status-badge status-lavender',
    neutral: 'status-badge bg-muted text-muted-foreground',
  };

  clases(): string {
    return this.colores[this.color()];
  }
}
