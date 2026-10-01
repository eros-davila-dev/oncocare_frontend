import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstudioService } from '../estudio.service';
import { PacienteService } from '../../pacientes/paciente.service';
import { Fase, FaseEstudio, MotivoExclusion, Participante } from '../../../core/models/estudio.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { CardComponent } from '../../../shared/ui/card/card';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { InputComponent } from '../../../shared/ui/input/input';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { BadgeComponent } from '../../../shared/ui/badge/badge';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { fechaCorta } from '../indicadores.util';

const MOTIVOS_EXCLUSION: OpcionSelect[] = [
  { value: 'SUSPENDIO_TRATAMIENTO', label: 'Suspendió el tratamiento' },
  { value: 'FALLECIO', label: 'Falleció' },
  { value: 'RETIRO_CONSENTIMIENTO', label: 'Retiró el consentimiento' },
  { value: 'REGISTROS_INCOMPLETOS', label: 'Registros incompletos o ilegibles' },
  { value: 'OTRO', label: 'Otro' },
];

interface FormularioFase {
  fase: Fase;
  form: FormGroup<{ fechaInicio: FormControl<string>; fechaFin: FormControl<string> }>;
}

/**
 * Configuracion del diseno pretest-postest: fechas de cada fase (cerrarla
 * congela sus resultados) y muestra de participantes con consentimiento.
 */
@Component({
  selector: 'app-estudio-muestra',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CardComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    ModalComponent,
    BadgeComponent,
    ConfirmDialogComponent,
  ],
  templateUrl: './estudio-muestra.html',
})
export class EstudioMuestraComponent {
  private readonly estudioService = inject(EstudioService);
  private readonly pacienteService = inject(PacienteService);
  private readonly toast = inject(ToastService);

  protected readonly fechaCorta = fechaCorta;
  protected readonly motivosExclusion = MOTIVOS_EXCLUSION;

  protected readonly fases = signal<FaseEstudio[]>([]);
  protected readonly formulariosFase: FormularioFase[] = (['PRETEST', 'POSTEST'] as Fase[]).map((fase) => ({
    fase,
    form: new FormGroup({
      fechaInicio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      fechaFin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    }),
  }));

  protected readonly participantes = signal<Participante[]>([]);
  protected readonly incluidos = computed(() => this.participantes().filter((p) => p.incluido).length);
  protected readonly opcionesPacientes = signal<OpcionSelect[]>([]);

  protected readonly modalIncluir = signal(false);
  protected readonly formIncluir = new FormGroup({
    pacienteId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fechaConsentimiento: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    observacion: new FormControl(''),
  });

  protected readonly participanteAExcluir = signal<Participante | null>(null);
  protected readonly formExcluir = new FormGroup({
    motivo: new FormControl<MotivoExclusion | null>(null, { validators: [Validators.required] }),
    observacion: new FormControl(''),
  });

  protected readonly enviando = signal(false);
  protected readonly faseACerrar = signal<Fase | null>(null);

  constructor() {
    this.cargarFases();
    this.cargarParticipantes();
  }

  protected estadoDe(fase: Fase): FaseEstudio | undefined {
    return this.fases().find((f) => f.fase === fase);
  }

  protected guardarFase(item: FormularioFase): void {
    if (item.form.invalid) {
      item.form.markAllAsTouched();
      return;
    }
    const { fechaInicio, fechaFin } = item.form.getRawValue();
    this.estudioService.configurarFase(item.fase, fechaInicio, fechaFin).subscribe({
      next: () => {
        this.toast.exito(`Fechas del ${item.fase.toLowerCase()} guardadas`);
        this.cargarFases();
      },
      error: (e: HttpErrorResponse) => this.toast.error(this.mensaje(e)),
    });
  }

  protected cerrarFase(): void {
    const fase = this.faseACerrar();
    if (!fase) {
      return;
    }
    this.faseACerrar.set(null);
    this.estudioService.cerrarFase(fase).subscribe({
      next: () => {
        this.toast.exito(`El ${fase.toLowerCase()} quedó cerrado`);
        this.cargarFases();
      },
      error: (e: HttpErrorResponse) => this.toast.error(this.mensaje(e)),
    });
  }

  protected abrirIncluir(): void {
    this.formIncluir.reset({ fechaConsentimiento: '' });
    if (this.opcionesPacientes().length === 0) {
      this.pacienteService.buscar('', 0, 100).subscribe((pagina) => {
        const yaIncluidos = new Set(this.participantes().map((p) => p.pacienteId));
        this.opcionesPacientes.set(
          pagina.content
            .filter((p) => !yaIncluidos.has(p.id))
            .map((p) => ({ value: p.id, label: `${p.nombres} ${p.apellidos} - ${p.documentoIdentidad}` })),
        );
      });
    }
    this.modalIncluir.set(true);
  }

  protected incluir(): void {
    if (this.formIncluir.invalid) {
      this.formIncluir.markAllAsTouched();
      return;
    }
    const v = this.formIncluir.getRawValue();
    this.enviando.set(true);
    this.estudioService.incluirParticipante(v.pacienteId!, v.fechaConsentimiento, v.observacion || null).subscribe({
      next: (p) => {
        this.enviando.set(false);
        this.modalIncluir.set(false);
        this.toast.exito(`Paciente incluido como ${p.codigo}`);
        this.opcionesPacientes.set([]);
        this.cargarParticipantes();
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.toast.error(this.mensaje(e));
      },
    });
  }

  protected abrirExcluir(participante: Participante): void {
    this.formExcluir.reset();
    this.participanteAExcluir.set(participante);
  }

  protected excluir(): void {
    const participante = this.participanteAExcluir();
    if (!participante || this.formExcluir.invalid) {
      this.formExcluir.markAllAsTouched();
      return;
    }
    const v = this.formExcluir.getRawValue();
    this.estudioService.excluirParticipante(participante.id, v.motivo!, v.observacion || null).subscribe({
      next: () => {
        this.participanteAExcluir.set(null);
        this.toast.exito(`${participante.codigo} excluido del estudio (sus datos se conservan)`);
        this.cargarParticipantes();
      },
      error: (e: HttpErrorResponse) => this.toast.error(this.mensaje(e)),
    });
  }

  protected reincorporar(participante: Participante): void {
    this.estudioService.reincorporarParticipante(participante.id).subscribe({
      next: () => {
        this.toast.exito(`${participante.codigo} reincorporado`);
        this.cargarParticipantes();
      },
      error: (e: HttpErrorResponse) => this.toast.error(this.mensaje(e)),
    });
  }

  protected etiquetaMotivo(motivo: MotivoExclusion | null): string {
    return MOTIVOS_EXCLUSION.find((m) => m.value === motivo)?.label ?? '';
  }

  private cargarFases(): void {
    this.estudioService.fases().subscribe((fases) => {
      this.fases.set(fases);
      for (const item of this.formulariosFase) {
        const fase = fases.find((f) => f.fase === item.fase);
        if (fase) {
          item.form.reset({ fechaInicio: fase.fechaInicio, fechaFin: fase.fechaFin });
        }
        if (fase?.estado === 'CERRADA') {
          item.form.disable();
        }
      }
    });
  }

  private cargarParticipantes(): void {
    this.estudioService.participantes().subscribe((lista) => this.participantes.set(lista));
  }

  private mensaje(error: HttpErrorResponse): string {
    return (error.error as ErrorResponse | undefined)?.message ?? 'No se pudo completar la operación';
  }
}
