import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DispositivoService } from '../dispositivo.service';
import { Dispositivo, ProtocoloDispositivo, TipoDispositivo } from '../../../core/models/dispositivo.model';
import { ColumnaTabla, DataTableComponent } from '../../../shared/components/data-table/data-table';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { InputComponent } from '../../../shared/ui/input/input';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { formatoEtiquetaEnum } from '../../../shared/pipes/etiqueta-enum.pipe';

const OPCIONES_TIPO: OpcionSelect[] = [
  { value: 'MONITOR_SIGNOS_VITALES', label: 'Monitor de signos vitales' },
  { value: 'BASCULA', label: 'Bascula' },
  { value: 'BOMBA_INFUSION', label: 'Bomba de infusion' },
];

const ETIQUETA_TIPO_DISPOSITIVO: Record<string, string> = Object.fromEntries(
  OPCIONES_TIPO.map((opcion) => [opcion.value, opcion.label]),
);

const OPCIONES_PROTOCOLO: OpcionSelect[] = [
  { value: 'MQTT', label: 'MQTT' },
  { value: 'REST', label: 'REST' },
  { value: 'SERIAL', label: 'Puente serial' },
];

/**
 * Administracion de dispositivos externos (seccion 14): monitores de signos
 * vitales, basculas, bombas de infusion. Registrar un dispositivo aqui genera
 * su credencial propia, que el equipo usa para autenticarse contra
 * DeviceWebhookController o el adaptador MQTT, nunca con el JWT de un usuario.
 */
@Component({
  selector: 'app-dispositivos-list',
  imports: [ReactiveFormsModule, DataTableComponent, PageHeaderComponent, ModalComponent, InputComponent, SelectComponent, ButtonComponent],
  templateUrl: './dispositivos-list.html',
})
export class DispositivosListComponent {
  private readonly dispositivoService = inject(DispositivoService);
  private readonly toastService = inject(ToastService);

  protected readonly opcionesTipo = OPCIONES_TIPO;
  protected readonly opcionesProtocolo = OPCIONES_PROTOCOLO;
  protected readonly cargando = signal(false);
  protected readonly modalAbierto = signal(false);
  protected readonly enviando = signal(false);
  protected readonly credencialGenerada = signal<string | null>(null);
  protected readonly dispositivos = signal<Dispositivo[]>([]);

  protected readonly columnas: ColumnaTabla<Dispositivo>[] = [
    { encabezado: 'Nombre', valor: (d) => d.nombre },
    { encabezado: 'Tipo', valor: (d) => ETIQUETA_TIPO_DISPOSITIVO[d.tipo] ?? formatoEtiquetaEnum(d.tipo) },
    { encabezado: 'Protocolo', valor: (d) => d.protocolo },
    { encabezado: 'Estado de conexion', valor: (d) => formatoEtiquetaEnum(d.estadoConexion) },
  ];

  protected readonly form = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    tipo: new FormControl<TipoDispositivo>('MONITOR_SIGNOS_VITALES', { nonNullable: true, validators: [Validators.required] }),
    protocolo: new FormControl<ProtocoloDispositivo>('REST', { nonNullable: true, validators: [Validators.required] }),
    credencial: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(16)],
    }),
  });

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.dispositivoService.listar().subscribe({
      next: (respuesta) => {
        this.dispositivos.set(respuesta);
        this.cargando.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo cargar el listado de dispositivos');
        this.cargando.set(false);
      },
    });
  }

  protected generarCredencial(): void {
    const credencial = crypto.randomUUID().replaceAll('-', '');
    this.form.controls.credencial.setValue(credencial);
  }

  protected abrirModal(): void {
    this.credencialGenerada.set(null);
    this.form.reset({ tipo: 'MONITOR_SIGNOS_VITALES', protocolo: 'REST' });
    this.modalAbierto.set(true);
  }

  protected registrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    const credencial = this.form.getRawValue().credencial;

    this.dispositivoService.registrar(this.form.getRawValue()).subscribe({
      next: () => {
        this.toastService.exito('Dispositivo registrado correctamente');
        this.enviando.set(false);
        this.credencialGenerada.set(credencial);
        this.cargar();
      },
      error: () => {
        this.enviando.set(false);
        this.toastService.error('No se pudo registrar el dispositivo');
      },
    });
  }
}
