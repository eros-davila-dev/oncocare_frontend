import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ConfiguracionGemini,
  ConfiguracionGeminiService,
  EstadoModeloGemini,
  ModeloGeminiDisponible,
  OrigenConfiguracionGemini,
  ResultadoPruebaGemini,
} from '../configuracion-gemini.service';
import { ErrorResponse } from '../../../core/models/error.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { BadgeComponent, type ColorBadge } from '../../../shared/ui/badge/badge';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { CardComponent } from '../../../shared/ui/card/card';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { InputComponent } from '../../../shared/ui/input/input';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';

/** Mismos patrones que el backend (ConfiguracionGeminiDtos): el modelo va en la URL de Google. */
const PATRON_MODELO = /^[A-Za-z0-9._-]{1,80}$/;
const PATRON_CLAVE = /^[\x21-\x7E]*$/;
const MAXIMO_MODELOS = 15;

const ETIQUETA_ORIGEN: Record<OrigenConfiguracionGemini, string> = {
  INTRANET: 'Guardada en la intranet',
  ENTORNO: 'Variable del servidor',
  SIN_CONFIGURAR: 'Sin configurar',
};

const COLOR_ORIGEN: Record<OrigenConfiguracionGemini, ColorBadge> = {
  INTRANET: 'success',
  ENTORNO: 'info',
  SIN_CONFIGURAR: 'danger',
};

/**
 * Configuracion del asistente virtual (solo ADMIN): clave de API de Gemini y
 * modelos en orden de preferencia. Si un modelo agota su cuota gratuita o no
 * responde, el chatbot pasa al siguiente sin que el paciente lo note.
 */
