import { Injectable } from '@angular/core';
import { UsuarioResumen } from '../models/usuario.model';

const ACCESS_TOKEN_KEY = 'oncologia_access_token';
const REFRESH_TOKEN_KEY = 'oncologia_refresh_token';
const USUARIO_KEY = 'oncologia_usuario';
const PERSISTENTE_KEY = 'oncologia_persistente';

/**
 * Unico punto de acceso a los tokens en el navegador. El resto de la app
 * (interceptores, guards, AuthService) pasa siempre por aqui en vez de tocar
 * localStorage/sessionStorage directamente.
 *
 * Checkbox "Recordarme" del login: si el usuario lo marca, los tokens van a
 * localStorage (sobreviven cerrar el navegador); si no, van a sessionStorage
 * (se borran al cerrar la pestana). La eleccion se recuerda en un flag propio
 * en localStorage (dato no sensible) para que un refresh de token posterior
 * seguido siga guardando en el mismo lugar sin que quien llama a
 * refrescarToken() tenga que volver a indicarlo.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  guardarTokens(accessToken: string, refreshToken: string, persistente?: boolean): void {
    if (persistente !== undefined) {
      localStorage.setItem(PERSISTENTE_KEY, persistente ? '1' : '0');
    }
    const storage = this.storageActivo();
    const otro = storage === localStorage ? sessionStorage : localStorage;
    otro.removeItem(ACCESS_TOKEN_KEY);
    otro.removeItem(REFRESH_TOKEN_KEY);
    storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  obtenerAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  obtenerRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY);
  }

  guardarUsuario(usuario: UsuarioResumen): void {
    this.storageActivo().setItem(USUARIO_KEY, JSON.stringify(usuario));
  }

  obtenerUsuario(): UsuarioResumen | null {
    const valor = localStorage.getItem(USUARIO_KEY) ?? sessionStorage.getItem(USUARIO_KEY);
    return valor ? (JSON.parse(valor) as UsuarioResumen) : null;
  }

  limpiar(): void {
    for (const storage of [localStorage, sessionStorage]) {
      storage.removeItem(ACCESS_TOKEN_KEY);
      storage.removeItem(REFRESH_TOKEN_KEY);
      storage.removeItem(USUARIO_KEY);
    }
    localStorage.removeItem(PERSISTENTE_KEY);
  }

  private storageActivo(): Storage {
    return localStorage.getItem(PERSISTENTE_KEY) === '0' ? sessionStorage : localStorage;
  }
}
