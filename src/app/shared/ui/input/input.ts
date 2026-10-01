import { Component, computed, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormErrorComponent } from '../form-error/form-error';
import { IconComponent } from '../icon/icon';
import type { NombreIcono } from '../icon/icon-data';

let contadorIds = 0;

/**
 * Campo de formulario con estado de error y mensaje de validacion integrado
 * (seccion 7). Se usa pasando el FormControl directamente, no via
 * formControlName, para poder envolver ui-form-error sin duplicar markup.
 *
 * Soporta un icono inicial opcional (`icono`, ej. "mail") y, cuando
 * `type="password"`, agrega automaticamente un boton de mostrar/ocultar en
 * todos los campos de contraseña del sistema sin tocar cada formulario.
 */
@Component({
  selector: 'ui-input',
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
        @if (icono()) {
          <ui-icon [name]="icono()!" [size]="17" clase="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        }
        <input
          [id]="id"
          [type]="tipoEfectivo()"
          [placeholder]="placeholderEfectivo()"
          [formControl]="control()"
          [class]="clasesInput()"
        />
        @if (esPassword()) {
          <button
            type="button"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            [attr.aria-label]="mostrarTexto() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            (click)="alternarMostrar()"
          >
            <ui-icon [name]="mostrarTexto() ? 'eye-off' : 'eye'" [size]="17" />
          </button>
        }
      </div>
      <ui-form-error [control]="control()" />
    </div>
  `,
})
export class InputComponent {
  readonly id = `ui-input-${contadorIds++}`;

  label = input<string>('');
  type = input<string>('text');
  placeholder = input<string>('');
  icono = input<NombreIcono | null>(null);
  requerido = input(false);
  control = input.required<FormControl>();

  protected readonly mostrarTexto = signal(false);

  /** Si no se pasa un placeholder explicito, se deriva uno generico del label. */
  protected readonly placeholderEfectivo = computed(() => this.placeholder() || (this.label() ? `Ingresa ${this.label().toLowerCase()}` : ''));

  protected readonly esPassword = computed(() => this.type() === 'password');

  protected readonly tipoEfectivo = computed(() => (this.esPassword() && this.mostrarTexto() ? 'text' : this.type()));

  protected alternarMostrar(): void {
    this.mostrarTexto.update((valor) => !valor);
  }

  clasesInput(): string {
    const conError = this.control().invalid && (this.control().dirty || this.control().touched);
    const base = conError ? 'field border-destructive' : 'field';
    const padding = `${this.icono() ? 'pl-10' : ''} ${this.esPassword() ? 'pr-10' : ''}`.trim();
    return padding ? `${base} ${padding}` : base;
  }
}
