import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { PacienteService } from '../paciente.service';
import { MedicionRegistroService } from '../../../core/services/medicion-registro.service';
import { ConvenioSeguro } from '../../../core/models/paciente.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { InputComponent } from '../../../shared/ui/input/input';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';
import { TabsComponent } from '../../../shared/ui/tabs/tabs';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { documentoUnicoValidator } from '../../../shared/validators/documento-unico.validator';
import { telefonoValidator } from '../../../shared/validators/telefono.validator';
import { correoDistintoValidator } from '../../../shared/validators/correo-distinto.validator';

const OPCIONES_CONVENIO: OpcionSelect[] = [
  { value: 'ESSALUD', label: 'EsSalud' },
  { value: 'SIS', label: 'SIS' },
  { value: 'EPS', label: 'EPS' },
  { value: 'PARTICULAR', label: 'Particular' },
];

const TABS = ['Datos personales', 'Informacion clinica', 'Contacto'] as const;
type Tab = (typeof TABS)[number];

/**
 * Formulario de paciente con validacion en tres niveles (seccion 7):
 * (1) formato por campo, (2) unicidad de documento via validador asincrono,
 * (3) errores de negocio devueltos por el backend, mapeados al control
 * correspondiente con setErrors(...). Las 3 secciones son pestanas visuales;
 * es un unico FormGroup por debajo, asi que cambiar de pestana nunca pierde
 * valores ya escritos en otra.
 */
@Component({
  selector: 'app-paciente-form',
  imports: [ReactiveFormsModule, InputComponent, SelectComponent, ButtonComponent, ModalComponent, TabsComponent],
  templateUrl: './paciente-form.html',
})
export class PacienteFormComponent {
  private readonly pacienteService = inject(PacienteService);
  private readonly toastService = inject(ToastService);
  private readonly medicionRegistroService = inject(MedicionRegistroService);

  pacienteId = input<number | null>(null);
  abierto = input(false);
  cerrar = output<void>();
  guardado = output<void>();

  protected readonly opcionesConvenio = OPCIONES_CONVENIO;
  protected readonly tabs = TABS;
  protected readonly tabActiva = signal<Tab>('Datos personales');
  protected readonly enviando = signal(false);
  /** Sesion de medicion del TPR abierta al mostrar el formulario (la cierra el servidor al guardar). */
  private readonly medicionId = signal<number | null>(null);

  private readonly camposPorTab: Record<Tab, string[]> = {
    'Datos personales': ['nombres', 'apellidos', 'documentoIdentidad', 'fechaNacimiento', 'telefono', 'email', 'direccion', 'convenioSeguro'],
    'Informacion clinica': ['tipoCancer', 'estadioClinico', 'fechaDiagnostico'],
    Contacto: ['contactoEmergenciaNombre', 'contactoEmergenciaTelefono', 'contactoEmergenciaEmail'],
  };

  protected readonly form = new FormGroup({
    nombres: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    apellidos: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    documentoIdentidad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{8,12}$/)],
      asyncValidators: [
        documentoUnicoValidator((documento) =>
          this.pacienteService
            .documentoDisponible(documento, this.pacienteId() ?? undefined)
            .pipe(map((respuesta) => respuesta.disponible)),
        ),
      ],
    }),
    fechaNacimiento: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    telefono: new FormControl('', { validators: [telefonoValidator] }),
    // Obligatorio: los recordatorios de cita tambien salen por correo.
    email: new FormControl('', { validators: [Validators.required, Validators.email, Validators.maxLength(150)] }),
    direccion: new FormControl(''),
    tipoCancer: new FormControl(''),
    estadioClinico: new FormControl(''),
    fechaDiagnostico: new FormControl(''),
    medicoTratanteId: new FormControl<number | null>(null),
    convenioSeguro: new FormControl<ConvenioSeguro>('PARTICULAR', { nonNullable: true, validators: [Validators.required] }),
    contactoEmergenciaNombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    contactoEmergenciaTelefono: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, telefonoValidator],
    }),
    contactoEmergenciaEmail: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.maxLength(150),
        correoDistintoValidator((): string | null | undefined => this.form?.controls.email.value),
      ],
    }),
    // Ley 29733: consentimiento expreso, por eso empieza desmarcado.
    contactoRecibeRecordatorios: new FormControl(false, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      if (!this.abierto()) {
        return;
      }
      this.enviando.set(false);
      this.tabActiva.set('Datos personales');

      const id = this.pacienteId();
      this.medicionId.set(null);
      this.medicionRegistroService
        .iniciar(id ? 'ACTUALIZACION_PACIENTE' : 'REGISTRO_PACIENTE')
        .subscribe((medicionId) => this.medicionId.set(medicionId));
      if (id) {
        this.pacienteService.porId(id).subscribe((paciente) => {
          this.form.patchValue({
            ...paciente,
            fechaDiagnostico: paciente.fechaDiagnostico ?? '',
            contactoEmergenciaEmail: paciente.contactoEmergenciaEmail ?? '',
          });
        });
      } else {
        this.form.reset({ convenioSeguro: 'PARTICULAR', contactoRecibeRecordatorios: false });
      }
    });
  }

  protected guardar(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      this.irAPrimeraTabInvalida();
      return;
    }

    this.enviando.set(true);
    const valores = this.form.getRawValue();

    const datos = {
      ...valores,
      fechaDiagnostico: valores.fechaDiagnostico || null,
      telefono: valores.telefono || null,
      email: valores.email || null,
      direccion: valores.direccion || null,
      tipoCancer: valores.tipoCancer || null,
      estadioClinico: valores.estadioClinico || null,
      medicionId: this.medicionId(),
    };

    const id = this.pacienteId();
    const operacion = id ? this.pacienteService.actualizar(id, datos) : this.pacienteService.registrar(datos);

    operacion.subscribe({
      next: () => {
        this.toastService.exito(id ? 'Paciente actualizado correctamente' : 'Paciente registrado correctamente');
        this.enviando.set(false);
        this.guardado.emit();
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        this.mapearErroresDelBackend(error);
        this.irAPrimeraTabInvalida();
      },
    });
  }

  private irAPrimeraTabInvalida(): void {
    for (const tab of this.tabs) {
      const tieneInvalido = this.camposPorTab[tab].some((campo) => this.form.get(campo)?.invalid);
      if (tieneInvalido) {
        this.tabActiva.set(tab);
        return;
      }
    }
  }

  private mapearErroresDelBackend(error: HttpErrorResponse): void {
    const cuerpo = error.error as ErrorResponse | undefined;

    if (error.status === 409) {
      this.form.controls.documentoIdentidad.setErrors({ documentoEnUso: true });
      return;
    }

    if (cuerpo?.errores?.length) {
      for (const campoError of cuerpo.errores) {
        const control = this.form.get(campoError.campo);
        control?.setErrors({ backend: { mensaje: campoError.mensaje } });
      }
      return;
    }

    this.toastService.error(cuerpo?.message ?? 'No se pudo guardar el paciente');
  }
}
