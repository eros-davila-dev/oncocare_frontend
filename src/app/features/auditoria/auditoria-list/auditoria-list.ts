import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuditoriaService } from '../auditoria.service';
import { UsuarioService } from '../../usuarios/usuario.service';
import { AuditoriaAccion } from '../../../core/models/auditoria.model';
import { Pagina } from '../../../core/models/pagina.model';
import { ColumnaTabla, DataTableComponent } from '../../../shared/components/data-table/data-table';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { DataTableToolbarComponent } from '../../../shared/components/data-table-toolbar/data-table-toolbar';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { formatoEtiquetaEnum } from '../../../shared/pipes/etiqueta-enum.pipe';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../../shared/constants/paginacion';

const OPCIONES_ENTIDAD: OpcionSelect[] = [
  { value: 'PACIENTE', label: 'Paciente' },
  { value: 'CITA', label: 'Cita' },
  { value: 'CICLO_TRATAMIENTO', label: 'Ciclo de tratamiento' },
  { value: 'USUARIO', label: 'Usuario' },
];

@Component({
  selector: 'app-auditoria-list',
  imports: [ReactiveFormsModule, DataTableComponent, PageHeaderComponent, DataTableToolbarComponent, SelectComponent, ButtonComponent],
  templateUrl: './auditoria-list.html',
})
export class AuditoriaListComponent {
  private readonly auditoriaService = inject(AuditoriaService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly toastService = inject(ToastService);

  protected readonly opcionesEntidad = OPCIONES_ENTIDAD;
  protected readonly filtroEntidad = new FormControl<string>('', { nonNullable: true });

  protected readonly cargando = signal(false);
  protected readonly nombresUsuarios = signal<Map<number, string>>(new Map());
  protected readonly pagina = signal<Pagina<AuditoriaAccion>>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    pageNumber: 0,
    pageSize: TAMANO_PAGINA_POR_DEFECTO,
  });

  protected readonly columnas: ColumnaTabla<AuditoriaAccion>[] = [
    { encabezado: 'Fecha', valor: (a) => new Date(a.fecha).toLocaleString('es-PE') },
    { encabezado: 'Usuario', valor: (a) => this.nombreUsuario(a.usuarioId) },
    { encabezado: 'Accion', valor: (a) => formatoEtiquetaEnum(a.accion) },
    { encabezado: 'Entidad', valor: (a) => formatoEtiquetaEnum(a.entidadAfectada) + (a.entidadId ? ` #${a.entidadId}` : '') },
    { encabezado: 'IP', valor: (a) => a.ipOrigen ?? 'No disponible' },
    { encabezado: 'Resultado', valor: (a) => formatoEtiquetaEnum(a.resultado) },
  ];

  constructor() {
    this.cargar(0);
    this.usuarioService.listar(0, 100).subscribe((pagina) => {
      this.nombresUsuarios.set(new Map(pagina.content.map((u) => [u.id, u.nombres])));
    });
  }

  protected cargar(page: number): void {
    this.cargando.set(true);
    this.auditoriaService.buscar({ entidadAfectada: this.filtroEntidad.value || undefined, page }).subscribe({
      next: (respuesta) => {
        this.pagina.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar el log de auditoria');
        this.cargando.set(false);
      },
    });
  }

  private nombreUsuario(usuarioId: number | null): string {
    if (!usuarioId) {
      return 'Sistema';
    }
    return this.nombresUsuarios().get(usuarioId) ?? `Usuario #${usuarioId}`;
  }

  protected limpiarFiltro(): void {
    this.filtroEntidad.setValue('');
    this.cargar(0);
  }
}
