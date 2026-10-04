import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CitaService } from '../cita.service';
import { MedicionRegistroService } from '../../../core/services/medicion-registro.service';
import { PacienteService } from '../../pacientes/paciente.service';
import { UsuarioService } from '../../usuarios/usuario.service';
import { Cita, EstadoCita } from '../../../core/models/cita.model';
import { UsuarioResumen, Especialidad } from '../../../core/models/usuario.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { Pagina } from '../../../core/models/pagina.model';
import { ColumnaTabla, DataTableComponent } from '../../../shared/components/data-table/data-table';
import { AppointmentCalendarComponent } from '../../../shared/components/appointment-calendar/appointment-calendar';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { RowActionsComponent } from '../../../shared/components/row-actions/row-actions';
import { RowActionItemDirective } from '../../../shared/components/row-actions/row-action-item.directive';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { InputComponent } from '../../../shared/ui/input/input';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';
import { TabsComponent } from '../../../shared/ui/tabs/tabs';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../../shared/constants/paginacion';

type VistaCitas = 'tabla' | 'calendario';

const OPCIONES_ESPECIALIDAD: OpcionSelect[] = [
  { value: 'ONCOLOGIA_CLINICA', label: 'Oncologia clinica' },
  { value: 'ONCOLOGIA_QUIRURGICA', label: 'Oncologia quirurgica' },
  { value: 'RADIOTERAPIA', label: 'Radioterapia' },
  { value: 'CUIDADOS_PALIATIVOS', label: 'Cuidados paliativos' },
];

const TABS = ['Todas', 'Programada', 'Confirmada', 'Atendida', 'Cancelada', 'No asistió'] as const;
type TabCita = (typeof TABS)[number];

const ESTADO_POR_TAB: Record<TabCita, EstadoCita | undefined> = {
  Todas: undefined,
  Programada: 'PROGRAMADA',
  Confirmada: 'CONFIRMADA',
  Atendida: 'ATENDIDA',
  Cancelada: 'CANCELADA',
  'No asistió': 'NO_ASISTIO',
};

