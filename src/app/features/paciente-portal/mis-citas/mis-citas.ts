import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CitaService } from '../../citas/cita.service';
import { Cita, EstadoCita } from '../../../core/models/cita.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { Pagina } from '../../../core/models/pagina.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { InputComponent } from '../../../shared/ui/input/input';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { BadgeComponent } from '../../../shared/ui/badge/badge';
import { TabsComponent } from '../../../shared/ui/tabs/tabs';
import { EstadoColorPipe } from '../../../shared/pipes/estado-color.pipe';
import { EtiquetaEnumPipe } from '../../../shared/pipes/etiqueta-enum.pipe';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../../shared/constants/paginacion';

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

/**
 * Citas del paciente autenticado (seccion 12): consume GET /citas/mias, que
 * el backend ya filtra por el paciente vinculado a la cuenta, nunca por un
 * id arbitrario. Reprogramar/cancelar/confirmar reutilizan los mismos
 * endpoints que usa el staff; el backend valida la propiedad de la cita.
 */
@Component({
  selector: 'app-mis-citas',
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    PaginationComponent,
    ConfirmDialogComponent,
    ModalComponent,
    InputComponent,
    ButtonComponent,
    BadgeComponent,
    TabsComponent,
    EstadoColorPipe,
    EtiquetaEnumPipe,
  ],
  templateUrl: './mis-citas.html',
})
export class MisCitasComponent {
  private readonly citaService = inject(CitaService);
  private readonly toastService = inject(ToastService);

  protected readonly cargando = signal(false);
  protected readonly pagina = signal<Pagina<Cita>>({ content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: TAMANO_PAGINA_POR_DEFECTO });
  protected readonly tabs = TABS;
  protected readonly tabActiva = signal<TabCita>('Todas');

  protected readonly citaAConfirmar = signal<Cita | null>(null);
  protected readonly citaACancelar = signal<Cita | null>(null);
  protected readonly citaAReprogramar = signal<Cita | null>(null);
  protected readonly enviandoAccion = signal(false);

  protected readonly motivoCancelacion = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  protected readonly formReprogramar = new FormGroup({
    fecha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    hora: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  constructor() {
    this.cargar(0);
  }

  protected cargar(page: number): void {
    this.cargando.set(true);
    this.citaService.misCitas({ estado: ESTADO_POR_TAB[this.tabActiva()], page, size: TAMANO_PAGINA_POR_DEFECTO }).subscribe({
      next: (respuesta) => {
        this.pagina.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar tu listado de citas');
        this.cargando.set(false);
      },
    });
  }

  protected cambiarTab(tab: TabCita): void {
    this.tabActiva.set(tab);
    this.cargar(0);
  }

  protected puedeConfirmar(cita: Cita): boolean {
    return cita.estado === 'PROGRAMADA';
  }

  protected puedeReprogramar(cita: Cita): boolean {
    return cita.estado === 'PROGRAMADA' || cita.estado === 'CONFIRMADA';
  }

  protected puedeCancelar(cita: Cita): boolean {
    return cita.estado === 'PROGRAMADA' || cita.estado === 'CONFIRMADA';
  }

  protected confirmarAccion(): void {
    const cita = this.citaAConfirmar();
    if (!cita) {
      return;
    }
    this.citaService.confirmar(cita.id).subscribe({
      next: () => {
        this.toastService.exito('Cita confirmada');
        this.citaAConfirmar.set(null);
        this.cargar(this.pagina().pageNumber);
      },
      error: (error: HttpErrorResponse) => {
        this.citaAConfirmar.set(null);
        this.mostrarError(error, 'No se pudo confirmar la cita');
      },
    });
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
    this.enviandoAccion.set(true);
    this.citaService.cancelar(cita.id, this.motivoCancelacion.value).subscribe({
      next: () => {
        this.toastService.exito('Cita cancelada');
        this.enviandoAccion.set(false);
        this.citaACancelar.set(null);
        this.cargar(this.pagina().pageNumber);
      },
      error: (error: HttpErrorResponse) => {
        this.enviandoAccion.set(false);
        this.citaACancelar.set(null);
        this.mostrarError(error, 'No se pudo cancelar la cita');
      },
    });
  }

  protected abrirReprogramar(cita: Cita): void {
    this.formReprogramar.reset({ fecha: cita.fecha, hora: cita.hora });
    this.citaAReprogramar.set(cita);
  }

  protected confirmarReprogramacion(): void {
    if (this.formReprogramar.invalid) {
      this.formReprogramar.markAllAsTouched();
      return;
    }
    const cita = this.citaAReprogramar();
    if (!cita) {
      return;
    }
    this.enviandoAccion.set(true);
    this.citaService.reprogramar(cita.id, this.formReprogramar.getRawValue()).subscribe({
      next: () => {
        this.toastService.exito('Cita reprogramada');
        this.enviandoAccion.set(false);
        this.citaAReprogramar.set(null);
        this.cargar(this.pagina().pageNumber);
      },
      error: (error: HttpErrorResponse) => {
        this.enviandoAccion.set(false);
        this.citaAReprogramar.set(null);
        this.mostrarError(error, 'No se pudo reprogramar la cita');
      },
    });
  }

  private mostrarError(error: HttpErrorResponse, mensajePorDefecto: string): void {
    const cuerpo = error.error as ErrorResponse | undefined;
    this.toastService.error(cuerpo?.message ?? mensajePorDefecto);
  }
}
