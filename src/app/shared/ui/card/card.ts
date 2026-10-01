import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-card',
  host: { class: 'block' },
  template: `
    <div class="rounded-xl border border-border bg-card p-5 shadow-card">
      @if (titulo()) {
        <h3 class="mb-3 font-display text-base font-bold text-card-foreground">{{ titulo() }}</h3>
      }
      <ng-content />
    </div>
  `,
})
export class CardComponent {
  titulo = input<string>('');
}
