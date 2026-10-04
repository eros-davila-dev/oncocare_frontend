import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * El correo del referido debe ser distinto al del paciente: si coinciden, la
 * copia del recordatorio no llega a nadie mas. El backend aplica la misma
 * regla (Paciente.validarDatosDeContacto).
 */
export function correoDistintoValidator(otroCorreo: () => string | null | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const propio = String(control.value ?? '').trim().toLowerCase();
    const otro = String(otroCorreo() ?? '').trim().toLowerCase();
    return propio && otro && propio === otro
      ? { correoRepetido: { mensaje: 'Debe ser distinto al correo del paciente' } }
      : null;
  };
}
