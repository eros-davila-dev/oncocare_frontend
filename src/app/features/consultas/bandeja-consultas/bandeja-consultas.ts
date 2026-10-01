import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ConsultaService, TurnoConversacion } from '../consulta.service';
import { Consulta } from '../../../core/models/estudio.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { Pagina } from '../../../core/models/pagina.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { PaginationComponent } from '../../../shared/components/pagination/pagination';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { BadgeComponent } from '../../../shared/ui/badge/badge';
import { ModalComponent } from '../../../shared/ui/modal/modal';
import { InputComponent } from '../../../shared/ui/input/input';
import { TAMANO_PAGINA_POR_DEFECTO } from '../../../shared/constants/paginacion';

const HORA_LIMA = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' });

/**
 * Consultas que el chatbot no pudo resolver (pregunta medica, sin informacion
 * oficial, pedido de una persona o valoracion negativa). Lo que el personal
 * resuelva aqui cuenta en el NCA; si nadie la atiende en 48 h, el sistema la
 * cierra como no resuelta.
 */
@Component({
  selector: 'app-bandeja-consultas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    LoadingSpinnerComponent,
    PaginationComponent,
    ButtonComponent,
    BadgeComponent,
    ModalComponent,
    InputComponent,
  ],
  templateUrl: './bandeja-consultas.html',
})
export class BandejaConsultasComponent {
  private readonly consultaService = inject(ConsultaService);
  private readonly toast = inject(ToastService);

  protected readonly cargando = signal(true);
  protected readonly pagina = signal<Pagina<Consulta>>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    pageNumber: 0,
    pageSize: TAMANO_PAGINA_POR_DEFECTO,
  });

  protected readonly seleccionada = signal<Consulta | null>(null);
  protected readonly conversacion = signal<TurnoConversacion[]>([]);
  protected readonly nota = new FormControl('', { nonNullable: true });
  protected readonly enviando = signal(false);

  constructor() {
    this.cargar(0);
  }

  protected fecha(iso: string): string {
    return HORA_LIMA.format(new Date(iso));
  }

  protected canal(consulta: Consulta): string {
    return consulta.canal === 'TELEGRAM' ? 'Telegram' : 'Chat web';
  }

  protected cargar(page: number): void {
    this.cargando.set(true);
    this.consultaService.bandeja(page).subscribe({
      next: (p) => {
        this.pagina.set(p);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);
        this.toast.error(this.mensaje(e));
      },
    });
  }

  protected abrir(consulta: Consulta): void {
    this.nota.reset('');
    this.conversacion.set([]);
    this.seleccionada.set(consulta);
    this.consultaService.conversacion(consulta.id).subscribe((turnos) => this.conversacion.set(turnos));
  }

  protected resolver(resuelta: boolean): void {
    const consulta = this.seleccionada();
    if (!consulta) {
      return;
    }
    this.enviando.set(true);
    this.consultaService.resolver(consulta.id, resuelta, this.nota.value || null).subscribe({
      next: () => {
        this.enviando.set(false);
        this.seleccionada.set(null);
        this.toast.exito(resuelta ? 'Consulta marcada como resuelta' : 'Consulta cerrada como no resuelta');
        this.cargar(this.pagina().pageNumber);
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.toast.error(this.mensaje(e));
      },
    });
  }

  private mensaje(error: HttpErrorResponse): string {
    return (error.error as ErrorResponse | undefined)?.message ?? 'No se pudo completar la operación';
  }
}