@Component({
  selector: 'app-citas-list',
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    AppointmentCalendarComponent,
    PageHeaderComponent,
    RowActionsComponent,
    RowActionItemDirective,
    ModalComponent,
    InputComponent,
    SelectComponent,
    TabsComponent,
    ButtonComponent,
    IconComponent,
  ],
  templateUrl: './citas-list.html',
})
export class CitasListComponent {
  private readonly citaService = inject(CitaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly toastService = inject(ToastService);
  private readonly medicionRegistroService = inject(MedicionRegistroService);

  protected readonly vista = signal<VistaCitas>('tabla');
  protected readonly cargando = signal(false);
  protected readonly pagina = signal<Pagina<Cita>>({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: TAMANO_PAGINA_POR_DEFECTO });
  protected readonly tabs = TABS;
  protected readonly tabActiva = signal<TabCita>('Todas');

  protected readonly citaACancelar = signal<Cita | null>(null);
  protected readonly motivoCancelacion = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  protected readonly opcionesEspecialidad = OPCIONES_ESPECIALIDAD;
  protected readonly modalAgendarAbierto = signal(false);
  /** Sesion de medicion del TPR (registro de cita) abierta al mostrar el formulario. */
  private readonly medicionId = signal<number | null>(null);
  protected readonly enviandoAgendar = signal(false);
  protected readonly pacientes = signal<OpcionSelect[]>([]);
  protected readonly medicos = signal<UsuarioResumen[]>([]);
  protected readonly nombresPacientes = signal<Map<number, string>>(new Map());

  protected readonly opcionesMedico = computed<OpcionSelect[]>(() =>
    this.medicos().map((medico) => ({ value: medico.id, label: medico.nombres })),
  );

  protected readonly especialidadSeleccionada = new FormControl<Especialidad | ''>('', { nonNullable: true });

  protected readonly formAgendar = new FormGroup({
    pacienteId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    medicoId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fecha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    hora: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipoConsulta: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    observaciones: new FormControl(''),
  });

  protected readonly columnas: ColumnaTabla<Cita>[] = [
    { encabezado: 'Fecha', valor: (c) => new Date(c.fecha).toLocaleDateString('es-PE') },
    { encabezado: 'Hora', valor: (c) => c.hora },
    { encabezado: 'Tipo de consulta', valor: (c) => c.tipoConsulta },
    { encabezado: 'Paciente', valor: (c) => c.pacienteNombre ?? this.nombresPacientes().get(c.pacienteId) ?? 'Paciente no disponible' },
    { encabezado: 'Medico', valor: (c) => c.medicoNombre ?? (c.medicoId ? 'Médico no disponible' : 'Sin médico asignado') },
  ];

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

  protected abrirModalAgendar(): void {
    this.formAgendar.reset();
    this.especialidadSeleccionada.reset('');
    this.medicos.set([]);
    if (this.pacientes().length === 0) {
      this.cargarPacientes();
    }
    this.medicionId.set(null);
    this.medicionRegistroService.iniciar('REGISTRO_CITA').subscribe((id) => this.medicionId.set(id));
    this.modalAgendarAbierto.set(true);
  }

  protected guardarCita(): void {
    if (this.formAgendar.invalid) {
      this.formAgendar.markAllAsTouched();
      return;
    }

    this.enviandoAgendar.set(true);
    const valores = this.formAgendar.getRawValue();

    this.citaService
      .agendar({
        pacienteId: valores.pacienteId!,
        medicoId: valores.medicoId!,
        fecha: valores.fecha,
        hora: valores.hora,
        tipoConsulta: valores.tipoConsulta,
        observaciones: valores.observaciones || null,
        medicionId: this.medicionId(),
      })
      .subscribe({
        next: () => {
          this.toastService.exito('Cita agendada correctamente');
          this.enviandoAgendar.set(false);
          this.modalAgendarAbierto.set(false);
          this.cargar(0);
        },
        error: (error: HttpErrorResponse) => {
          this.enviandoAgendar.set(false);
          const cuerpo = error.error as ErrorResponse | undefined;
          this.toastService.error(cuerpo?.message ?? 'No se pudo agendar la cita');
        },
      });
  }

  protected cargar(page: number): void {
    this.cargando.set(true);
    this.citaService.listar({ estado: ESTADO_POR_TAB[this.tabActiva()], page, size: TAMANO_PAGINA_POR_DEFECTO }).subscribe({
      next: (respuesta) => {
        this.pagina.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar el listado de citas');
        this.cargando.set(false);
      },
    });
  }

  protected cambiarTab(tab: TabCita): void {
    this.tabActiva.set(tab);
    this.cargar(0);
  }

  protected confirmar(cita: Cita): void {
    this.citaService.confirmar(cita.id).subscribe(() => this.cargar(this.pagina().pageNumber));
  }

  protected atender(cita: Cita): void {
    this.citaService.marcarAtendida(cita.id).subscribe(() => this.cargar(this.pagina().pageNumber));
  }

  protected marcarNoAsistio(cita: Cita): void {
    this.citaService.marcarNoAsistio(cita.id).subscribe(() => this.cargar(this.pagina().pageNumber));
  }

  protected abrirCancelar(cita: Cita): void {
    this.motivoCancelacion.reset('');
    this.citaACancelar.set(cita);
  }

  protected confirmarCancelacion(): void {
    if (this.motivoCancelacion.invalid) {
      this.motivoCancelacion.markAsTouched();
      return;
    }
    const cita = this.citaACancelar();
    if (!cita) {
      return;
    }
    this.citaService.cancelar(cita.id, this.motivoCancelacion.value).subscribe(() => {
      this.citaACancelar.set(null);
      this.cargar(this.pagina().pageNumber);
    });
  }
}
