import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { IconComponent } from '../../../shared/ui/icon/icon';
import type { NombreIcono } from '../../../shared/ui/icon/icon-data';

interface SeccionEstudio {
  ruta: string;
  etiqueta: string;
  icono: NombreIcono;
}

const SECCIONES: SeccionEstudio[] = [
  { ruta: 'recoleccion', etiqueta: 'Recolección por sesión', icono: 'calendar-days' },
  { ruta: 'resumen', etiqueta: 'Resultados', icono: 'chart-column' },
  { ruta: 'muestra', etiqueta: 'Fases y sesiones', icono: 'users' },
  { ruta: 'fichas', etiqueta: 'Fichas de recolección', icono: 'file-spreadsheet' },
  { ruta: 'datos', etiqueta: 'Revisión de datos', icono: 'search' },
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
      titulo="Recolección del estudio"
      descripcion="TPR, tasa de ausentismo (TA) y NCA por sesión: 13 sesiones de pretest y 13 de postest (lunes, miércoles y viernes)."
    />
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
    <div class="mt-6">
      <router-outlet />
    </div>
  `,
})
export class EstudioLayoutComponent {
  protected readonly secciones = SECCIONES;
}
