import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  LoginResponse,
  RecuperarPasswordRequest,
  RegistroCuentaRequest,
  RestablecerPasswordRequest,
} from '../models/auth.model';
import { Rol, UsuarioResumen } from '../models/usuario.model';
import { TokenStorageService } from './token-storage.service';
import { AUDIENCIA } from '../config/audiencia';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly audiencia = inject(AUDIENCIA, { optional: true }) ?? 'intranet';

  private readonly usuarioActual = signal<UsuarioResumen | null>(this.tokenStorage.obtenerUsuario());

  readonly usuario = this.usuarioActual.asReadonly();
  readonly estaAutenticado = computed(() => this.usuarioActual() !== null);

  login(credenciales: LoginRequest, persistente = true): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, credenciales).pipe(
      tap((respuesta) => this.guardarSesion(respuesta, persistente)),
    );
  }

  refrescarToken(): Observable<LoginResponse> {
    const refreshToken = this.tokenStorage.obtenerRefreshToken();
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap((respuesta) => this.guardarSesion(respuesta)),
    );
  }

  /**
   * Autoservicio de pacientes (seccion 7). La respuesta del backend es
   * siempre la misma exista o no ya el correo (seccion 9): no hay nada que
   * distinguir aqui, el componente muestra el mismo mensaje de exito.
   */
  registrar(datos: RegistroCuentaRequest): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${environment.apiUrl}/auth/registro`, datos);
  }

  verificarEmail(token: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/verificar-email`, { token });
  }

  recuperarPassword(datos: RecuperarPasswordRequest): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(`${environment.apiUrl}/auth/recuperar-password`, datos);
  }

  restablecerPassword(datos: RestablecerPasswordRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/restablecer-password`, datos);
  }

  logout(): void {
    const refreshToken = this.tokenStorage.obtenerRefreshToken();
    this.limpiarSesionLocal();
    if (refreshToken) {
      // Revocacion best-effort (seccion 12): la sesion local ya quedo cerrada
      // aunque esta llamada falle (token ya vencido, sin red, etc.).
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({ error: () => undefined });
    }
  }

  tieneAlgunRol(...roles: Rol[]): boolean {
    const actual = this.usuarioActual();
    return actual !== null && roles.includes(actual.rol);
  }

  /** Destino inicial tras login o al rebotar de una seccion sin permiso. */
  /**
   * Un paciente usa el portal; el personal, la intranet. Cada aplicacion
   * solo mantiene sesiones de su propia audiencia.
   */
  perteneceAEstaAplicacion(): boolean {
    const esPaciente = this.tieneAlgunRol('PACIENTE');
    return this.audiencia === 'portal' ? esPaciente : this.estaAutenticado() && !esPaciente;
  }

  /** URL de la aplicacion correcta para la cuenta actual (cuando entro a la otra). */
  urlDeSuAplicacion(): string {
    return this.tieneAlgunRol('PACIENTE') ? environment.portalUrl : environment.intranetUrl;
  }

  /** Cada rol aterriza en la pantalla donde trabaja a diario. */
  rutaInicio(): string {
    if (this.audiencia === 'portal') {
      return this.estaAutenticado() ? '/mis-citas' : '/';
    }
    if (this.tieneAlgunRol('RECEPCIONISTA')) {
      return '/agenda';
    }
    return '/dashboard';
  }

  private guardarSesion(respuesta: LoginResponse, persistente?: boolean): void {
    this.tokenStorage.guardarTokens(respuesta.accessToken, respuesta.refreshToken, persistente);
    this.tokenStorage.guardarUsuario(respuesta.usuario);
    this.usuarioActual.set(respuesta.usuario);
  }

  private limpiarSesionLocal(): void {
    this.tokenStorage.limpiar();
    this.usuarioActual.set(null);
    this.router.navigate(['/auth/login']);
  }
}
