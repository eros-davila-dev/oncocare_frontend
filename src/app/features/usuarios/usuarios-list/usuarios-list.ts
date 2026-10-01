import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '../usuario.service';
import { Especialidad, Rol, UsuarioResumen } from '../../../core/models/usuario.model';
import { Pagina } from '../../../core/models/pagina.model';
import { ColumnaTabla, DataTableComponent } from '../../../shared/components/data-table/data-table';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { InputComponent } from '../../../shared/ui/input/input';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { formatoEtiquetaEnum } from '../../../shared/pipes/etiqueta-enum.pipe';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../../shared/constants/paginacion';

const OPCIONES_ROL: OpcionSelect[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MEDICO', label: 'Medico' },
  { value: 'RECEPCIONISTA', label: 'Recepcionista' },
];

const OPCIONES_ESPECIALIDAD: OpcionSelect[] = [
  { value: 'ONCOLOGIA_CLINICA', label: 'Oncologia clinica' },
  { value: 'ONCOLOGIA_QUIRURGICA', label: 'Oncologia quirurgica' },
  { value: 'RADIOTERAPIA', label: 'Radioterapia' },
  { value: 'CUIDADOS_PALIATIVOS', label: 'Cuidados paliativos' },
];

@Component({
  selector: 'app-usuarios-list',
  imports: [ReactiveFormsModule, DataTableComponent, PageHeaderComponent, ModalComponent, InputComponent, SelectComponent, ButtonComponent],
  templateUrl: './usuarios-list.html',
})
export class UsuariosListComponent {
  private readonly usuarioService = inject(UsuarioService);
  private readonly toastService = inject(ToastService);

  protected readonly opcionesRol = OPCIONES_ROL;
  protected readonly opcionesEspecialidad = OPCIONES_ESPECIALIDAD;
  protected readonly cargando = signal(false);
  protected readonly modalAbierto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly pagina = signal<Pagina<UsuarioResumen>>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    pageNumber: 0,
    pageSize: TAMANO_PAGINA_POR_DEFECTO,
  });

  protected readonly columnas: ColumnaTabla<UsuarioResumen>[] = [
    { encabezado: 'Nombres', valor: (u) => u.nombres },
    { encabezado: 'Correo', valor: (u) => u.email },
    { encabezado: 'Rol', valor: (u) => formatoEtiquetaEnum(u.rol) },
    { encabezado: 'Especialidad', valor: (u) => (u.especialidad ? formatoEtiquetaEnum(u.especialidad) : 'No aplica') },
  ];

  protected readonly form = new FormGroup({
    nombres: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
    rol: new FormControl<Rol>('RECEPCIONISTA', { nonNullable: true, validators: [Validators.required] }),
    especialidad: new FormControl<Especialidad | null>(null),
  });

  constructor() {
    this.cargar(0);
  }

  protected cargar(page: number): void {
    this.cargando.set(true);
    this.usuarioService.listar(page).subscribe({
      next: (respuesta) => {
        this.pagina.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar el listado de usuarios');
        this.cargando.set(false);
      },
    });
  }

  protected crear(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.usuarioService.crear(this.form.getRawValue()).subscribe({
      next: () => {
        this.toastService.exito('Usuario creado correctamente');
        this.enviando.set(false);
        this.modalAbierto.set(false);
        this.form.reset({ rol: 'RECEPCIONISTA' });
        this.cargar(0);
      },
      error: () => {
        this.enviando.set(false);
        this.toastService.error('No se pudo crear el usuario');
      },
    });
  }
}
