/**
 * Espejo de ErrorResponseDto (backend, seccion 16): mismo formato para todos
 * los codigos de error (400/401/403/404/409/500).
 */
export interface CampoError {
  campo: string;
  mensaje: string;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  code: string;
  message: string;
  path: string;
  errores?: CampoError[];
}
