import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Cita } from '../../core/models/cita.model';
import {
  AlcanceIndicador,
  AnalisisPareado,
  CanalConsulta,
  CanalMedicion,
  ComparativoIndicadores,
  Consulta,
  DetalleRecoleccion,
  EstadoMedicion,
  Fase,
  FaseEstudio,
  FichaAsistenciaRequest,
  FichaConsultaRequest,
  FichaTiempoRequest,
  FilaPareada,
  MedicionRegistro,
  MotivoExclusion,
  Participante,
  ResultadoConsulta,
  ResultadoImportacion,
  ResultadoIndicadores,
  ResumenRecoleccion,
  TipoFicha,
  TipoMedicion,
} from '../../core/models/estudio.model';
import { Pagina } from '../../core/models/pagina.model';

export interface FiltroIndicadores {
  fase?: Fase;
  desde?: string;
  hasta?: string;
  alcance?: AlcanceIndicador;
  tipoRegistro?: TipoMedicion;
  canales?: CanalMedicion[];
}

@Injectable({ providedIn: 'root' })
export class EstudioService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/estudio`;

  // --- Indicadores --------------------------------------------------------

  indicadores(filtro: FiltroIndicadores): Observable<ResultadoIndicadores> {
    return this.http.get<ResultadoIndicadores>(`${this.base}/indicadores`, { params: this.params(filtro) });
  }

  comparativo(alcance: AlcanceIndicador = 'MUESTRA'): Observable<ComparativoIndicadores> {
    return this.http.get<ComparativoIndicadores>(`${this.base}/indicadores/comparativo`, { params: { alcance } });
  }

  pareado(): Observable<FilaPareada[]> {
    return this.http.get<FilaPareada[]>(`${this.base}/indicadores/pareado`);
  }

  wilcoxon(): Observable<AnalisisPareado> {
    return this.http.get<AnalisisPareado>(`${this.base}/indicadores/wilcoxon`);
  }

  // --- Recoleccion por sesion (tesis v8) --------------------------------------

  recoleccion(fase: Fase): Observable<ResumenRecoleccion> {
    return this.http.get<ResumenRecoleccion>(`${this.base}/recoleccion`, { params: { fase } });
  }

  /** Fichas de una sesion; sin fecha, las de todas las sesiones de la fase. */
  detalleRecoleccion(fase: Fase, fecha?: string): Observable<DetalleRecoleccion> {
    const params: Record<string, string> = { fase };
    if (fecha) params['fecha'] = fecha;
    return this.http.get<DetalleRecoleccion>(`${this.base}/recoleccion/detalle`, { params });
  }

  exportarRecoleccion(fase: Fase): Observable<Blob> {
    return this.http.get(`${this.base}/recoleccion/exportar.xlsx`, { params: { fase }, responseType: 'blob' });
  }

  // --- Exportaciones (anonimizadas, quedan en la auditoria) -------------------

  exportarSpss(): Observable<Blob> {
    return this.http.get(`${this.base}/exportaciones/spss.xlsx`, { responseType: 'blob' });
  }

  exportarFichas(fase: Fase, alcance: AlcanceIndicador = 'MUESTRA'): Observable<Blob> {
    return this.http.get(`${this.base}/exportaciones/fichas.xlsx`, { params: { fase, alcance }, responseType: 'blob' });
  }

  // --- Fases y muestra ----------------------------------------------------

  fases(): Observable<FaseEstudio[]> {
    return this.http.get<FaseEstudio[]>(`${this.base}/fases`);
  }

  configurarFase(fase: Fase, fechaInicio: string, fechaFin: string): Observable<FaseEstudio> {
    return this.http.put<FaseEstudio>(`${this.base}/fases/${fase}`, { fechaInicio, fechaFin });
  }

  cerrarFase(fase: Fase): Observable<FaseEstudio> {
    return this.http.post<FaseEstudio>(`${this.base}/fases/${fase}/cerrar`, {});
  }

  participantes(): Observable<Participante[]> {
    return this.http.get<Participante[]>(`${this.base}/participantes`);
  }

  incluirParticipante(pacienteId: number, fechaConsentimiento: string, observacion: string | null): Observable<Participante> {
    return this.http.post<Participante>(`${this.base}/participantes`, { pacienteId, fechaConsentimiento, observacion });
  }

  excluirParticipante(id: number, motivo: MotivoExclusion, observacion: string | null): Observable<Participante> {
    return this.http.patch<Participante>(`${this.base}/participantes/${id}/excluir`, { motivo, observacion });
  }

  reincorporarParticipante(id: number): Observable<Participante> {
    return this.http.patch<Participante>(`${this.base}/participantes/${id}/reincorporar`, {});
  }

  // --- Fichas del Anexo 2 -------------------------------------------------

  registrarTiempo(ficha: FichaTiempoRequest): Observable<MedicionRegistro> {
    return this.http.post<MedicionRegistro>(`${this.base}/fichas/tiempos`, ficha);
  }

  registrarAsistencia(ficha: FichaAsistenciaRequest): Observable<Cita> {
    return this.http.post<Cita>(`${this.base}/fichas/asistencias`, ficha);
  }

  registrarConsulta(ficha: FichaConsultaRequest): Observable<Consulta> {
    return this.http.post<Consulta>(`${this.base}/fichas/consultas`, ficha);
  }

  importar(ficha: TipoFicha, archivo: File, aplicar: boolean): Observable<ResultadoImportacion> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    return this.http.post<ResultadoImportacion>(`${this.base}/fichas/${ficha}/importar`, datos, {
      params: { aplicar },
    });
  }

  plantilla(ficha: TipoFicha): Observable<Blob> {
    return this.http.get(`${this.base}/fichas/${ficha}/plantilla`, { responseType: 'blob' });
  }

  // --- Datos crudos y correcciones ------------------------------------------

  mediciones(filtro: {
    fase?: Fase;
    tipo?: TipoMedicion;
    canal?: CanalMedicion;
    estado?: EstadoMedicion;
    page: number;
    size: number;
  }): Observable<Pagina<MedicionRegistro>> {
    return this.http.get<Pagina<MedicionRegistro>>(`${this.base}/mediciones`, { params: this.params(filtro) });
  }

  consultas(filtro: {
    fase?: Fase;
    canal?: CanalConsulta;
    resultado?: ResultadoConsulta;
    page: number;
    size: number;
  }): Observable<Pagina<Consulta>> {
    return this.http.get<Pagina<Consulta>>(`${this.base}/consultas`, { params: this.params(filtro) });
  }

  anularMedicion(id: number, motivo: string): Observable<MedicionRegistro> {
    return this.http.patch<MedicionRegistro>(`${this.base}/mediciones/${id}/anular`, { motivo });
  }

  anularConsulta(id: number, motivo: string): Observable<Consulta> {
    return this.http.patch<Consulta>(`${this.base}/consultas/${id}/anular`, { motivo });
  }

  private params(valores: object): HttpParams {
    let params = new HttpParams();
    for (const [clave, valor] of Object.entries(valores)) {
      if (valor === undefined || valor === null || valor === '') {
        continue;
      }
      params = Array.isArray(valor) ? params.set(clave, valor.join(',')) : params.set(clave, String(valor));
    }
    return params;
  }
}
