import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { EstudioService } from '../estudio.service';
import { Consulta, Fase, MedicionRegistro } from '../../../core/models/estudio.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { Pagina } from '../../../core/models/pagina.model';
import { ColumnaTabla, DataTableComponent } from '../../../shared/components/data-table/data-table';
import { CellTemplateDirective } from '../../../shared/components/data-table/cell-template.directive';
import { TabsComponent } from '../../../shared/ui/tabs/tabs';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { BadgeComponent, type ColorBadge } from '../../../shared/ui/badge/badge';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { InputComponent } from '../../../shared/ui/input/input';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../../shared/constants/paginacion';

const PESTANAS = ['Mediciones de registro', 'Consultas'] as const;
type Pestana = (typeof PESTANAS)[number];

const PAGINA_VACIA = { content: [], totalElements: 0, totalPages: 0, pageNumber: 0, pageSize: TAMANO_PAGINA_POR_DEFECTO };

const HORA_LIMA = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  dateStyle: 'short',
  timeStyle: 'short',
});

/**
 * Datos crudos que alimentan los indicadores. Lo unico que se puede hacer
 * con un dato es anularlo con un motivo: nunca se edita ni se borra.
 */
@Component({
  selector: 'app-estudio-datos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DataTableComponent,
    CellTemplateDirective,
    TabsComponent,
    ButtonComponent,
    BadgeComponent,
    ModalComponent,
    InputComponent,
  ],
  templateUrl: './estudio-datos.html',
})
export class EstudioDatosComponent {
  private readonly estudioService = inject(EstudioService);
  private readonly toast = inject(ToastService);

  protected readonly pestanas = PESTANAS;
  protected readonly pestana = signal<Pestana>('Mediciones de registro');
  protected readonly fase = signal<Fase | null>(null);
  protected readonly cargando = signal(false);

  protected readonly mediciones = signal<Pagina<MedicionRegistro>>(PAGINA_VACIA);
  protected readonly consultas = signal<Pagina<Consulta>>(PAGINA_VACIA);

  protected readonly aAnular = signal<{ tipo: 'medicion' | 'consulta'; id: number } | null>(null);
  protected readonly motivo = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(5)],
  });

  protected readonly columnasMediciones: ColumnaTabla<MedicionRegistro>[] = [
    { encabezado: 'Inicio', valor: (m) => HORA_LIMA.format(new Date(m.inicio)) },
    { encabezado: 'Tipo', valor: (m) => m.tipo.replace('_', ' ').toLowerCase() },
    { encabezado: 'Canal', valor: (m) => m.canal },
    { encabezado: 'Duración', valor: (m) => (m.duracionSegundos === null ? '—' : this.duracion(m.duracionSegundos)) },
    { encabezado: 'Paciente', valor: (m) => (m.pacienteId ? `#${m.pacienteId}` : '—') },
    { encabezado: 'Estado', valor: (m) => m.estado, clave: 'estadoMedicion' },
  ];

  protected readonly columnasConsultas: ColumnaTabla<Consulta>[] = [
    { encabezado: 'Fecha', valor: (c) => HORA_LIMA.format(new Date(c.abiertaEn)) },
    { encabezado: 'Medio', valor: (c) => c.canal },
    { encabezado: 'Consulta', valor: (c) => c.resumen ?? c.intencion ?? '—' },
    { encabezado: 'Paciente', valor: (c) => (c.pacienteId ? `#${c.pacienteId}` : 'Sin identificar') },
    { encabezado: 'Resultado', valor: (c) => c.resultado ?? 'ABIERTA', clave: 'resultadoConsulta' },
  ];

  constructor() {
    this.cargar(0);
  }

  protected cambiarPestana(pestana: Pestana): void {
    this.pestana.set(pestana);
    this.cargar(0);
  }

  protected cambiarFase(valor: string): void {
    this.fase.set(valor ? (valor as Fase) : null);
    this.cargar(0);
  }

  protected cargar(page: number): void {
    this.cargando.set(true);
    const filtro = { fase: this.fase() ?? undefined, page, size: TAMANO_PAGINA_POR_DEFECTO };
    const alTerminar = { error: (e: HttpErrorResponse) => this.alFallar(e) };
    if (this.pestana() === 'Mediciones de registro') {
      this.estudioService.mediciones(filtro).subscribe({
        next: (p) => {
          this.mediciones.set(p);
          this.cargando.set(false);
        },
        ...alTerminar,
      });
    } else {
      this.estudioService.consultas(filtro).subscribe({
        next: (p) => {
          this.consultas.set(p);
          this.cargando.set(false);
        },
        ...alTerminar,
      });
    }
  }

  protected abrirAnular(tipo: 'medicion' | 'consulta', id: number): void {
    this.motivo.reset('');
    this.aAnular.set({ tipo, id });
  }

  protected anular(): void {
    const objetivo = this.aAnular();
    if (!objetivo || this.motivo.invalid) {
      this.motivo.markAsTouched();
      return;
    }
    const peticion: Observable<unknown> =
      objetivo.tipo === 'medicion'
        ? this.estudioService.anularMedicion(objetivo.id, this.motivo.value)
        : this.estudioService.anularConsulta(objetivo.id, this.motivo.value);
    peticion.subscribe({
      next: () => {
        this.aAnular.set(null);
        this.toast.exito('Dato anulado. Queda registrado el motivo en la auditoría.');
        this.cargar(0);
      },
      error: (e: HttpErrorResponse) => this.alFallar(e),
    });
  }

  protected colorEstado(estado: string): ColorBadge {
    const colores: Record<string, ColorBadge> = {
      COMPLETADA: 'success',
      EN_CURSO: 'info',
      ABANDONADA: 'warning',
      ANULADA: 'neutral',
      RESUELTA_BOT: 'success',
      RESUELTA_PERSONAL: 'success',
      ESCALADA: 'warning',
      NO_RESUELTA: 'danger',
      ABIERTA: 'info',
    };
    return colores[estado] ?? 'neutral';
  }

  private duracion(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    return `${minutos} min ${segundos % 60} s`;
  }

  private alFallar(error: HttpErrorResponse): void {
    this.cargando.set(false);
    this.toast.error((error.error as ErrorResponse | undefined)?.message ?? 'No se pudieron cargar los datos');
  }
}
