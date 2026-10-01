import { Component, input } from '@angular/core';

export type VarianteBoton = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';

@Component({
  selector: 'ui-button',
  template: `
    <button
      [type]="type()"
      [disabled]="disabled() || cargando()"
      [class]="clases()"
    >
      @if (cargando()) {
        <span class="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
      }
      <ng-content />
    </button>
  `,
})
export class ButtonComponent {
  variante = input<VarianteBoton>('primary');
  type = input<'button' | 'submit'>('button');
  disabled = input(false);
  cargando = input(false);
  anchoCompleto = input(false);
  soloIcono = input(false);

  private readonly base =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50';

  private readonly variantes: Record<VarianteBoton, string> = {
    primary: 'bg-primary text-primary-foreground shadow-button hover:bg-primary-hover',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
    outline: 'border border-border bg-background text-foreground hover:bg-muted',
    ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    success: 'bg-success text-success-foreground hover:bg-success/90',
  };

  clases(): string {
    const padding = this.soloIcono() ? 'min-w-11 px-0' : 'px-4';
    const ancho = this.anchoCompleto() ? 'w-full' : '';
    return `${this.base} ${padding} ${this.variantes[this.variante()]} ${ancho}`;
  }
}
