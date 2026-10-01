import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const PATRON_PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

/** Espejo del @Pattern del backend (RegistroCuentaRequestDto / RestablecerPasswordRequestDto). */
export const passwordSeguroValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) {
    return null;
  }
  return PATRON_PASSWORD.test(control.value) ? null : { passwordDebil: true };
};

/**
 * Validador cruzado para un campo "confirmar contrasena": lee el valor del
 * campo hermano via control.parent, asi que debe registrarse en un
 * FormControl que ya sea hijo del FormGroup en el momento de validar.
 */
export function confirmacionPasswordValidator(nombreCampoPassword = 'password'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.parent?.get(nombreCampoPassword)?.value;
    if (!password || !control.value) {
      return null;
    }
    return password === control.value ? null : { noCoincide: true };
  };
}
