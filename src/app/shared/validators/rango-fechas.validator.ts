import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Valida que el campo de fecha inicial (ej. fecha de nacimiento) sea anterior
 * al campo de fecha final (ej. fecha de diagnostico) dentro del mismo
 * FormGroup, cuando ambos estan presentes.
 */
export function rangoFechasValidator(campoInicio: string, campoFin: string): ValidatorFn {
  return (grupo: AbstractControl): ValidationErrors | null => {
    const inicio = grupo.get(campoInicio)?.value;
    const fin = grupo.get(campoFin)?.value;

    if (!inicio || !fin) {
      return null;
    }

    return new Date(inicio) <= new Date(fin) ? null : { rangoFechas: true };
  };
}
