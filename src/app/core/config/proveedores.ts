import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { Routes, provideRouter, withInMemoryScrolling } from '@angular/router';
import { jwtInterceptor } from '../interceptors/jwt.interceptor';
import { errorInterceptor } from '../interceptors/error.interceptor';
import { AUDIENCIA, Audiencia } from './audiencia';

/** Configuracion comun de las dos aplicaciones; cada una aporta sus rutas y su audiencia. */
export function configuracionAplicacion(rutas: Routes, audiencia: Audiencia): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideRouter(rutas, withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
      provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),
      { provide: AUDIENCIA, useValue: audiencia },
    ],
  };
}
