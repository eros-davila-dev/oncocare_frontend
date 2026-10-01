import { Component, computed, input } from '@angular/core';
import { Cita } from '../../../core/models/cita.model';
import { BadgeComponent } from '../../ui/badge/badge';
import { EstadoColorPipe } from '../../pipes/estado-color.pipe';
import { EtiquetaEnumPipe } from '../../pipes/etiqueta-enum.pipe';

interface GrupoPorFecha {
  fecha: string;
  citas: Cita[];
}

/**
 * Calendario de citas por medico y rango de fechas (RF-05): una vista en
 * lista agrupada por dia, suficiente para el alcance administrativo del
 * sistema sin incorporar una libreria de calendario completa no contemplada
 * en el stack (seccion 4).
 */
@Component({
  selector: 'ui-appointment-calendar',
  imports: [BadgeComponent, EstadoColorPipe, EtiquetaEnumPipe],
  template: `
    <div class="space-y-4">
      @for (grupo of gruposPorFecha(); track grupo.fecha) {
        <div class="rounded-xl border border-border bg-card p-4">
          <p class="mb-2 text-sm font-semibold">{{ grupo.fecha }}</p>
          <ul class="divide-y divide-border">
            @for (cita of grupo.citas; track cita.id) {
              <li class="flex items-center justify-between py-2 text-sm">
                <span class="text-muted-foreground">{{ cita.hora }} &middot; {{ cita.tipoConsulta }}</span>
                <ui-badge [color]="cita.estado | estadoColor">{{ cita.estado | etiquetaEnum }}</ui-badge>
              </li>
            }
          </ul>
        </div>
      } @empty {
        <p class="text-sm text-muted-foreground">No hay citas en el rango seleccionado.</p>
      }
    </div>
  `,
})
export class AppointmentCalendarComponent {
  citas = input.required<Cita[]>();

  gruposPorFecha = computed<GrupoPorFecha[]>(() => {
    const mapa = new Map<string, Cita[]>();
    for (const cita of this.citas()) {
      const grupo = mapa.get(cita.fecha) ?? [];
      grupo.push(cita);
      mapa.set(cita.fecha, grupo);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, citas]) => ({ fecha, citas: citas.sort((a, b) => a.hora.localeCompare(b.hora)) }));
  });
}
