import { Component, effect, inject, input, output, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { VinculoTelegramComponent } from '../../telegram/vinculo-telegram/vinculo-telegram';
import { DatePipe } from '@angular/common';
import { Paciente } from '../../../core/models/paciente.model';
import { Cita } from '../../../core/models/cita.model';
import { CicloTratamiento } from '../../../core/models/tratamiento.model';
import { CitaService } from '../../citas/cita.service';
import { TratamientoService } from '../../tratamientos/tratamiento.service';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { TabsComponent } from '../../../shared/ui/tabs/tabs';
import { BadgeComponent } from '../../../shared/ui/badge/badge';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar';
import { EstadoColorPipe } from '../../../shared/pipes/estado-color.pipe';
import { EtiquetaEnumPipe } from '../../../shared/pipes/etiqueta-enum.pipe';

const TABS = ['Informacion', 'Datos clinicos', 'Contacto', 'Historial'] as const;
type Tab = (typeof TABS)[number];

/**
 * Vista de detalle de paciente (no existia antes de este rediseno). La
 * pestana "Historial" reutiliza CitaService/TratamientoService, que ya
 * existian para las pantallas de listado: no requirio ningun endpoint nuevo.
 */
@Component({
  selector: 'app-paciente-detalle',
  imports: [
    ModalComponent,
    TabsComponent,
    BadgeComponent,
    AvatarComponent,
    EstadoColorPipe,
    EtiquetaEnumPipe,
    DatePipe,
    VinculoTelegramComponent,
  ],
  templateUrl: './paciente-detalle.html',
})
export class PacienteDetalleComponent {
  private readonly citaService = inject(CitaService);
  private readonly tratamientoService = inject(TratamientoService);

  protected readonly authService = inject(AuthService);

  paciente = input<Paciente | null>(null);
  abierto = input(false);
  cerrar = output<void>();

  protected readonly tabs = TABS;
  protected readonly tabActiva = signal<Tab>('Informacion');

  protected readonly cargandoHistorial = signal(false);
  protected readonly citas = signal<Cita[]>([]);
  protected readonly tratamientos = signal<CicloTratamiento[]>([]);
  private historialCargadoPara: number | null = null;

  constructor() {
    effect(() => {
      if (this.tabActiva() === 'Historial' && this.abierto()) {
        this.cargarHistorialSiHaceFalta();
      }
    });
  }

  protected alCerrar(): void {
    this.tabActiva.set('Informacion');
    this.cerrar.emit();
  }

  private cargarHistorialSiHaceFalta(): void {
    const paciente = this.paciente();
    if (!paciente || this.historialCargadoPara === paciente.id) {
      return;
    }
    this.historialCargadoPara = paciente.id;
    this.cargandoHistorial.set(true);

    this.citaService.listar({ pacienteId: paciente.id, size: 5 }).subscribe((respuesta) => this.citas.set(respuesta.content));
    this.tratamientoService.porPaciente(paciente.id).subscribe({
      next: (respuesta) => {
        this.tratamientos.set(respuesta);
        this.cargandoHistorial.set(false);
      },
      error: () => this.cargandoHistorial.set(false),
    });
  }
}
