import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { AUDIENCIA, Audiencia } from '../config/audiencia';
import { Rol, UsuarioResumen } from '../models/usuario.model';

function servicioCon(audiencia: Audiencia, rol: Rol | null): AuthService {
  const usuario: UsuarioResumen | null = rol
    ? { id: 1, nombres: 'Prueba', email: 'p@test.org', rol, especialidad: null }
    : null;
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: AUDIENCIA, useValue: audiencia },
      {
        provide: TokenStorageService,
        useValue: {
          obtenerUsuario: () => usuario,
          obtenerRefreshToken: () => null,
          obtenerAccessToken: () => null,
          limpiar: () => undefined,
        },
      },
    ],
  });
  return TestBed.inject(AuthService);
}

describe('AuthService: portal e intranet', () => {
  it('el portal es solo para pacientes y la intranet solo para el personal', () => {
    expect(servicioCon('portal', 'PACIENTE').perteneceAEstaAplicacion()).toBe(true);
    expect(servicioCon('portal', 'RECEPCIONISTA').perteneceAEstaAplicacion()).toBe(false);
    expect(servicioCon('intranet', 'MEDICO').perteneceAEstaAplicacion()).toBe(true);
    expect(servicioCon('intranet', 'PACIENTE').perteneceAEstaAplicacion()).toBe(false);
    expect(servicioCon('intranet', null).perteneceAEstaAplicacion()).toBe(false);
  });

  it('cada rol aterriza en la pantalla donde trabaja', () => {
    expect(servicioCon('intranet', 'RECEPCIONISTA').rutaInicio()).toBe('/agenda');
    expect(servicioCon('intranet', 'INVESTIGADOR').rutaInicio()).toBe('/estudio');
    expect(servicioCon('intranet', 'MEDICO').rutaInicio()).toBe('/dashboard');
    expect(servicioCon('portal', 'PACIENTE').rutaInicio()).toBe('/mis-citas');
    expect(servicioCon('portal', null).rutaInicio()).toBe('/');
  });

  it('indica la aplicacion correcta cuando una cuenta entra a la otra', () => {
    expect(servicioCon('intranet', 'PACIENTE').urlDeSuAplicacion()).toContain('4200');
    expect(servicioCon('portal', 'ADMIN').urlDeSuAplicacion()).toContain('4300');
  });
});
