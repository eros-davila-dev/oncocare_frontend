import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IndicadoresTesis } from '../../../../core/models/estudio.model';
import { DefinicionIndicador, formatoValor } from '../../indicadores.util';

/**
 * Un indicador de la tesis con su valor, su base (n) y la formula del Anexo 1.
 * El n siempre esta visible: un porcentaje sin su base no se puede
 * interpretar (no es lo mismo 50 % de 2 citas que de 200).
 */
@Component({
  selector: 'app-indicador-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <article class="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs font-bold tracking-wide text-primary">{{ definicion().sigla }}</p>
          <h3 class="font-display text-base font-bold text-card-foreground">{{ definicion().nombre }}</h3>
        </div>
        <span class="shrink-0 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
          {{ definicion().sentido === 'bajar' ? 'Meta: bajar' : 'Meta: subir' }}
        </span>
      </div>
      <p class="mt-4 font-display text-3xl font-bold" [class.text-muted-foreground]="valor() === null">
        {{ texto() }}
      </p>
      <p class="mt-1 text-sm text-muted-foreground">{{ definicion().base(indicadores()) }}</p>
      @if (extra()) {
        <p class="mt-1 text-sm text-muted-foreground">{{ extra() }}</p>
      }
      <p class="mt-auto pt-4 font-mono text-[11px] text-muted-foreground">{{ definicion().formula }}</p>
    </article>
  `,
})
export class IndicadorCardComponent {
  definicion = input.required<DefinicionIndicador>();
  indicadores = input.required<IndicadoresTesis>();

  protected readonly valor = computed(() => this.definicion().valor(this.indicadores()));
  protected readonly texto = computed(() => formatoValor(this.valor(), this.definicion().unidad));

  /** Para el NCA, el aporte especifico del chatbot. */
  protected readonly extra = computed(() => {
    if (this.definicion().clave !== 'nca') {
      return '';
    }
    const automatico = this.indicadores().nivelConsultasAtendidasAutomatico;
    return automatico === null ? '' : `Resueltas solo por el chatbot: ${automatico.toFixed(1)} %`;
  });
}
