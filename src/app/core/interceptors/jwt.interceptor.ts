import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';

const RUTAS_SIN_TOKEN = ['/auth/login', '/auth/refresh'];

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);

  if (RUTAS_SIN_TOKEN.some((ruta) => req.url.includes(ruta))) {
    return next(req);
  }

  const accessToken = tokenStorage.obtenerAccessToken();
  if (!accessToken) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }));
};
