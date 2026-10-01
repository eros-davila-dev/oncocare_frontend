import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { PacienteService } from '../../features/pacientes/paciente.service';

/**
 * Secciones del portal de paciente que requieren el registro clinico ya
 * completado (seccion 7, paso 2): si el paciente autenticado todavia no
 * tiene un Paciente vinculado (404 en GET /pacientes/mi-perfil), lo manda a
 * completar su perfil antes de ver citas o su ficha.
 */
export const perfilCompletoGuard: CanActivateFn = () => {
  const pacienteService = inject(PacienteService);
  const router = inject(Router);

  return pacienteService.miPerfil().pipe(
    map(() => true),
    catchError((error: HttpErrorResponse) =>
      of(error.status === 404 ? router.createUrlTree(['/completar-perfil']) : true),
    ),
  );
};

/**
 * Inverso: si ya completo su perfil, no tiene sentido volver a mostrar el
 * formulario. Ante cualquier error que no sea el 404 esperado (red, 500),
 * se prefiere dejar pasar antes que atrapar al paciente en un rebote entre
 * guards.
 */
export const perfilPendienteGuard: CanActivateFn = () => {
  const pacienteService = inject(PacienteService);
  const router = inject(Router);

  return pacienteService.miPerfil().pipe(
    map(() => router.createUrlTree(['/mis-citas'])),
    catchError(() => of(true)),
  );
};
