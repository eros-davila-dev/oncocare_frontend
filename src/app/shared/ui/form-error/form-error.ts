import { Component, input } from '@angular/core';
import { FormControl } from '@angular/forms';

/**
 * Mensaje de error reutilizable bajo cualquier campo de formulario (seccion 7).
 * Cubre tanto los errores de Validators nativos como los que
 * error.interceptor + el formulario asignan via setErrors(...) a partir de la
 * respuesta del backend (seccion 16).
 */
@Component({
  selector: 'ui-form-error',
  template: `
    @if (control() && control()!.invalid && (control()!.dirty || control()!.touched)) {
      <p class="mt-1 text-xs text-destructive">{{ mensaje() }}</p>
    }
  `,
})
export class FormErrorComponent {
  control = input<FormControl | null>(null);

  private readonly mensajesPorClave: Record<string, string> = {
    required: 'Este campo es obligatorio',
    email: 'Ingrese un correo electronico valido',
    pattern: 'El formato ingresado no es valido',
    minlength: 'El valor ingresado es demasiado corto',
    maxlength: 'El valor ingresado es demasiado largo',
    documentoEnUso: 'Ya existe un paciente registrado con este documento',
    passwordDebil: 'Debe incluir al menos una letra y un numero',
    noCoincide: 'Las contrasenas no coinciden',
  };

  mensaje(): string {
    const errores = this.control()?.errors;
    if (!errores) {
      return '';
    }
    const [clave] = Object.keys(errores);
    return errores[clave]?.mensaje ?? this.mensajesPorClave[clave] ?? 'Valor invalido';
  }
}