@Component({
  selector: 'app-configuracion-gemini',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    PageHeaderComponent,
    ConfirmDialogComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    IconComponent,
    InputComponent,
    SelectComponent,
  ],
  template: `
    <ui-page-header
      eyebrow="Configuración"
      titulo="Asistente IA"
      descripcion="Clave de Gemini y modelos que usa el chatbot. Si un modelo agota su cuota, se usa el siguiente de la lista."
    />

    @if (cargando()) {
      <p class="mt-6 text-sm text-muted-foreground">Cargando configuración…</p>
    } @else if (config(); as c) {
      <div class="mt-6 grid gap-6 lg:grid-cols-2">
        <!-- Clave de API -->
        <ui-card titulo="Clave de API de Gemini">
          <div class="flex flex-wrap items-center gap-2">
            <ui-badge [color]="colorOrigen(c.origenClave)">{{ etiquetaOrigen(c.origenClave) }}</ui-badge>
            @if (c.claveEnmascarada) {
              <code class="rounded bg-muted px-2 py-0.5 text-sm">{{ c.claveEnmascarada }}</code>
            }
          </div>

          @if (c.claveGuardadaIlegible) {
            <p class="mt-3 flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
              <ui-icon name="triangle-alert" [size]="16" clase="mt-0.5 shrink-0 text-destructive" />
              La clave guardada no se puede leer (cambió la clave de cifrado del servidor). Ingrésela de nuevo.
            </p>
          }
          @if (c.origenClave === 'SIN_CONFIGURAR') {
            <p class="mt-3 text-sm text-destructive">
              Sin clave, el chatbot no puede responder: deriva todas las consultas al personal.
            </p>
          }

          <div class="mt-4">
            <ui-input
              label="Nueva clave de API"
              type="password"
              icono="lock"
              placeholder="Déjela vacía para conservar la actual"
              [control]="apiKey"
            />
            <p class="mt-1.5 text-xs text-muted-foreground">
              Se obtiene en
              <a class="text-primary underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">
                Google AI Studio</a
              >. Se guarda cifrada y nunca se vuelve a mostrar completa.
            </p>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <ui-button variante="outline" [cargando]="cargandoDisponibles()" (click)="cargarDisponibles()">
              <ui-icon name="refresh-cw" [size]="16" /> Ver modelos de esta clave
            </ui-button>
            @if (c.origenClave === 'INTRANET') {
              <ui-button variante="ghost" (click)="confirmarQuitarClave.set(true)">
                <ui-icon name="trash" [size]="16" /> Quitar clave guardada
              </ui-button>
            }
          </div>
        </ui-card>

        <!-- Agregar modelo -->
        <ui-card titulo="Agregar modelo">
          @if (opcionesDisponibles().length) {
            <div class="flex items-end gap-2">
              <div class="min-w-0 flex-1">
                <ui-select
                  label="Modelos disponibles para la clave"
                  placeholder="Seleccione un modelo"
                  [control]="modeloSeleccionado"
                  [opciones]="opcionesDisponibles()"
                />
              </div>
              <ui-button [disabled]="!modeloSeleccionado.value" (click)="agregar(modeloSeleccionado.value)">
                <ui-icon name="plus" [size]="16" /> Agregar
              </ui-button>
            </div>
          } @else {
            <p class="text-sm text-muted-foreground">
              Pulse «Ver modelos de esta clave» para elegir de la lista de Google, o escriba el nombre exacto.
            </p>
          }

          <div class="mt-4 flex items-end gap-2">
            <div class="min-w-0 flex-1">
              <ui-input label="Nombre del modelo" placeholder="p. ej. gemini-2.5-flash" [control]="modeloManual" />
            </div>
            <ui-button variante="outline" (click)="agregarManual()">
              <ui-icon name="plus" [size]="16" /> Agregar
            </ui-button>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">
            En el plan gratuito, los modelos «flash» tienen pocas solicitudes por día y los «flash-lite» bastantes más:
            conviene dejar los «lite» al final como reserva.
          </p>
        </ui-card>
      </div>

      <!-- Orden de modelos -->
      <ui-card titulo="Modelos en orden de preferencia" class="mt-6">
        <p class="-mt-1 mb-4 text-sm text-muted-foreground">
          El chatbot usa el primero que esté disponible. Origen actual:
          <span class="font-medium text-foreground">{{ etiquetaOrigen(c.origenModelos) }}</span>.
        </p>

        <ol class="space-y-2">
          @for (modelo of modelos(); track modelo; let i = $index, primero = $first, ultimo = $last) {
            <li class="rounded-lg border border-border p-3">
              <div class="flex flex-wrap items-center gap-3">
                <span class="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{{ i + 1 }}</span>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-mono text-sm font-medium">{{ modelo }}</p>
                  @if (estado(modelo); as e) {
                    @if (!e.disponible) {
                      <p class="text-xs text-muted-foreground">
                        En pausa hasta {{ e.apartadoHasta | date: 'dd/MM HH:mm' }} · {{ e.motivo }}
                      </p>
                    }
                  }
                </div>
                @if (estado(modelo); as e) {
                  <ui-badge [color]="e.disponible ? 'success' : 'warning'">{{ e.disponible ? 'Disponible' : 'En pausa' }}</ui-badge>
                } @else {
                  <ui-badge color="neutral">Sin guardar</ui-badge>
                }
                <div class="flex items-center gap-1">
                  <ui-button variante="ghost" [soloIcono]="true" [disabled]="primero" (click)="mover(i, -1)" aria-label="Subir">
                    <ui-icon name="arrow-up" [size]="16" />
                  </ui-button>
                  <ui-button variante="ghost" [soloIcono]="true" [disabled]="ultimo" (click)="mover(i, 1)" aria-label="Bajar">
                    <ui-icon name="arrow-down" [size]="16" />
                  </ui-button>
                  <ui-button variante="outline" [cargando]="probando() === modelo" [disabled]="!!probando()" (click)="probar(modelo)">
                    Probar
                  </ui-button>
                  <ui-button variante="ghost" [soloIcono]="true" [disabled]="modelos().length === 1" (click)="quitar(i)" aria-label="Quitar">
                    <ui-icon name="x" [size]="16" />
                  </ui-button>
                </div>
              </div>
              @if (pruebas()[modelo]; as p) {
                <p class="mt-2 flex items-start gap-2 text-sm" [class.text-destructive]="!p.exitoso">
                  <ui-icon [name]="p.exitoso ? 'circle-check-big' : 'circle-x'" [size]="16" clase="mt-0.5 shrink-0" />
                  <span>{{ p.mensaje }} @if (p.exitoso) { ({{ p.milisegundos }} ms) }</span>
                </p>
              }
            </li>
          }
        </ol>

        <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p class="text-xs text-muted-foreground">
            @if (c.actualizadoEn) {
              Última actualización: {{ c.actualizadoEn | date: 'dd/MM/yyyy HH:mm' }}
            } @else {
              Aún no se guardó configuración desde la intranet: se usan las variables del servidor.
            }
          </p>
          <div class="flex gap-2">
            <ui-button variante="outline" [disabled]="!hayCambios() || guardando()" (click)="descartar()">Descartar</ui-button>
            <ui-button [cargando]="guardando()" [disabled]="!hayCambios()" (click)="guardar(false)">Guardar cambios</ui-button>
          </div>
        </div>
      </ui-card>
    }

    <ui-confirm-dialog
      [abierto]="confirmarQuitarClave()"
      variante="warning"
      titulo="¿Quitar la clave guardada?"
      mensaje="El chatbot volverá a usar la clave configurada en el servidor (GEMINI_API_KEY). Si no hay ninguna, dejará de responder."
      textoConfirmar="Quitar clave"
      (cancelar)="confirmarQuitarClave.set(false)"
      (confirmar)="guardar(true)"
    />
  `,
})
export class ConfiguracionGeminiComponent {
  private readonly servicio = inject(ConfiguracionGeminiService);
  private readonly toast = inject(ToastService);

  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly cargandoDisponibles = signal(false);
  protected readonly probando = signal<string | null>(null);
  protected readonly confirmarQuitarClave = signal(false);

