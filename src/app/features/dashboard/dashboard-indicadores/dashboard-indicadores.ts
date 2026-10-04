import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { DashboardService } from '../dashboard.service';
import { ActividadDetalle, ActividadResumen } from '../../../core/models/dashboard.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { CardComponent } from '../../../shared/ui/card/card';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { TabsComponent } from '../../../shared/ui/tabs/tabs';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { formatoEtiquetaEnum } from '../../../shared/pipes/etiqueta-enum.pipe';
import { descargarBlob, fechaCorta } from '../../estudio/indicadores.util';

const PERIODOS = [
  { dias: 0, etiqueta: 'Hoy' },
  { dias: 7, etiqueta: '7 días' },
  { dias: 30, etiqueta: '30 días' },
  { dias: 90, etiqueta: '90 días' },
] as const;

const PESTANAS = ['Registros', 'Citas', 'Recordatorios', 'Consultas'] as const;
type Pestana = (typeof PESTANAS)[number];

const CANALES_RECORDATORIO: Record<string, string> = {
  TELEGRAM: 'Telegram (paciente)',
  TELEGRAM_REFERIDO: 'Telegram (acompañante)',
  LLAMADA: 'Llamada',
  CORREO: 'Correo',
};

const ESTADOS_CITA: Record<string, string> = {
  PROGRAMADA: 'Programada',
  CONFIRMADA: 'Confirmada',
  ATENDIDA: 'Asistió',
  NO_ASISTIO: 'No asistió',
  CANCELADA: 'Cancelada',
};

/**
 * Panel del personal: todo lo que se hizo en el periodo elegido. Tiempo de
 * registro de pacientes, citas y ausentismo, recordatorios enviados y
 * consultas atendidas por el asistente, con una fila por día y el detalle
 * fila por fila (con nombres) para quien atiende a los pacientes.
 */
@Component({
  selector: 'app-dashboard-indicadores',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, TabsComponent, PageHeaderComponent, LoadingSpinnerComponent],
  templateUrl: './dashboard-indicadores.html',
})
export class DashboardIndicadoresComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);

  protected readonly periodos = PERIODOS;
  protected readonly pestanas = PESTANAS;
  protected readonly fechaCorta = fechaCorta;
  protected readonly etiqueta = formatoEtiquetaEnum;

  /** El detalle lleva nombres de pacientes: no lo ve el investigador. */
  protected readonly puedeVerDetalle = this.authService.tieneAlgunRol('ADMIN', 'MEDICO', 'RECEPCIONISTA');
  protected readonly puedeDescargar = this.authService.tieneAlgunRol('ADMIN', 'RECEPCIONISTA');

  protected readonly diasPeriodo = signal<number | null>(30);
  protected readonly desdeControl = new FormControl(this.isoLocal(this.haceDias(30)), { nonNullable: true });
  protected readonly hastaControl = new FormControl(this.isoLocal(new Date()), { nonNullable: true });

  protected readonly cargando = signal(true);
  protected readonly descargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resumen = signal<ActividadResumen | null>(null);
  protected readonly detalle = signal<ActividadDetalle | null>(null);
  protected readonly pestana = signal<Pestana>('Registros');

  protected readonly canales = computed(() => {
    const r = this.resumen();
    return r ? Object.entries(r.recordatorios.enviadosPorCanal).map(([canal, n]) => `${CANALES_RECORDATORIO[canal] ?? canal}: ${n}`) : [];
  });

  protected readonly categorias = computed(() => {
    const r = this.resumen();
    return r
      ? Object.entries(r.consultas.porCategoria)
          .sort((a, b) => b[1] - a[1])
          .map(([categoria, n]) => ({ categoria: formatoEtiquetaEnum(categoria), n }))
      : [];
  });

  protected readonly pendientes = computed(() => {
    const r = this.resumen();
    if (!r) return [];
    const avisos: string[] = [];
    if (r.citas.sinDesenlace) avisos.push(`${r.citas.sinDesenlace} citas pasadas sin marcar si el paciente asistió`);
    if (r.consultas.abiertas) avisos.push(`${r.consultas.abiertas} consultas abiertas`);
    if (r.registros.porRevisar) avisos.push(`${r.registros.porRevisar} registros con un tiempo fuera de lo normal`);
    if (r.recordatorios.fallidos) avisos.push(`${r.recordatorios.fallidos} recordatorios que no se pudieron enviar`);
    return avisos;
  });

  constructor() {
    this.cargar();
  }

  protected cambiarPeriodo(dias: number): void {
    this.diasPeriodo.set(dias);
    this.desdeControl.setValue(this.isoLocal(this.haceDias(dias)));
    this.hastaControl.setValue(this.isoLocal(new Date()));
    this.cargar();
  }

  protected aplicarRango(): void {
    const desde = this.desdeControl.value;
    const hasta = this.hastaControl.value;
    if (!desde || !hasta || hasta < desde) {
      this.toastService.error('Revise las fechas: la fecha final no puede ser anterior a la inicial.');
      return;
    }
    this.diasPeriodo.set(null);
    this.cargar();
  }

  protected descargar(): void {
    this.descargando.set(true);
    const desde = this.desdeControl.value;
    const hasta = this.hastaControl.value;
    this.dashboardService.exportarActividad(desde, hasta).subscribe({
      next: (blob) => {
        descargarBlob(blob, `actividad-${desde}-a-${hasta}.xlsx`);
        this.descargando.set(false);
      },
      error: () => {
        this.toastService.error('No se pudo generar el Excel.');
        this.descargando.set(false);
      },
    });
  }

  protected numero(v: number | null | undefined, decimales = 1): string {
    return v == null ? '—' : v.toFixed(decimales);
  }

  protected estadoCita(estado: string): string {
    return ESTADOS_CITA[estado] ?? formatoEtiquetaEnum(estado);
  }

  protected canalRecordatorio(canal: string): string {
    return CANALES_RECORDATORIO[canal] ?? formatoEtiquetaEnum(canal);
  }

  protected resultadoConsulta(k: ActividadDetalle['consultas'][number]): string {
    if (!k.resultado) return 'Abierta';
    if (k.derivada || k.resultado === 'ESCALADA') return 'Derivada al personal';
    if (k.resultado === 'RESUELTA_BOT') return k.reabierta ? 'Resuelta (se reabrió)' : 'Resuelta por el asistente';
    return 'Resuelta por el personal';
  }

  /** "2026-10-03T21:10:00" -> "03/10/2026 21:10". */
  protected fechaHora(iso: string | null): string {
    if (!iso) return '—';
    const [fecha, hora] = iso.split('T');
    return `${fechaCorta(fecha)} ${hora.slice(0, 5)}`;
  }

  private cargar(): void {
    const desde = this.desdeControl.value;
    const hasta = this.hastaControl.value;
    this.cargando.set(true);
    this.error.set(null);
    this.dashboardService.actividad(desde, hasta).subscribe({
      next: (r) => {
        this.resumen.set(r);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la actividad del periodo.');
        this.cargando.set(false);
      },
    });
    if (this.puedeVerDetalle) {
      this.dashboardService.actividadDetalle(desde, hasta).subscribe({
        next: (d) => this.detalle.set(d),
        error: () => this.detalle.set(null),
      });
    }
  }

  private haceDias(dias: number): Date {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return fecha;
  }

  /** Fecha AAAA-MM-DD en hora local (toISOString usaria UTC y podria saltar un dia). */
  private isoLocal(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
