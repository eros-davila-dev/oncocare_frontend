import { UsuarioResumen } from './usuario.model';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioResumen;
}

/** Autoservicio de pacientes (seccion 7). */
export interface RegistroCuentaRequest {
  nombres: string;
  email: string;
  password: string;
}

export interface RecuperarPasswordRequest {
  email: string;
}

export interface RestablecerPasswordRequest {
  token: string;
  nuevaPassword: string;
}
