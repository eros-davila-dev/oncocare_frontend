import { Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { IconComponent } from '../icon/icon';
import { FormErrorComponent } from '../form-error/form-error';

export interface OpcionSelect {
  value: string | number;
  label: string;
}

let contadorIds = 0;

/**
 * Mismo patron que ui-input (control pasado por instancia, no formControlName)
 * para eliminar los bloques <select> repetidos a mano en 5 formularios.
 */
@Component({
  selector: 'ui-select',
  imports: [ReactiveFormsModule, FormErrorComponent, IconComponent],
  template: `
    <div>
      @if (label()) {
        <label [for]="id" class="form-label mb-1.5 block">
          {{ label() }}
          @if (requerido()) {
            <span class="text-destructive">*</span>
          }
        </label>
      }
      <div class="relative">
        <select [id]="id" [formControl]="control()" [class]="clasesSelect()">
          @if (placeholderEfectivo()) {
            <option value="" disabled>{{ placeholderEfectivo() }}</option>
          }
          @for (opcion of opciones(); track opcion.value) {
            <option [ngValue]="opcion.value">{{ opcion.label }}</option>
          }
        </select>
        <ui-icon name="chevron-down" [size]="16" clase="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
      <ui-form-error [control]="control()" />
    </div>
  `,
})
export class SelectComponent {
  readonly id = `ui-select-${contadorIds++}`;

  label = input<string>('');
  placeholder = input<string>('');
  requerido = input(false);
  opciones = input.required<OpcionSelect[]>();
  control = input.required<FormControl>();

  /** Si no se pasa un placeholder explicito, se deriva uno generico del label. */
  protected readonly placeholderEfectivo = computed(() => this.placeholder() || (this.label() ? `Selecciona ${this.label().toLowerCase()}` : 'Selecciona una opcion'));

  clasesSelect(): string {
    const conError = this.control().invalid && (this.control().dirty || this.control().touched);
    return conError ? 'field appearance-none pr-9 border-destructive' : 'field appearance-none pr-9';
  }
}
