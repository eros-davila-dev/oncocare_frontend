import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CitaService } from '../../citas/cita.service';
import { CitaAgenda, EstadoCita, LlamadaPendiente } from '../../../core/models/cita.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { AuthService } from '../../../core/services/auth.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { BadgeComponent, type ColorBadge } from '../../../shared/ui/badge/badge';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { InputComponent } from '../../../shared/ui/input/input';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';

const ETIQUETA_ESTADO: Record<EstadoCita, string> = {
  PROGRAMADA: 'Programada',
  CONFIRMADA: 'Confirmada',
  ATENDIDA: 'Atendida',
  NO_ASISTIO: 'No asistió',
  CANCELADA: 'Cancelada',
};

const COLOR_ESTADO: Record<EstadoCita, ColorBadge> = {
  PROGRAMADA: 'info',
  CONFIRMADA: 'brand',
  ATENDIDA: 'success',
  NO_ASISTIO: 'danger',
  CANCELADA: 'neutral',
};

/**
 * Agenda del dia para recepcion. Aqui se registra si el paciente llego o no:
 * es la fuente del indicador TNS (ausentismo), por eso las acciones son
 * grandes, estan a un clic y las citas olvidadas de dias anteriores se
 * muestran primero para cerrarlas antes de que lo haga el sistema.
 */
@Component({
  selector: 'app-agenda-dia',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    ButtonComponent,
    BadgeComponent,
    IconComponent,
    ModalComponent,
    InputComponent,
    SelectComponent,
  ],
  templateUrl: './agenda-dia.html',
})
export class AgendaDiaComponent {
  private readonly citaService = inject(CitaService);
  private readonly toast = inject(ToastService);
  protected readonly authService = inject(AuthService);

  protected readonly etiquetaEstado = ETIQUETA_ESTADO;
  protected readonly colorEstado = COLOR_ESTADO;

  protected readonly hoy = this.isoLocal(new Date());
  protected readonly fecha = signal(this.hoy);
  protected readonly cargando = signal(true);
  protected readonly agenda = signal<CitaAgenda[]>([]);
  protected readonly pendientes = signal<CitaAgenda[]>([]);
  protected readonly procesando = signal<number | null>(null);
  protected readonly llamadas = signal<LlamadaPendiente[]>([]);

  protected readonly resumen = computed(() => {
    const citas = this.agenda().map((a) => a.cita);
    return {
      total: citas.filter((c) => c.estado !== 'CANCELADA').length,
      atendidas: citas.filter((c) => c.estado === 'ATENDIDA').length,
      noAsistio: citas.filter((c) => c.estado === 'NO_ASISTIO').length,
      porRegistrar: citas.filter((c) => c.estado === 'PROGRAMADA' || c.estado === 'CONFIRMADA').length,
    };
  });

  protected readonly fechaLegible = computed(() => {
    const [anio, mes, dia] = this.fecha().split('-').map(Number);
    return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(
      new Date(anio, mes - 1, dia),
    );
  });

