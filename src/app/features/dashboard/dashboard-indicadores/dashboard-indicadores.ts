import { Component, inject, signal } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexPlotOptions,
  ApexXAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { DashboardService } from '../dashboard.service';
import { Indicadores } from '../../../core/models/dashboard.model';
import { CardComponent } from '../../../shared/ui/card/card';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { StatCardComponent } from '../../../shared/components/stat-card/stat-card';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';

@Component({
  selector: 'app-dashboard-indicadores',
  imports: [NgApexchartsModule, CardComponent, IconComponent, StatCardComponent, PageHeaderComponent, LoadingSpinnerComponent],
  templateUrl: './dashboard-indicadores.html',
})
export class DashboardIndicadoresComponent {
  private readonly dashboardService = inject(DashboardService);

  protected readonly cargando = signal(true);
  protected readonly indicadores = signal<Indicadores | null>(null);

  protected readonly chartSeries = signal<ApexAxisChartSeries>([]);
  protected readonly chartOptions: {
    chart: ApexChart;
    xaxis: ApexXAxis;
    plotOptions: ApexPlotOptions;
    dataLabels: ApexDataLabels;
    colors: string[];
  } = {
    chart: { type: 'bar', height: 280, toolbar: { show: false } },
    xaxis: { categories: ['Tasa de ausentismo', 'Cumplimiento de tratamiento'] },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '45%' } },
    dataLabels: { enabled: true, formatter: (valor) => `${Number(valor).toFixed(0)}%` },
    colors: ['#2f6fed'],
  };

  constructor() {
    this.dashboardService.indicadores().subscribe((indicadores) => {
      this.indicadores.set(indicadores);
      this.chartSeries.set([
        {
          name: 'Porcentaje',
          data: [
            Number(indicadores.tasaAusentismoPorcentaje.toFixed(1)),
            Number(indicadores.cumplimientoTratamientoPorcentaje.toFixed(1)),
          ],
        },
      ]);
      this.cargando.set(false);
    });
  }
}
