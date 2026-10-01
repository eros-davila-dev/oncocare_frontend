import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { EstudioService } from '../estudio.service';
import {
  AlcanceIndicador,
  ComparativoIndicadores,
  Fase,
  FilaPareada,
  ResultadoIndicadores,
} from '../../../core/models/estudio.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { CardComponent } from '../../../shared/ui/card/card';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { IndicadorCardComponent } from '../componentes/indicador-card/indicador-card';
import { ComparativoIndicadoresComponent } from '../componentes/comparativo-indicadores/comparativo-indicadores';
import { INDICADORES_TESIS, fechaCorta, formatoValor } from '../indicadores.util';

/**
 * Resultados del estudio: comparativo pretest/postest, indicadores de una
 * fase y la tabla pareada por participante (entrada de Wilcoxon). Muestra
 * cuantos pares completos hay por indicador, porque Wilcoxon descarta a quien
 * no tiene dato en alguna de las dos fases.
 */
@Component({
  selector: 'app-estudio-resumen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardComponent, LoadingSpinnerComponent, IndicadorCardComponent, ComparativoIndicadoresComponent],
  templateUrl: './estudio-resumen.html',
})
export class EstudioResumenComponent {
  private readonly estudioService = inject(EstudioService);

  protected readonly definiciones = INDICADORES_TESIS;
  protected readonly formatoValor = formatoValor;
  protected readonly fechaCorta = fechaCorta;

  protected readonly comparativo = signal<ComparativoIndicadores | null>(null);
  protected readonly avisoComparativo = signal<string | null>(null);

  protected readonly fase = signal<Fase>('PRETEST');
  protected readonly alcance = signal<AlcanceIndicador>('MUESTRA');
  protected readonly resultadoFase = signal<ResultadoIndicadores | null>(null);
  protected readonly avisoFase = signal<string | null>(null);
  protected readonly cargandoFase = signal(false);

  protected readonly pareado = signal<FilaPareada[]>([]);

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

  private cargarComparativo(): void {
    this.estudioService.comparativo('MUESTRA').subscribe({
      next: (c) => {
        this.comparativo.set(c);
        this.avisoComparativo.set(null);
        this.estudioService.pareado().subscribe((filas) => this.pareado.set(filas));
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
