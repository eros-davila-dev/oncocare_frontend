import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../dashboard.service';
import { EstudioService } from '../../estudio/estudio.service';
import { IndicadoresDashboard } from '../../../core/models/dashboard.model';
import { ResumenRecoleccion } from '../../../core/models/estudio.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { AuthService } from '../../../core/services/auth.service';
import { CardComponent } from '../../../shared/ui/card/card';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { IndicadorCardComponent } from '../../estudio/componentes/indicador-card/indicador-card';
import { INDICADORES_TESIS, fechaCorta } from '../../estudio/indicadores.util';

const PERIODOS = [
  { dias: 7, etiqueta: '7 días' },
  { dias: 30, etiqueta: '30 días' },
  { dias: 90, etiqueta: '90 días' },
] as const;

/**
 * Panel de gestion diaria: los tres indicadores de la tesis sobre todo el
 * sistema en el periodo elegido y, para el investigador, la recoleccion del
 * postest por sesion (tesis v8: lunes, miercoles y viernes).
 */
@Component({
  selector: 'app-dashboard-indicadores',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CardComponent,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    IndicadorCardComponent,
  ],
  templateUrl: './dashboard-indicadores.html',
})
export class DashboardIndicadoresComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly estudioService = inject(EstudioService);
  protected readonly authService = inject(AuthService);

  protected readonly definiciones = INDICADORES_TESIS;
  protected readonly periodos = PERIODOS;
  protected readonly fechaCorta = fechaCorta;

  protected readonly diasPeriodo = signal<number>(30);
  protected readonly cargando = signal(true);
  protected readonly resumen = signal<IndicadoresDashboard | null>(null);
  protected readonly recoleccion = signal<ResumenRecoleccion | null>(null);
  protected readonly motivoSinRecoleccion = signal<string | null>(null);
  protected readonly puedeVerEstudio = this.authService.tieneAlgunRol('ADMIN', 'INVESTIGADOR');

  constructor() {
    this.cargarResumen();
    if (this.puedeVerEstudio) {
      this.cargarRecoleccion();
    }
  }

  protected celda(v: number | null | undefined): string {
    return v == null ? '—' : v.toFixed(2);
  }

  protected sesionesConDatos(r: ResumenRecoleccion): number {
    return r.sesiones.filter((s) => s.registros > 0 || s.citasElegibles > 0 || s.consultas > 0).length;
  }

  protected cambiarPeriodo(dias: number): void {
    this.diasPeriodo.set(dias);
    this.cargarResumen();
  }

  private cargarResumen(): void {
    this.cargando.set(true);
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(hasta.getDate() - this.diasPeriodo());
    this.dashboardService.indicadores(this.isoLocal(desde), this.isoLocal(hasta)).subscribe({
      next: (resumen) => {
        this.resumen.set(resumen);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  private cargarRecoleccion(): void {
    this.estudioService.recoleccion('POSTEST').subscribe({
      next: (r) => this.recoleccion.set(r),
      error: (error: HttpErrorResponse) => {
        const cuerpo = error.error as ErrorResponse | undefined;
        this.motivoSinRecoleccion.set(cuerpo?.message ?? 'La recolección del postest no está disponible.');
      },
    });
  }

  /** Fecha AAAA-MM-DD en hora local (toISOString usaria UTC y podria saltar un dia). */
  private isoLocal(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
