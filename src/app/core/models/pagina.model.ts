/**
 * Contrato de paginacion consumido en toda la app (seccion 7): todos los
 * listados (pacientes, citas, tratamientos, auditoria) usan esta misma forma,
 * devuelta tal cual por PaginaResponseDto en el backend.
 */
export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}
