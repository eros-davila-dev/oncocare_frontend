import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Exige sesion iniciada y que la cuenta sea de esta aplicacion: una sesion
 * de paciente guardada en la intranet (o de personal en el portal) se
 * descarta en vez de dejar al usuario en pantallas sin permiso.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaAutenticado() && authService.perteneceAEstaAplicacion()) {
    return true;
  }
  if (authService.estaAutenticado()) {
    authService.logout();
  }
  return router.createUrlTree(['/auth/login']);
};
