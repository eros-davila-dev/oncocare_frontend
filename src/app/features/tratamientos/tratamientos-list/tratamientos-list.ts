import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TratamientoService } from '../tratamiento.service';
import { PacienteService } from '../../pacientes/paciente.service';
import { UsuarioService } from '../../usuarios/usuario.service';
import { CicloTratamiento, TipoTratamiento } from '../../../core/models/tratamiento.model';
import { UsuarioResumen, Especialidad } from '../../../core/models/usuario.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { Pagina } from '../../../core/models/pagina.model';
import { ColumnaTabla, DataTableComponent } from '../../../shared/components/data-table/data-table';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { RowActionsComponent } from '../../../shared/components/row-actions/row-actions';
import { RowActionItemDirective } from '../../../shared/components/row-actions/row-action-item.directive';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { InputComponent } from '../../../shared/ui/input/input';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { formatoEtiquetaEnum } from '../../../shared/pipes/etiqueta-enum.pipe';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../../shared/constants/paginacion';

const OPCIONES_TIPO: OpcionSelect[] = [
  { value: 'QUIMIOTERAPIA', label: 'Quimioterapia' },
  { value: 'RADIOTERAPIA', label: 'Radioterapia' },
  { value: 'CIRUGIA', label: 'Cirugia' },
  { value: 'CUIDADOS_PALIATIVOS', label: 'Cuidados paliativos' },
];

const OPCIONES_ESPECIALIDAD: OpcionSelect[] = [
  { value: 'ONCOLOGIA_CLINICA', label: 'Oncologia clinica' },
  { value: 'ONCOLOGIA_QUIRURGICA', label: 'Oncologia quirurgica' },
  { value: 'RADIOTERAPIA', label: 'Radioterapia' },
  { value: 'CUIDADOS_PALIATIVOS', label: 'Cuidados paliativos' },
];

@Component({
  selector: 'app-tratamientos-list',
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    PageHeaderComponent,
    RowActionsComponent,
    RowActionItemDirective,
    ModalComponent,
    InputComponent,
    SelectComponent,
    ButtonComponent,
  ],
  templateUrl: './tratamientos-list.html',
})
export class TratamientosListComponent {
  private readonly tratamientoService = inject(TratamientoService);
  private readonly pacienteService = inject(PacienteService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly toastService = inject(ToastService);

  protected readonly opcionesTipo = OPCIONES_TIPO;
  protected readonly opcionesEspecialidad = OPCIONES_ESPECIALIDAD;
  protected readonly cargando = signal(false);
  protected readonly modalAbierto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly pacientes = signal<OpcionSelect[]>([]);
  protected readonly medicos = signal<UsuarioResumen[]>([]);
  protected readonly nombresPacientes = signal<Map<number, string>>(new Map());

  protected readonly opcionesMedico = computed<OpcionSelect[]>(() =>
    this.medicos().map((medico) => ({ value: medico.id, label: medico.nombres })),
  );

  protected readonly especialidadSeleccionada = new FormControl<Especialidad | ''>('', { nonNullable: true });

  protected readonly pagina = signal<Pagina<CicloTratamiento>>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    pageNumber: 0,
    pageSize: TAMANO_PAGINA_POR_DEFECTO,
  });

  protected readonly columnas: ColumnaTabla<CicloTratamiento>[] = [
    { encabezado: 'Paciente', valor: (c) => this.nombresPacientes().get(c.pacienteId) ?? `Paciente #${c.pacienteId}` },
    { encabezado: 'Tipo', valor: (c) => formatoEtiquetaEnum(c.tipoTratamiento) },
    { encabezado: 'Sesion', valor: (c) => `${c.numeroSesion} de ${c.totalSesionesEsquema}` },
    { encabezado: 'Cumplimiento', valor: (c) => `${c.porcentajeCumplimiento.toFixed(0)}%` },
    { encabezado: 'Fecha', valor: (c) => new Date(c.fechaSesion).toLocaleDateString('es-PE') },
    { encabezado: 'Estado', valor: (c) => formatoEtiquetaEnum(c.estado) },
  ];

  protected readonly form = new FormGroup({
    pacienteId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    tipoTratamiento: new FormControl<TipoTratamiento>('QUIMIOTERAPIA', { nonNullable: true, validators: [Validators.required] }),
    numeroSesion: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    totalSesionesEsquema: new FormControl(6, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    fechaSesion: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    medicoResponsableId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    observaciones: new FormControl(''),
  });

  constructor() {
    this.cargar(0);
    this.cargarPacientes();
    this.especialidadSeleccionada.valueChanges.subscribe((especialidad) => {
      if (!especialidad) {
        this.medicos.set([]);
        return;
      }
      this.usuarioService.medicosPorEspecialidad(especialidad).subscribe((medicos) => this.medicos.set(medicos));
    });
  }

  private cargarPacientes(): void {
    this.pacienteService.buscar('', 0, 100).subscribe((pagina) => {
      this.pacientes.set(pagina.content.map((p) => ({ value: p.id, label: `${p.nombres} ${p.apellidos} - ${p.documentoIdentidad}` })));
      this.nombresPacientes.set(new Map(pagina.content.map((p) => [p.id, `${p.nombres} ${p.apellidos}`])));
    });
  }

  protected cargar(page: number): void {
    this.cargando.set(true);
    this.tratamientoService.listar(undefined, page).subscribe({
      next: (respuesta) => {
        this.pagina.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar el listado de tratamientos');
        this.cargando.set(false);
      },
    });
  }

  protected abrirModal(): void {
    this.form.reset({ tipoTratamiento: 'QUIMIOTERAPIA', numeroSesion: 1, totalSesionesEsquema: 6 });
    this.especialidadSeleccionada.reset('');
    this.medicos.set([]);
    if (this.pacientes().length === 0) {
      this.cargarPacientes();
    }
    this.modalAbierto.set(true);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    const valores = this.form.getRawValue();

    this.tratamientoService
      .programar({
        pacienteId: valores.pacienteId!,
        tipoTratamiento: valores.tipoTratamiento,
        numeroSesion: valores.numeroSesion,
        totalSesionesEsquema: valores.totalSesionesEsquema,
        fechaSesion: valores.fechaSesion,
        medicoResponsableId: valores.medicoResponsableId!,
        observaciones: valores.observaciones || null,
      })
      .subscribe({
        next: () => {
          this.toastService.exito('Ciclo de tratamiento programado correctamente');
          this.enviando.set(false);
          this.modalAbierto.set(false);
          this.cargar(0);
        },
        error: (error: HttpErrorResponse) => {
          this.enviando.set(false);
          const cuerpo = error.error as ErrorResponse | undefined;
          this.toastService.error(cuerpo?.message ?? 'No se pudo programar el tratamiento');
        },
      });
  }

  protected marcarRealizado(ciclo: CicloTratamiento): void {
    this.tratamientoService.actualizarEstado(ciclo.id, 'REALIZADO').subscribe(() => this.cargar(this.pagina().pageNumber));
  }

  protected suspender(ciclo: CicloTratamiento): void {
    this.tratamientoService.actualizarEstado(ciclo.id, 'SUSPENDIDO').subscribe(() => this.cargar(this.pagina().pageNumber));
  }
}
