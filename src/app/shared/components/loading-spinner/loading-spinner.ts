import { Component, input } from '@angular/core';

@Component({
  selector: 'ui-loading-spinner',
  template: `
    <div class="flex items-center justify-center">
      <span class="animate-spin rounded-full border-2 border-primary border-t-transparent" [class]="tamanoClase()"></span>
    </div>
  `,
})
export class LoadingSpinnerComponent {
  tamano = input<'sm' | 'md'>('md');

  tamanoClase(): string {
    return this.tamano() === 'sm' ? 'size-4' : 'size-6';
  }
}
