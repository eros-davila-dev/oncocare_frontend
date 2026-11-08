import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EstudioService } from '../estudio.service';
import { Fase, LineaBaseSesion, ResumenRecoleccion, SesionRecoleccion } from '../../../core/models/estudio.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { CardComponent } from '../../../shared/ui/card/card';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { Descriptivos, descargarBlob, descriptivos, fechaCorta } from '../indicadores.util';

interface IndicadorEtapa {
  sigla: string;
  nombre: string;
  unidad: string;
  sentido: 'bajar' | 'subir';
  valor: (s: SesionRecoleccion) => number | null | undefined;
}

const INDICADORES: IndicadorEtapa[] = [
  { sigla: 'TPR', nombre: 'Tiempo promedio de registro', unidad: 'min', sentido: 'bajar', valor: (s) => s.tprMin },
  { sigla: 'TA', nombre: 'Tasa de ausentismo', unidad: '%', sentido: 'bajar', valor: (s) => s.taPct },
  { sigla: 'NCA', nombre: 'Nivel de consultas atendidas', unidad: '%', sentido: 'subir', valor: (s) => s.ncaPct },
];

/** Sesiones por etapa previstas en la tesis (lunes, miercoles y viernes). */
const SESIONES_PREVISTAS = 13;

type OrigenEtapa = 'LOCAL' | 'SERVIDOR' | 'LINEA_BASE';

interface Etapa {
  resumen: ResumenRecoleccion | null;
  aviso: string | null;
  /** De donde salen los valores: esta instalacion, el servidor de la fundacion o las sesiones cargadas del instrumento. */
  origen?: OrigenEtapa;
}

const ETIQUETA_ORIGEN: Record<OrigenEtapa, string> = {
  LOCAL: 'Medido por esta instalación',
  SERVIDOR: 'Servidor de la fundación · calculado desde cada evento',
  LINEA_BASE: 'Valores por sesión cargados del instrumento',
};

/**
 * Resultados por etapa (tesis v8, opcion B): las 13 sesiones del pretest y
 * las 13 del postest son grupos independientes; cada sesion aporta un valor
 * por indicador. Aqui solo se describen los grupos (n, media, DE, mediana,
 * minimo y maximo): la prueba de hipotesis se hace en SPSS con la hoja
 * SPSS_Independientes del Excel (Shapiro-Wilk y luego t de Student para
 * muestras independientes o U de Mann-Whitney).
 */
@Component({
  selector: 'app-estudio-resumen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, ButtonComponent, IconComponent, LoadingSpinnerComponent],
  templateUrl: './estudio-resumen.html',
})
export class EstudioResumenComponent {
  private readonly estudioService = inject(EstudioService);

  protected readonly fechaCorta = fechaCorta;
  protected readonly etiquetaOrigen = ETIQUETA_ORIGEN;
  protected readonly sesionesPrevistas = SESIONES_PREVISTAS;
  protected readonly cargando = signal(true);
  protected readonly descargando = signal<Fase | null>(null);
  protected readonly errorDescarga = signal<string | null>(null);

  /** Por fase: lo medido localmente, lo calculado desde los eventos del servidor y la linea base cargada. */
  private readonly local = { PRETEST: signal<Etapa>({ resumen: null, aviso: null }), POSTEST: signal<Etapa>({ resumen: null, aviso: null }) };
  private readonly servidor = { PRETEST: signal<Etapa>({ resumen: null, aviso: null }), POSTEST: signal<Etapa>({ resumen: null, aviso: null }) };
  private readonly lineaBase = { PRETEST: signal<LineaBaseSesion[]>([]), POSTEST: signal<LineaBaseSesion[]>([]) };

  protected readonly pretestEfectivo = computed<Etapa>(() => this.etapaEfectiva('PRETEST'));
  protected readonly postestEfectivo = computed<Etapa>(() => this.etapaEfectiva('POSTEST'));

