import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PacienteService } from '../paciente.service';
import { EstadisticasPacientes, EstadoTratamientoPaciente, PacienteResumen } from '../../../core/models/paciente.model';
import { Pagina } from '../../../core/models/pagina.model';
import { ColumnaTabla, DataTableComponent } from '../../../shared/components/data-table/data-table';
import { CellTemplateDirective } from '../../../shared/components/data-table/cell-template.directive';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { DataTableToolbarComponent } from '../../../shared/components/data-table-toolbar/data-table-toolbar';
import { RowActionsComponent } from '../../../shared/components/row-actions/row-actions';
import { RowActionItemDirective } from '../../../shared/components/row-actions/row-action-item.directive';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { BadgeComponent } from '../../../shared/ui/badge/badge';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar';
import { IconComponent } from '../../../shared/ui/icon/icon';
import type { NombreIcono } from '../../../shared/ui/icon/icon-data';
import { TabsComponent } from '../../../shared/ui/tabs/tabs';
import { EstadoColorPipe } from '../../../shared/pipes/estado-color.pipe';
import { EtiquetaEnumPipe, formatoEtiquetaEnum } from '../../../shared/pipes/etiqueta-enum.pipe';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { PacienteDetalleComponent } from '../paciente-detalle/paciente-detalle';
import { PacienteFormComponent } from '../paciente-form/paciente-form';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../../shared/constants/paginacion';

const TABS = ['Todos', 'En tratamiento', 'Finalizados', 'Suspendidos'] as const;
type TabPaciente = (typeof TABS)[number];

const ESTADO_POR_TAB: Record<TabPaciente, EstadoTratamientoPaciente | null> = {
  Todos: null,
  'En tratamiento': 'EN_TRATAMIENTO',
  Finalizados: 'FINALIZADO',
  Suspendidos: 'SUSPENDIDO',
};

const ICONO_POR_ESTADO: Record<EstadoTratamientoPaciente, NombreIcono> = {
  PENDIENTE: 'circle-alert',
  EN_TRATAMIENTO: 'stethoscope',
  FINALIZADO: 'circle-check-big',
  SUSPENDIDO: 'circle-x',
};

@Component({
  selector: 'app-pacientes-list',
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    CellTemplateDirective,
    PageHeaderComponent,
    DataTableToolbarComponent,
    RowActionsComponent,
    RowActionItemDirective,
    StatCardComponent,
    ButtonComponent,
    BadgeComponent,
    AvatarComponent,
    IconComponent,
    TabsComponent,
    EstadoColorPipe,
    EtiquetaEnumPipe,
    PacienteDetalleComponent,
    PacienteFormComponent,
  ],
  templateUrl: './pacientes-list.html',
})
export class PacientesListComponent {
  private readonly pacienteService = inject(PacienteService);
  private readonly toastService = inject(ToastService);

  protected readonly busqueda = new FormControl('', { nonNullable: true });
  protected readonly cargando = signal(false);
  protected readonly pagina = signal<Pagina<PacienteResumen>>({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: TAMANO_PAGINA_POR_DEFECTO });
  protected readonly pacienteSeleccionado = signal<import('../../../core/models/paciente.model').Paciente | null>(null);

  protected readonly formAbierto = signal(false);
  protected readonly pacienteIdEnEdicion = signal<number | null>(null);

  protected readonly tabs = TABS;
  protected readonly tabActiva = signal<TabPaciente>('Todos');

  protected readonly estadisticas = signal<EstadisticasPacientes | null>(null);

  protected readonly columnas: ColumnaTabla<PacienteResumen>[] = [
    { encabezado: 'Paciente', clave: 'paciente', valor: (p) => `${p.nombres} ${p.apellidos}` },
    { encabezado: 'DNI', valor: (p) => p.documentoIdentidad },
    { encabezado: 'Tipo de cancer', valor: (p) => p.tipoCancer ?? 'No especificado' },
    { encabezado: 'Estado', clave: 'estado', valor: (p) => formatoEtiquetaEnum(p.estadoTratamiento) },
    { encabezado: 'Ultima cita', valor: (p) => this.formatoFecha(p.ultimaCita) },
    { encabezado: 'Proxima cita', valor: (p) => this.formatoFecha(p.proximaCita) },
    { encabezado: 'Medico tratante', clave: 'medico', valor: (p) => p.medicoTratanteNombre ?? 'Sin asignar' },
  ];

  constructor() {
    this.cargar(0);
    this.cargarEstadisticas();
    this.busqueda.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.cargar(0));
  }

  protected cargar(page: number): void {
    this.cargando.set(true);
    this.pacienteService.buscarResumen(this.busqueda.value, ESTADO_POR_TAB[this.tabActiva()], page).subscribe({
      next: (respuesta) => {
        this.pagina.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar el listado de pacientes');
        this.cargando.set(false);
      },
    });
  }

  private cargarEstadisticas(): void {
    this.pacienteService.estadisticas().subscribe({
      next: (datos) => this.estadisticas.set(datos),
      error: () => this.estadisticas.set(null),
    });
  }

  protected cambiarTab(tab: TabPaciente): void {
    this.tabActiva.set(tab);
    this.cargar(0);
  }

  protected verDetalle(fila: PacienteResumen): void {
    this.pacienteService.porId(fila.id).subscribe((paciente) => this.pacienteSeleccionado.set(paciente));
  }

  protected abrirCrear(): void {
    this.pacienteIdEnEdicion.set(null);
    this.formAbierto.set(true);
  }

  protected editarPaciente(fila: PacienteResumen): void {
    this.pacienteIdEnEdicion.set(fila.id);
    this.formAbierto.set(true);
  }

  protected alGuardarPaciente(): void {
    this.formAbierto.set(false);
    this.cargar(this.pagina().pageNumber);
    this.cargarEstadisticas();
  }

  protected iconoEstado(estado: EstadoTratamientoPaciente): NombreIcono {
    return ICONO_POR_ESTADO[estado];
  }

  protected formatoNumero(valor: number): string {
    return valor.toLocaleString('es-PE');
  }

  private formatoFecha(fecha: string | null): string {
    if (!fecha) {
      return '—';
    }
    return new Date(fecha).toLocaleDateString('es-PE');
  }
}