  protected readonly config = signal<ConfiguracionGemini | null>(null);
  /** Lista editable; se compara con la guardada para saber si hay cambios. */
  protected readonly modelos = signal<string[]>([]);
  protected readonly disponibles = signal<ModeloGeminiDisponible[]>([]);
  protected readonly pruebas = signal<Record<string, ResultadoPruebaGemini>>({});

  protected readonly apiKey = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(200), Validators.pattern(PATRON_CLAVE)],
  });
  protected readonly modeloManual = new FormControl('', { nonNullable: true, validators: [Validators.pattern(PATRON_MODELO)] });
  protected readonly modeloSeleccionado = new FormControl('', { nonNullable: true });

  private readonly claveEscrita = signal('');

  private readonly estadoPorModelo = computed(() => {
    const mapa = new Map<string, EstadoModeloGemini>();
    for (const e of this.config()?.modelos ?? []) {
      mapa.set(e.modelo, e);
    }
    return mapa;
  });

  protected readonly opcionesDisponibles = computed<OpcionSelect[]>(() => {
    const enLista = new Set(this.modelos());
    return this.disponibles()
      .filter((m) => !enLista.has(m.id))
      .map((m) => ({ value: m.id, label: m.nombre && m.nombre !== m.id ? `${m.nombre} (${m.id})` : m.id }));
  });

  protected readonly hayCambios = computed(() => {
    const guardados = (this.config()?.modelos ?? []).map((m) => m.modelo);
    const actuales = this.modelos();
    const ordenDistinto = guardados.length !== actuales.length || guardados.some((m, i) => m !== actuales[i]);
    return ordenDistinto || this.claveEscrita().trim().length > 0;
  });

  constructor() {
    this.apiKey.valueChanges.subscribe((v) => this.claveEscrita.set(v));
    this.cargar();
  }

  protected etiquetaOrigen(origen: OrigenConfiguracionGemini): string {
    return ETIQUETA_ORIGEN[origen];
  }

  protected colorOrigen(origen: OrigenConfiguracionGemini): ColorBadge {
    return COLOR_ORIGEN[origen];
  }

  protected estado(modelo: string): EstadoModeloGemini | undefined {
    return this.estadoPorModelo().get(modelo);
  }

  protected mover(indice: number, delta: -1 | 1): void {
    this.modelos.update((lista) => {
      const copia = [...lista];
      const destino = indice + delta;
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  protected quitar(indice: number): void {
    this.modelos.update((lista) => lista.filter((_, i) => i !== indice));
  }

  protected agregar(modelo: string): void {
    const limpio = modelo.trim();
    if (!limpio) {
      return;
    }
    if (this.modelos().includes(limpio)) {
      this.toast.mostrar(`${limpio} ya está en la lista`);
      return;
    }
    if (this.modelos().length >= MAXIMO_MODELOS) {
      this.toast.error(`Se permiten como máximo ${MAXIMO_MODELOS} modelos`);
      return;
    }
    this.modelos.update((lista) => [...lista, limpio]);
    this.modeloSeleccionado.setValue('');
  }

  protected agregarManual(): void {
    if (this.modeloManual.invalid || !this.modeloManual.value.trim()) {
      this.modeloManual.markAsTouched();
      return;
    }
    this.agregar(this.modeloManual.value);
    this.modeloManual.reset();
  }

  protected cargarDisponibles(): void {
    if (this.apiKey.invalid) {
      this.apiKey.markAsTouched();
      return;
    }
    this.cargandoDisponibles.set(true);
    this.servicio.modelosDisponibles(this.claveParaEnviar()).subscribe({
      next: (lista) => {
        this.cargandoDisponibles.set(false);
        this.disponibles.set(lista);
        this.toast.exito(`La clave funciona: ${lista.length} modelos disponibles`);
      },
      error: (e: HttpErrorResponse) => {
        this.cargandoDisponibles.set(false);
        this.toast.error(this.mensajeError(e, 'No se pudo consultar los modelos'));
      },
    });
  }

  /** Prueba con la clave escrita (si hay) o con la vigente, antes de guardar. */
  protected probar(modelo: string): void {
    if (this.apiKey.invalid) {
      this.apiKey.markAsTouched();
      return;
    }
    this.probando.set(modelo);
    this.servicio.probar(this.claveParaEnviar(), modelo).subscribe({
      next: (r) => {
        this.probando.set(null);
        this.pruebas.update((p) => ({ ...p, [modelo]: r }));
      },
      error: (e: HttpErrorResponse) => {
        this.probando.set(null);
        this.toast.error(this.mensajeError(e, 'No se pudo probar el modelo'));
      },
    });
  }

  protected descartar(): void {
    this.aplicar(this.config());
  }

  protected guardar(eliminarClave: boolean): void {
    this.confirmarQuitarClave.set(false);
    if (this.apiKey.invalid) {
      this.apiKey.markAsTouched();
      return;
    }
    if (this.modelos().length === 0) {
      this.toast.error('Agregue al menos un modelo');
      return;
    }
    this.guardando.set(true);
    this.servicio
      .actualizar({ apiKey: eliminarClave ? null : this.claveParaEnviar(), eliminarClave, modelos: this.modelos() })
      .subscribe({
        next: (c) => {
          this.guardando.set(false);
          this.aplicar(c);
          this.toast.exito(eliminarClave ? 'Se quitó la clave guardada' : 'Configuración guardada. El chatbot ya la usa.');
        },
        error: (e: HttpErrorResponse) => {
          this.guardando.set(false);
          this.toast.error(this.mensajeError(e, 'No se pudo guardar la configuración'));
        },
      });
  }

  private cargar(): void {
    this.servicio.obtener().subscribe({
      next: (c) => {
        this.cargando.set(false);
        this.aplicar(c);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.toast.error(this.mensajeError(e, 'No se pudo cargar la configuración'));
      },
    });
  }

  private aplicar(c: ConfiguracionGemini | null): void {
    this.config.set(c);
    this.modelos.set((c?.modelos ?? []).map((m) => m.modelo));
    this.apiKey.reset();
    this.pruebas.set({});
  }

  private claveParaEnviar(): string | null {
    const clave = this.apiKey.value.trim();
    return clave ? clave : null;
  }

  private mensajeError(e: HttpErrorResponse, porDefecto: string): string {
    return (e.error as ErrorResponse | undefined)?.message ?? porDefecto;
  }
}
