import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refrescandoToken$: Observable<string> | null = null;

/**
 * Traduce los errores HTTP (400/401/403/404/409/500) a un formato uniforme
 * (ErrorResponseDto, seccion 16) y maneja la renovacion automatica del access
 * token cuando expira: si una peticion responde 401, intenta refrescar con el
 * refresh token antes de reintentar la peticion original o, si el refresh
 * tambien falla, cierra la sesion (seccion 12, punto 2).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const esRutaDeAuth = req.url.includes('/auth/login') || req.url.includes('/auth/refresh');

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !esRutaDeAuth) {
        if (!refrescandoToken$) {
          refrescandoToken$ = authService.refrescarToken().pipe(
            switchMap((respuesta) => {
              refrescandoToken$ = null;
              return [respuesta.accessToken];
            }),
            catchError((refreshError) => {
              refrescandoToken$ = null;
              authService.logout();
              return throwError(() => refreshError);
            }),
          );
        }

        return refrescandoToken$.pipe(
          switchMap((nuevoAccessToken) =>
            next(req.clone({ setHeaders: { Authorization: `Bearer ${nuevoAccessToken}` } })),
          ),
        );
      }

      return throwError(() => error);
    }),
  );
};
