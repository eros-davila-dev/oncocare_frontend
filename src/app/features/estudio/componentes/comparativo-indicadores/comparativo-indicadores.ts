import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ComparativoIndicadores, Variacion } from '../../../../core/models/estudio.model';
import {
  DefinicionIndicador,
  INDICADORES_TESIS,
  esMejora,
  fechaCorta,
  formatoDiferencia,
  formatoValor,
} from '../../indicadores.util';

interface FilaComparativa {
  definicion: DefinicionIndicador;
  pretest: string;
  postest: string;
  diferencia: string;
  porcentaje: string;
  mejora: boolean | null;
}

/**
 * Pretest vs postest de los tres indicadores, con el color de la variacion
 * segun el sentido de cada hipotesis (para TPR y TNS bajar es mejorar).
 * Es una lectura descriptiva: la significancia la decide la prueba de
 * Wilcoxon sobre la tabla pareada.
 */
@Component({
  selector: 'app-comparativo-indicadores',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="overflow-x-auto rounded-xl border border-border bg-card shadow-card">
      <table class="w-full border-collapse text-left text-sm">
        <caption class="px-4 pt-4 text-left text-xs text-muted-foreground">
          Pretest {{ periodoPre() }} · Postest {{ periodoPost() }} · Alcance: {{ comparativo().alcance === 'MUESTRA' ? 'muestra del estudio' : 'todo el sistema' }}
        </caption>
        <thead class="bg-muted/70 text-xs text-muted-foreground">
          <tr>
            <th class="px-4 py-3 font-semibold">Indicador</th>
            <th class="px-4 py-3 text-right font-semibold">Pretest</th>
            <th class="px-4 py-3 text-right font-semibold">Postest</th>
            <th class="px-4 py-3 text-right font-semibold">Diferencia</th>
            <th class="px-4 py-3 text-right font-semibold">Variación</th>
          </tr>
        </thead>
        <tbody>
          @for (fila of filas(); track fila.definicion.clave) {
            <tr class="border-t border-border">
              <td class="px-4 py-3">
                <p class="font-semibold">{{ fila.definicion.sigla }} · {{ fila.definicion.nombre }}</p>
                <p class="text-xs text-muted-foreground">{{ fila.definicion.hipotesis }}</p>
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{{ fila.pretest }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ fila.postest }}</td>
              <td class="px-4 py-3 text-right tabular-nums">{{ fila.diferencia }}</td>
              <td class="px-4 py-3 text-right">
                <span
                  class="inline-block rounded-full px-2 py-1 text-xs font-bold tabular-nums"
                  [class]="
                    fila.mejora === null
                      ? 'bg-muted text-muted-foreground'
                      : fila.mejora
                        ? 'bg-success-soft text-success'
                        : 'bg-destructive-soft text-destructive'
                  "
                >
                  {{ fila.porcentaje }}
                </span>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ComparativoIndicadoresComponent {
  comparativo = input.required<ComparativoIndicadores>();

  protected readonly periodoPre = computed(
    () => `${fechaCorta(this.comparativo().pretest.desde)}–${fechaCorta(this.comparativo().pretest.hasta)}`,
  );
  protected readonly periodoPost = computed(
    () => `${fechaCorta(this.comparativo().postest.desde)}–${fechaCorta(this.comparativo().postest.hasta)}`,
  );

  protected readonly filas = computed<FilaComparativa[]>(() => {
    const c = this.comparativo();
    const variaciones: Record<DefinicionIndicador['clave'], Variacion> = {
      tpr: c.tiempoPromedioRegistro,
      tns: c.tasaAusentismo,
      nca: c.nivelConsultasAtendidas,
    };
    return INDICADORES_TESIS.map((definicion) => {
      const variacion = variaciones[definicion.clave];
      return {
        definicion,
        pretest: formatoValor(definicion.valor(c.pretest.indicadores), definicion.unidad),
        postest: formatoValor(definicion.valor(c.postest.indicadores), definicion.unidad),
        diferencia: formatoDiferencia(variacion.diferencia, definicion.unidad),
        porcentaje:
          variacion.porcentaje === null ? '—' : `${variacion.porcentaje > 0 ? '+' : ''}${variacion.porcentaje.toFixed(1)} %`,
        mejora: esMejora(variacion.diferencia, definicion.sentido),
      };
    });
  });
}