  protected readonly filas = computed(() =>
    INDICADORES.map((ind) => {
      const pre = this.describir(this.pretestEfectivo().resumen, ind);
      const post = this.describir(this.postestEfectivo().resumen, ind);
      const diferencia = pre.media !== null && post.media !== null ? post.media - pre.media : null;
      const mejora = diferencia === null ? null : ind.sentido === 'bajar' ? diferencia < 0 : diferencia > 0;
      const cambioPct = diferencia !== null && pre.media ? (100 * diferencia) / pre.media : null;
      return { ind, pre, post, diferencia, mejora, cambioPct };
    }),
  );

  constructor() {
    let pendientes = 6;
    const listo = () => {
      pendientes -= 1;
      if (pendientes === 0) this.cargando.set(false);
    };
    for (const fase of ['PRETEST', 'POSTEST'] as Fase[]) {
      for (const [fuente, destino] of [['LOCAL', this.local[fase]], ['SERVIDOR', this.servidor[fase]]] as const) {
        this.estudioService.recoleccion(fase, fuente).subscribe({
          next: (resumen) => {
            destino.set({ resumen, aviso: null, origen: fuente });
            listo();
          },
          error: (e: HttpErrorResponse) => {
            destino.set({ resumen: null, aviso: (e.error as ErrorResponse | undefined)?.message ?? 'Sin datos de esta etapa.' });
            listo();
          },
        });
      }
      this.estudioService.lineaBase(fase).subscribe({
        next: (sesiones) => {
          this.lineaBase[fase].set(sesiones);
          listo();
        },
        error: () => listo(),
      });
    }
  }

  /**
   * Lo que midio esta instalacion si tiene datos; si no, lo calculado desde
   * los eventos del servidor de la fundacion; si tampoco, las sesiones
   * cargadas del instrumento.
   */
  private etapaEfectiva(fase: Fase): Etapa {
    const local = this.local[fase]();
    if (local.resumen && this.conDatos(local.resumen) > 0) return local;
    const servidor = this.servidor[fase]();
    if (servidor.resumen && this.conDatos(servidor.resumen) > 0) return servidor;
    const base = this.lineaBase[fase]();
    if (base.length === 0) return local.resumen ? local : { resumen: null, aviso: local.aviso ?? servidor.aviso };
    const sesiones: SesionRecoleccion[] = base.map((s) => ({
      numero: s.numero,
      fecha: s.fecha,
      registros: 0,
      tprMin: s.tprMin,
      citasElegibles: 0,
      inasistencias: 0,
      taPct: s.taPct,
      consultas: 0,
      resueltas: 0,
      ncaPct: s.ncaPct,
    }));
    const resumen = {
      fase,
      desde: base[0].fecha,
      hasta: base[base.length - 1].fecha,
      sesiones,
    } as unknown as ResumenRecoleccion;
    return { resumen, aviso: null, origen: 'LINEA_BASE' };
  }

  protected numero(v: number | null, decimales = 2): string {
    return v === null ? '—' : v.toFixed(decimales);
  }

  protected conDatos(r: ResumenRecoleccion | null): number {
    return r
      ? r.sesiones.filter(
          (s) => s.registros > 0 || s.citasElegibles > 0 || s.consultas > 0 || s.tprMin != null || s.taPct != null || s.ncaPct != null,
        ).length
      : 0;
  }

  protected descargar(fase: Fase): void {
    this.descargando.set(fase);
    this.errorDescarga.set(null);
    const origen = (fase === 'PRETEST' ? this.pretestEfectivo() : this.postestEfectivo()).origen;
    this.estudioService.exportarRecoleccion(fase, origen === 'LOCAL' ? 'LOCAL' : 'SERVIDOR').subscribe({
      next: (blob) => {
        descargarBlob(blob, `recoleccion-${fase.toLowerCase()}.xlsx`);
        this.descargando.set(null);
      },
      error: () => {
        this.errorDescarga.set('No se pudo generar el Excel de esta etapa.');
        this.descargando.set(null);
      },
    });
  }

  private describir(r: ResumenRecoleccion | null, ind: IndicadorEtapa): Descriptivos {
    return descriptivos(r ? r.sesiones.map(ind.valor) : []);
  }
}
