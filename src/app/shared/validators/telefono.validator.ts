import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const PATRON_TELEFONO = /^[0-9]{7,15}$/;

export const telefonoValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) {
    return null;
  }
  return PATRON_TELEFONO.test(control.value) ? null : { telefono: true };
};