  protected readonly citaACorregir = signal<CitaAgenda | null>(null);
  protected readonly opcionesDesenlace: OpcionSelect[] = [
    { value: 'ATENDIDA', label: 'Atendida (sí llegó)' },
    { value: 'NO_ASISTIO', label: 'No asistió' },
  ];
  protected readonly formCorreccion = new FormGroup({
    estado: new FormControl<'ATENDIDA' | 'NO_ASISTIO' | null>(null, { validators: [Validators.required] }),
    motivo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(5)] }),
  });

  constructor() {
    this.cargar();
    this.cargarPendientes();
    this.cargarLlamadas();
  }

  protected registrarLlamada(llamada: LlamadaPendiente, contesto: boolean): void {
    this.citaService.registrarLlamada(llamada.recordatorioId, contesto).subscribe({
      next: () => {
        this.toast.exito(contesto ? `Recordatorio a ${llamada.pacienteNombre} registrado` : 'Se volverá a intentar más tarde');
        this.cargarLlamadas();
      },
      error: (e: HttpErrorResponse) => this.toast.error(this.mensaje(e)),
    });
  }

  private cargarLlamadas(): void {
    if (!this.authService.tieneAlgunRol('ADMIN', 'RECEPCIONISTA')) {
      return;
    }
    this.citaService.llamadasPendientes().subscribe((llamadas) => this.llamadas.set(llamadas));
  }

  protected moverDia(dias: number): void {
    const [anio, mes, dia] = this.fecha().split('-').map(Number);
    this.fecha.set(this.isoLocal(new Date(anio, mes - 1, dia + dias)));
    this.cargar();
  }

  protected irAHoy(): void {
    this.fecha.set(this.hoy);
    this.cargar();
  }

  protected sinDesenlace(item: CitaAgenda): boolean {
    return item.cita.estado === 'PROGRAMADA' || item.cita.estado === 'CONFIRMADA';
  }

  /** El desenlace describe algo ya ocurrido: no se registra antes del dia de la cita. */
  protected puedeRegistrar(item: CitaAgenda): boolean {
    return this.sinDesenlace(item) && item.cita.fecha <= this.hoy;
  }

  protected puedeCorregir(item: CitaAgenda): boolean {
    return (
      (item.cita.estado === 'ATENDIDA' || item.cita.estado === 'NO_ASISTIO') &&
      this.authService.tieneAlgunRol('ADMIN', 'RECEPCIONISTA')
    );
  }

  protected registrarLlegada(item: CitaAgenda): void {
    this.registrar(item, this.citaService.marcarAtendida(item.cita.id), `${item.pacienteNombre}: atendida`);
  }

  protected registrarInasistencia(item: CitaAgenda): void {
    this.registrar(item, this.citaService.marcarNoAsistio(item.cita.id), `${item.pacienteNombre}: no asistió`);
  }

  protected abrirCorreccion(item: CitaAgenda): void {
    this.formCorreccion.reset({
      estado: item.cita.estado === 'ATENDIDA' ? 'NO_ASISTIO' : 'ATENDIDA',
      motivo: '',
    });
    this.citaACorregir.set(item);
  }

  protected corregir(): void {
    const item = this.citaACorregir();
    if (!item || this.formCorreccion.invalid) {
      this.formCorreccion.markAllAsTouched();
      return;
    }
    const { estado, motivo } = this.formCorreccion.getRawValue();
    this.citaService.corregirDesenlace(item.cita.id, estado!, motivo).subscribe({
      next: () => {
        this.citaACorregir.set(null);
        this.toast.exito('Desenlace corregido. Queda registrado el motivo.');
        this.cargar();
      },
      error: (e: HttpErrorResponse) => this.toast.error(this.mensaje(e)),
    });
  }

  private registrar(item: CitaAgenda, peticion: ReturnType<CitaService['marcarAtendida']>, exito: string): void {
    this.procesando.set(item.cita.id);
    peticion.subscribe({
      next: () => {
        this.procesando.set(null);
        this.toast.exito(exito);
        this.cargar();
        this.cargarPendientes();
      },
      error: (e: HttpErrorResponse) => {
        this.procesando.set(null);
        this.toast.error(this.mensaje(e));
      },
    });
  }

  private cargar(): void {
    this.cargando.set(true);
    this.citaService.agenda(this.fecha()).subscribe({
      next: (agenda) => {
        this.agenda.set(agenda);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.toast.error(this.mensaje(e));
      },
    });
  }

  private cargarPendientes(): void {
    this.citaService.pendientesDeCierre().subscribe((pendientes) => this.pendientes.set(pendientes));
  }

  private mensaje(error: HttpErrorResponse): string {
    return (error.error as ErrorResponse | undefined)?.message ?? 'No se pudo completar la operación';
  }

  private isoLocal(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
