import { Directive, HostBinding, input } from '@angular/core';

/**
 * Aplica el estilo consistente de item de menu dentro de <ui-row-actions>.
 * Uso: <button uiRowActionItem (click)="editar()">Editar</button>
 */
@Directive({
  selector: '[uiRowActionItem]',
})
export class RowActionItemDirective {
  variante = input<'default' | 'danger'>('default');

  @HostBinding('class')
  get clases(): string {
    const base = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors';
    return this.variante() === 'danger' ? `${base} text-destructive hover:bg-destructive-soft` : `${base} text-foreground hover:bg-muted`;
  }
}
