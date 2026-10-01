import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PreguntaPublica, PreguntasFrecuentesPublicasService } from './preguntas-frecuentes-publicas.service';

interface Grupo {
  categoria: string;
  preguntas: PreguntaPublica[];
}

/**
 * Pagina publica de preguntas frecuentes. Es la misma informacion oficial
 * con la que responde el asistente virtual, editable por el personal desde
 * la intranet.
 */
@Component({
  selector: 'app-preguntas-publicas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="font-display text-3xl font-bold sm:text-4xl">Preguntas frecuentes</h1>
    <p class="mt-2 text-muted-foreground">
      ¿No encuentras tu respuesta? Escríbele al asistente virtual (botón de chat) o pide hablar con una persona.
    </p>

    @if (cargando()) {
      <p class="mt-8 text-muted-foreground">Cargando…</p>
    } @else if (grupos().length === 0) {
      <p class="mt-8 text-muted-foreground">Pronto publicaremos aquí las preguntas más comunes.</p>
    } @else {
      @for (grupo of grupos(); track grupo.categoria) {
        <section class="mt-8">
          <h2 class="text-sm font-bold tracking-wide text-primary">{{ grupo.categoria }}</h2>
          <div class="mt-3 divide-y divide-border rounded-xl border border-border bg-card">
            @for (p of grupo.preguntas; track p.id) {
              <details class="group p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                  {{ p.pregunta }}
                  <span class="text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p class="mt-3 whitespace-pre-line text-muted-foreground">{{ p.respuesta }}</p>
              </details>
            }
          </div>
        </section>
      }
    }
  `,
})
export class PreguntasPublicasComponent {
  private readonly servicio = inject(PreguntasFrecuentesPublicasService);

  protected readonly cargando = signal(true);
  private readonly preguntas = signal<PreguntaPublica[]>([]);

  protected readonly grupos = computed<Grupo[]>(() => {
    const porCategoria = new Map<string, PreguntaPublica[]>();
    for (const p of this.preguntas()) {
      const categoria = this.etiqueta(p.categoria);
      porCategoria.set(categoria, [...(porCategoria.get(categoria) ?? []), p]);
    }
    return [...porCategoria.entries()].map(([categoria, preguntas]) => ({ categoria, preguntas }));
  });

  constructor() {
    this.servicio.listar().subscribe((lista) => {
      this.preguntas.set(lista);
      this.cargando.set(false);
    });
  }

  private etiqueta(categoria: string): string {
    const texto = (categoria || 'General').replace(/_/g, ' ').toLowerCase();
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
}
