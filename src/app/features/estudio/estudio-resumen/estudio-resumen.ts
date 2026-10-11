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

interface Etapa {
  resumen: ResumenRecoleccion | null;
  aviso: string | null;
  /** Fuente de los valores cuando no los midio el sistema (linea base del pretest). */
  fuente?: string;
}

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
  protected readonly sesionesPrevistas = SESIONES_PREVISTAS;
  protected readonly cargando = signal(true);
  protected readonly pretest = signal<Etapa>({ resumen: null, aviso: null });
  protected readonly postest = signal<Etapa>({ resumen: null, aviso: null });
  protected readonly descargando = signal<Fase | null>(null);
  protected readonly errorDescarga = signal<string | null>(null);

  protected readonly filas = computed(() =>
    INDICADORES.map((ind) => {
      const pre = this.describir(this.pretestEfectivo().resumen, ind);
      const post = this.describir(this.postestEfectivo().resumen, ind);
      const diferencia = pre.media !== null && post.media !== null ? post.media - pre.media : null;
      const mejora = diferencia === null ? null : ind.sentido === 'bajar' ? diferencia < 0 : diferencia > 0;
      return { ind, pre, post, diferencia, mejora };
    }),
  );

  constructor() {
    let pendientes = 4;
    const listo = () => {
      pendientes -= 1;
      if (pendientes === 0) this.cargando.set(false);
    };
    for (const fase of ['PRETEST', 'POSTEST'] as Fase[]) {
      const destino = fase === 'PRETEST' ? this.pretest : this.postest;
      this.estudioService.recoleccion(fase).subscribe({
        next: (resumen) => {
          destino.set({ resumen, aviso: null });
          listo();
        },
        error: (e: HttpErrorResponse) => {
          destino.set({ resumen: null, aviso: (e.error as ErrorResponse | undefined)?.message ?? 'Sin datos de esta etapa.' });
          listo();
        },
      });
    }
    // El pretest se recolecto a mano antes del sistema: si el sistema no tiene
    // datos de esa etapa, se usa la linea base cargada desde el instrumento.
    this.estudioService.lineaBase().subscribe({
      next: (sesiones) => {
        this.lineaBase.set(sesiones);
        listo();
      },
      error: () => listo(),
    });
    this.estudioService.lineaBase('POSTEST').subscribe({
      next: (sesiones) => {
        this.postestImportado.set(sesiones);
        listo();
      },
      error: () => listo(),
    });
  }

  /** Postest importado del instrumento: solo se usa si el sistema no tiene datos de esa etapa. */
  protected readonly postestImportado = signal<LineaBaseSesion[]>([]);
  protected readonly postestEfectivo = computed<Etapa>(() => this.etapaDesde(this.postest(), this.postestImportado(), 'POSTEST'));

  protected readonly lineaBase = signal<LineaBaseSesion[]>([]);

  /** Pretest efectivo: el del sistema si tiene datos; si no, la linea base. */
  protected readonly pretestEfectivo = computed<Etapa>(() => this.etapaDesde(this.pretest(), this.lineaBase(), 'PRETEST'));

  /** Lo que midio el sistema si tiene datos; si no, las sesiones cargadas del instrumento (con su fuente). */
  private etapaDesde(sistema: Etapa, base: LineaBaseSesion[], fase: Fase): Etapa {
    if ((sistema.resumen && this.conDatos(sistema.resumen) > 0) || base.length === 0) {
      return sistema;
    }
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
    return { resumen, aviso: null, fuente: base[0].fuente };
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
    this.estudioService.exportarRecoleccion(fase).subscribe({
      next: (blob) => {
        descargarBlob(blob, `recoleccion-${fase.toLowerCase()}.xlsx`);
        this.descargando.set(null);
      },
      error: () => {
        this.errorDescarga.set('No se pudo generar el Excel. Revise que la etapa tenga fechas configuradas.');
        this.descargando.set(null);
      },
    });
  }

  private describir(r: ResumenRecoleccion | null, ind: IndicadorEtapa): Descriptivos {
    return descriptivos(r ? r.sesiones.map(ind.valor) : []);
  }
}
