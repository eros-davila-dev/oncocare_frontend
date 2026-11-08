import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { DashboardService } from '../../dashboard/dashboard.service';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { IconComponent } from '../../../shared/ui/icon/icon';
import type { NombreIcono } from '../../../shared/ui/icon/icon-data';

interface SeccionEstudio {
  ruta: string;
  etiqueta: string;
  icono: NombreIcono;
  /** Para que sirve, en una linea (se muestra bajo las pestanas). */
  ayuda: string;
}

// En el orden en que se explica la tesis: resultado, de donde sale cada valor,
// como se organizo la recoleccion y los datos crudos.
const SECCIONES: SeccionEstudio[] = [
  {
    ruta: 'resumen',
    etiqueta: '1. Resultados',
    icono: 'chart-column',
    ayuda: 'Pretest vs postest: los estadísticos de cada indicador que se reportan en la tesis.',
  },
  {
    ruta: 'recoleccion',
    etiqueta: '2. Recolección por sesión',
    icono: 'calendar-days',
    ayuda: 'El valor de cada una de las 13 sesiones por etapa y las fichas con cada paciente.',
  },
  {
    ruta: 'muestra',
    etiqueta: '3. Fases y sesiones',
    icono: 'users',
    ayuda: 'Fechas de cada etapa y archivos del instrumento cargados al sistema.',
  },
  {
    ruta: 'fichas',
    etiqueta: '4. Fichas de recolección',
    icono: 'file-spreadsheet',
    ayuda: 'Captura manual de las fichas del Anexo 2.',
  },
  {
    ruta: 'datos',
    etiqueta: '5. Datos de esta instalación',
    icono: 'search',
    ayuda: 'Mediciones hechas en esta instalación (incluye pruebas); no son los datos de la tesis.',
  },
];

/**
 * Modulo del estudio (solo INVESTIGADOR y ADMIN; el resto del personal no lo
 * ve): recoleccion por sesion, resultados por etapa como grupos
 * independientes, fases y sesiones, fichas del Anexo 2 y revision de datos.
 */
@Component({
  selector: 'app-estudio-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PageHeaderComponent, IconComponent],
  template: `
    <ui-page-header
      eyebrow="Investigación"
      titulo="Estudio de la tesis"
      descripcion="Tiempo de registro (TPR), tasa de ausentismo (TA) y nivel de consultas atendidas (NCA): 13 sesiones de pretest (agosto, proceso manual) y 13 de postest (setiembre, con el sistema), los lunes, miércoles y viernes."
    />
    @if (pacientesDemo() > 0) {
      <div class="mt-4 flex items-start gap-3 rounded-xl border border-info/30 bg-info-soft p-4 text-sm" role="status">
        <ui-icon name="info" [size]="20" clase="mt-0.5 shrink-0 text-primary" />
        <p>
          <strong>Datos de demostración</strong>: {{ pacientesDemo() }} pacientes ficticios (documento DEMO-NNN) con citas y tratamientos desde octubre, para mostrar el sistema funcionando. No son pacientes de la fundación ni forman parte de los resultados de la tesis, que salen de los datos del estudio (agosto y setiembre). Se quitan con <code class="rounded bg-background/70 px-1">docker/demo/quitar-datos-demo.sql</code>.
        </p>
      </div>
    }
    <nav class="mt-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="Secciones del estudio">
      @for (seccion of secciones; track seccion.ruta) {
        <a
          [routerLink]="seccion.ruta"
          routerLinkActive="border-primary text-primary"
          [routerLinkActiveOptions]="{ exact: false }"
          class="flex min-h-12 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ui-icon [name]="seccion.icono" [size]="16" />
          {{ seccion.etiqueta }}
        </a>
      }
    </nav>
    @if (ayuda()) {
      <p class="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <ui-icon name="info" [size]="16" clase="shrink-0 text-primary" /> {{ ayuda() }}
      </p>
    }
    <div class="mt-6">
      <router-outlet />
    </div>
  `,
})
export class EstudioLayoutComponent {
  protected readonly secciones = SECCIONES;
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  /** Para que sirve la pestana abierta. */
  protected readonly ayuda = computed(() => SECCIONES.find((s) => this.url().includes(`/estudio/${s.ruta}`))?.ayuda ?? null);
  /** Datos de demostracion activos: contaminarian la recoleccion si se configuran fases en esas fechas. */
  protected readonly pacientesDemo = signal(0);

  constructor() {
    inject(DashboardService).datosDemo().subscribe({ next: (r) => this.pacientesDemo.set(r.pacientes), error: () => this.pacientesDemo.set(0) });
  }
}
