import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Rol } from '../models/usuario.model';

/**
 * El frontend solo oculta opciones; quien realmente bloquea es @PreAuthorize
 * en el backend (seccion 12, punto 4). Este guard evita que un usuario sin
 * el rol adecuado ni siquiera vea la pantalla, pero no es la barrera de
 * seguridad real del sistema.
 */
export function roleGuard(...rolesPermitidos: Rol[]): CanActivateFn {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.tieneAlgunRol(...rolesPermitidos)) {
      return true;
    }

    return router.createUrlTree([authService.rutaInicio()]);
  };
}
