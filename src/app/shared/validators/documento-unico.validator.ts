import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, catchError, map, of } from 'rxjs';

/**
 * Validador asincrono de unicidad de documento (seccion 7): consulta
 * GET /pacientes/documento-disponible antes de enviar el formulario. El
 * backend igual reafirma la regla con un 409 (RegistrarPacienteUseCase), asi
 * que este validador es una mejora de UX, no la garantia final.
 */
export function documentoUnicoValidator(
  verificarDisponibilidad: (documento: string) => Observable<boolean>,
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!control.value) {
      return of(null);
    }

    return verificarDisponibilidad(control.value).pipe(
      map((disponible) => (disponible ? null : { documentoEnUso: true })),
      catchError(() => of(null)),
    );
  };
}
