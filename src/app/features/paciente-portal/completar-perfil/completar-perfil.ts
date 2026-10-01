import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { PacienteService } from '../../pacientes/paciente.service';
import { MedicionRegistroService } from '../../../core/services/medicion-registro.service';
import { ConvenioSeguro } from '../../../core/models/paciente.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { CardComponent } from '../../../shared/ui/card/card';
import { InputComponent } from '../../../shared/ui/input/input';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { documentoUnicoValidator } from '../../../shared/validators/documento-unico.validator';
import { telefonoValidator } from '../../../shared/validators/telefono.validator';

const OPCIONES_CONVENIO: OpcionSelect[] = [
  { value: 'ESSALUD', label: 'EsSalud' },
  { value: 'SIS', label: 'SIS' },
  { value: 'EPS', label: 'EPS' },
  { value: 'PARTICULAR', label: 'Particular' },
];

/**
 * Paso 2 del autoservicio de pacientes (seccion 7): el paciente ya
 * autenticado (cuenta verificada) completa su ficha clinica basica. No
 * incluye medico tratante ni diagnostico detallado: eso lo asigna/ajusta el
 * staff en la primera consulta, no el propio paciente al registrarse.
 */
@Component({
  selector: 'app-completar-perfil',
  imports: [ReactiveFormsModule, PageHeaderComponent, CardComponent, InputComponent, SelectComponent, ButtonComponent],
  templateUrl: './completar-perfil.html',
})
export class CompletarPerfilComponent {
  private readonly pacienteService = inject(PacienteService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly medicionRegistroService = inject(MedicionRegistroService);

  protected readonly opcionesConvenio = OPCIONES_CONVENIO;
  protected readonly enviando = signal(false);
  /** Sesion de medicion (canal PORTAL) que el servidor cierra al guardar el perfil. */
  private readonly medicionId = signal<number | null>(null);

  protected readonly form = new FormGroup({
    nombres: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    apellidos: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    documentoIdentidad: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^\d{8,12}$/)],
      asyncValidators: [
        documentoUnicoValidator((documento) => this.pacienteService.documentoDisponible(documento).pipe(map((r) => r.disponible))),
      ],
    }),
    fechaNacimiento: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    telefono: new FormControl('', { validators: [Validators.required, telefonoValidator] }),
    email: new FormControl('', { validators: [Validators.email] }),
    direccion: new FormControl(''),
    tipoCancer: new FormControl(''),
    estadioClinico: new FormControl(''),
    fechaDiagnostico: new FormControl(''),
    convenioSeguro: new FormControl<ConvenioSeguro>('PARTICULAR', { nonNullable: true, validators: [Validators.required] }),
    contactoEmergenciaNombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    contactoEmergenciaTelefono: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, telefonoValidator],
    }),
  });

  constructor() {
    this.medicionRegistroService.iniciar('REGISTRO_PACIENTE').subscribe((id) => this.medicionId.set(id));
  }

  protected guardar(): void {
    if (this.form.invalid || this.form.pending) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    const valores = this.form.getRawValue();

    this.pacienteService
      .completarPerfil({
        ...valores,
        fechaDiagnostico: valores.fechaDiagnostico || null,
        telefono: valores.telefono || null,
        email: valores.email || null,
        direccion: valores.direccion || null,
        tipoCancer: valores.tipoCancer || null,
        estadioClinico: valores.estadioClinico || null,
        medicoTratanteId: null,
        medicionId: this.medicionId(),
      })
      .subscribe({
        next: () => {
          this.toastService.exito('¡Listo! Tu perfil quedó registrado.');
          this.router.navigate(['/mis-citas']);
        },
        error: (error: HttpErrorResponse) => {
          this.enviando.set(false);
          this.mapearErroresDelBackend(error);
        },
      });
  }

  private mapearErroresDelBackend(error: HttpErrorResponse): void {
    const cuerpo = error.error as ErrorResponse | undefined;

    // CompletarPerfilPacienteUseCase puede devolver 409 por tres motivos
    // distintos (perfil ya completado, documento o correo duplicado); solo el
    // de documento se mapea al campo, el resto se muestra tal cual llega del
    // backend en vez de asumir siempre "documento en uso".
    if (error.status === 409 && cuerpo?.message?.includes('documento de identidad')) {
      this.form.controls.documentoIdentidad.setErrors({ documentoEnUso: true });
      return;
    }

    if (cuerpo?.errores?.length) {
      for (const campoError of cuerpo.errores) {
        this.form.get(campoError.campo)?.setErrors({ backend: { mensaje: campoError.mensaje } });
      }
      return;
    }

    this.toastService.error(cuerpo?.message ?? 'No se pudo guardar tu perfil');
  }
}
