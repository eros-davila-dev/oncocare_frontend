import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Ultimos 9 digitos: "+51 904 049 494" y "904049494" son el mismo numero (igual que el backend). */
function normalizar(valor: unknown): string {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  return digitos.length < 9 ? '' : digitos.slice(-9);
}

/**
 * El telefono del referido debe ser distinto al del paciente: con el mismo
 * numero el bot de Telegram no sabria si quien comparte el numero es el
 * paciente o su acompanante. El backend aplica la misma regla.
 */
export function telefonoDistintoValidator(otroTelefono: () => string | null | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const propio = normalizar(control.value);
    const otro = normalizar(otroTelefono());
    return propio && otro && propio === otro
      ? { telefonoRepetido: { mensaje: 'Debe ser distinto al teléfono del paciente' } }
      : null;
  };
}
