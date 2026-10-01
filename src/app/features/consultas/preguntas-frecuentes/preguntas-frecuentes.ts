import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConsultaService, PreguntaFrecuente } from '../consulta.service';
import { ErrorResponse } from '../../../core/models/error.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { BadgeComponent } from '../../../shared/ui/badge/badge';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { InputComponent } from '../../../shared/ui/input/input';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';

/**
 * Base de conocimiento del asistente virtual: lo que se cargue aqui es lo
 * unico que el chatbot puede afirmar sobre horarios, requisitos o ubicacion.
 * Si una pregunta no esta cubierta, el chatbot la deriva al personal.
 */
@Component({
  selector: 'app-preguntas-frecuentes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PageHeaderComponent, ButtonComponent, BadgeComponent, ModalComponent, InputComponent, SelectComponent],
  template: `
    <ui-page-header
      eyebrow="Asistente virtual"
      titulo="Preguntas frecuentes"
      descripcion="Información oficial que el chatbot usa para responder. Lo que no esté aquí, lo deriva al personal."
    >
      <ui-button (click)="editar(null)">Nueva pregunta</ui-button>
    </ui-page-header>

    <ul class="mt-6 space-y-3">
      @for (p of preguntas(); track p.id) {
        <li class="rounded-xl border border-border bg-card p-4 shadow-card">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ p.pregunta }}</p>
              <p class="mt-1 whitespace-pre-line text-sm text-muted-foreground">{{ p.respuesta }}</p>
            </div>
            <div class="flex items-center gap-2">
              <ui-badge [color]="p.activa ? 'success' : 'neutral'">{{ p.activa ? 'Visible' : 'Oculta' }}</ui-badge>
              <ui-button variante="ghost" (click)="editar(p)">Editar</ui-button>
            </div>
          </div>
          <p class="mt-2 text-xs text-muted-foreground">{{ p.categoria }} · orden {{ p.orden }}</p>
        </li>
      } @empty {
        <li class="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          Aún no hay preguntas. Agregue horarios, ubicación y requisitos de la primera cita.
        </li>
      }
    </ul>

    <ui-modal
      [titulo]="form.controls.id.value ? 'Editar pregunta' : 'Nueva pregunta'"
      descripcion="Escriba la respuesta tal como la diría la recepción: clara y sin datos clínicos."
      [abierto]="modalAbierto()"
      (cerrar)="modalAbierto.set(false)"
    >
      <form class="grid gap-4" (ngSubmit)="guardar()">
        <ui-input label="Pregunta" [control]="form.controls.pregunta" [requerido]="true" />
        <label class="grid gap-1.5">
          <span class="form-label">Respuesta <span class="text-destructive">*</span></span>
          <textarea class="field min-h-28 py-2" [formControl]="form.controls.respuesta"></textarea>
        </label>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ui-input label="Categoría" [control]="form.controls.categoria" />
          <ui-input label="Orden" type="number" [control]="form.controls.orden" />
          <ui-select label="Visible" [control]="form.controls.activa" [opciones]="opcionesVisible" />
        </div>
        <div class="flex justify-end gap-2">
          <ui-button variante="outline" (click)="modalAbierto.set(false)">Cancelar</ui-button>
          <ui-button type="submit" [cargando]="enviando()">Guardar</ui-button>
        </div>
      </form>
    </ui-modal>
  `,
})
export class PreguntasFrecuentesComponent {
  private readonly consultaService = inject(ConsultaService);
  private readonly toast = inject(ToastService);

  protected readonly preguntas = signal<PreguntaFrecuente[]>([]);
  protected readonly modalAbierto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly opcionesVisible: OpcionSelect[] = [
    { value: 'SI', label: 'Sí' },
    { value: 'NO', label: 'No' },
  ];

  protected readonly form = new FormGroup({
    id: new FormControl<number | null>(null),
    pregunta: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    respuesta: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)] }),
    categoria: new FormControl('GENERAL', { nonNullable: true }),
    orden: new FormControl(0, { nonNullable: true }),
    activa: new FormControl<'SI' | 'NO'>('SI', { nonNullable: true }),
  });

  constructor() {
    this.cargar();
  }

  protected editar(pregunta: PreguntaFrecuente | null): void {
    this.form.reset({
      id: pregunta?.id ?? null,
      pregunta: pregunta?.pregunta ?? '',
      respuesta: pregunta?.respuesta ?? '',
      categoria: pregunta?.categoria ?? 'GENERAL',
      orden: pregunta?.orden ?? this.preguntas().length + 1,
      activa: pregunta && !pregunta.activa ? 'NO' : 'SI',
    });
    this.modalAbierto.set(true);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.consultaService
      .guardarPregunta({ ...v, orden: Number(v.orden), activa: v.activa === 'SI' })
      .subscribe({
        next: () => {
          this.enviando.set(false);
          this.modalAbierto.set(false);
          this.toast.exito('Pregunta guardada. El asistente ya la usa en sus respuestas.');
          this.cargar();
        },
        error: (e: HttpErrorResponse) => {
          this.enviando.set(false);
          this.toast.error((e.error as ErrorResponse | undefined)?.message ?? 'No se pudo guardar la pregunta');
        },
      });
  }

  private cargar(): void {
    this.consultaService.preguntasFrecuentes().subscribe((lista) => this.preguntas.set(lista));
  }
}
