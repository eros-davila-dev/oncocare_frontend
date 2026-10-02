import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { EstudioService } from '../estudio.service';
import {
  AlcanceIndicador,
  AnalisisPareado,
  ComparativoIndicadores,
  Fase,
  FilaPareada,
  ResultadoIndicadores,
  ResultadoWilcoxon,
} from '../../../core/models/estudio.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { CardComponent } from '../../../shared/ui/card/card';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { IndicadorCardComponent } from '../componentes/indicador-card/indicador-card';
import { ComparativoIndicadoresComponent } from '../componentes/comparativo-indicadores/comparativo-indicadores';
import {
  DefinicionIndicador,
  INDICADORES_TESIS,
  descargarBlob,
  fechaCorta,
  formatoP,
  formatoValor,
  lecturaWilcoxon,
} from '../indicadores.util';

type Descarga = 'spss' | 'PRETEST' | 'POSTEST';

const RESULTADO_POR_INDICADOR: Record<DefinicionIndicador['clave'], keyof AnalisisPareado> = {
  tpr: 'tiempoPromedioRegistro',
  tns: 'tasaAusentismo',
  nca: 'nivelConsultasAtendidas',
};

/**
 * Resultados del estudio: comparativo pretest/postest, indicadores de una
 * fase y la tabla pareada por participante (entrada de Wilcoxon). Muestra
 * cuantos pares completos hay por indicador, porque Wilcoxon descarta a quien
 * no tiene dato en alguna de las dos fases.
 */
@Component({
  selector: 'app-estudio-resumen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent,
    ButtonComponent,
    IconComponent,
    LoadingSpinnerComponent,
    IndicadorCardComponent,
    ComparativoIndicadoresComponent,
  ],
  templateUrl: './estudio-resumen.html',
})
export class EstudioResumenComponent {
  private readonly estudioService = inject(EstudioService);

  protected readonly definiciones = INDICADORES_TESIS;
  protected readonly formatoValor = formatoValor;
  protected readonly fechaCorta = fechaCorta;
  protected readonly formatoP = formatoP;

  protected readonly comparativo = signal<ComparativoIndicadores | null>(null);
  protected readonly avisoComparativo = signal<string | null>(null);

  protected readonly fase = signal<Fase>('PRETEST');
  protected readonly alcance = signal<AlcanceIndicador>('MUESTRA');
  protected readonly resultadoFase = signal<ResultadoIndicadores | null>(null);
  protected readonly avisoFase = signal<string | null>(null);
  protected readonly cargandoFase = signal(false);

  protected readonly pareado = signal<FilaPareada[]>([]);
  protected readonly analisis = signal<AnalisisPareado | null>(null);

  protected readonly descargando = signal<Descarga | null>(null);
  protected readonly errorDescarga = signal<string | null>(null);

  /** Wilcoxon preliminar por indicador con su lectura en lenguaje llano. */
  protected readonly pruebas = computed(() => {
    const analisis = this.analisis();
    if (!analisis) {
      return [];
    }
    return this.definiciones.map((d) => {
      const resultado: ResultadoWilcoxon = analisis[RESULTADO_POR_INDICADOR[d.clave]];
      return { definicion: d, resultado, lectura: lecturaWilcoxon(resultado, d.sentido) };
    });
  });

  /** Pares completos (dato en ambas fases) por indicador: el n efectivo de Wilcoxon. */
  protected readonly paresCompletos = computed(() =>
    this.definiciones.map((d) => ({
      sigla: d.sigla,
      pares: this.pareado().filter((f) => d.valor(f.pretest) !== null && d.valor(f.postest) !== null).length,
    })),
  );

  constructor() {
    this.cargarComparativo();
    this.cargarFase();
  }

  protected cambiarFase(fase: Fase): void {
    this.fase.set(fase);
    this.cargarFase();
  }

  protected cambiarAlcance(alcance: AlcanceIndicador): void {
    this.alcance.set(alcance);
    this.cargarFase();
  }

  protected descargarSpss(): void {
    this.descargar('spss', this.estudioService.exportarSpss(), `estudio-spss-${this.hoy()}.xlsx`);
  }

  protected descargarFichas(fase: Fase): void {
    this.descargar(fase, this.estudioService.exportarFichas(fase), `fichas-${fase.toLowerCase()}-${this.hoy()}.xlsx`);
  }

  private descargar(tipo: Descarga, peticion: Observable<Blob>, nombre: string): void {
    this.descargando.set(tipo);
    this.errorDescarga.set(null);
    peticion.subscribe({
      next: (blob) => {
        descargarBlob(blob, nombre);
        this.descargando.set(null);
      },
      error: async (e: HttpErrorResponse) => {
        this.errorDescarga.set(await this.mensajeDeBlob(e));
        this.descargando.set(null);
      },
    });
  }

  /** Con responseType 'blob' el cuerpo del error tambien llega como Blob. */
  private async mensajeDeBlob(error: HttpErrorResponse): Promise<string> {
    if (error.error instanceof Blob) {
      try {
        const cuerpo = JSON.parse(await error.error.text()) as ErrorResponse;
        return cuerpo.message ?? 'No se pudo generar el archivo';
      } catch {
        return 'No se pudo generar el archivo';
      }
    }
    return this.mensaje(error);
  }

  private hoy(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
  }

  private cargarComparativo(): void {
    this.estudioService.comparativo('MUESTRA').subscribe({
      next: (c) => {
        this.comparativo.set(c);
        this.avisoComparativo.set(null);
        this.estudioService.pareado().subscribe((filas) => this.pareado.set(filas));
        this.estudioService.wilcoxon().subscribe((a) => this.analisis.set(a));
      },
      error: (e: HttpErrorResponse) => this.avisoComparativo.set(this.mensaje(e)),
    });
  }

  private cargarFase(): void {
    this.cargandoFase.set(true);
    this.estudioService.indicadores({ fase: this.fase(), alcance: this.alcance() }).subscribe({
      next: (r) => {
        this.resultadoFase.set(r);
        this.avisoFase.set(null);
        this.cargandoFase.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.resultadoFase.set(null);
        this.avisoFase.set(this.mensaje(e));
        this.cargandoFase.set(false);
      },
    });
  }

  private mensaje(error: HttpErrorResponse): string {
    return (error.error as ErrorResponse | undefined)?.message ?? 'No se pudo calcular el indicador';
  }
}
