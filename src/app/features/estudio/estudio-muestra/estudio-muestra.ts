import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EstudioService } from '../estudio.service';
import { Fase, FaseEstudio, ResumenRecoleccion } from '../../../core/models/estudio.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { CardComponent } from '../../../shared/ui/card/card';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { InputComponent } from '../../../shared/ui/input/input';
import { BadgeComponent } from '../../../shared/ui/badge/badge';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { fechaCorta } from '../indicadores.util';

/** Sesiones por etapa previstas en la tesis (lunes, miercoles y viernes). */
const SESIONES_PREVISTAS = 13;

interface FormularioFase {
  fase: Fase;
  form: FormGroup<{ fechaInicio: FormControl<string>; fechaFin: FormControl<string> }>;
}

interface EtapaSesiones {
  fase: Fase;
  resumen: ResumenRecoleccion | null;
  aviso: string | null;
}

/**
 * Fases y sesiones del estudio (tesis v8, opcion B): fechas de cada fase
 * (cerrarla congela sus resultados) y las 13 + 13 sesiones de lunes,
 * miercoles y viernes con los eventos de cada indicador. La unidad de
 * analisis son las sesiones; no hay una muestra fija de participantes.
 */
@Component({
  selector: 'app-estudio-muestra',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, BadgeComponent, ConfirmDialogComponent],
  templateUrl: './estudio-muestra.html',
})
export class EstudioMuestraComponent {
  private readonly estudioService = inject(EstudioService);
  private readonly toast = inject(ToastService);

  protected readonly fechaCorta = fechaCorta;
  protected readonly sesionesPrevistas = SESIONES_PREVISTAS;

  protected readonly fases = signal<FaseEstudio[]>([]);
  protected readonly formulariosFase: FormularioFase[] = (['PRETEST', 'POSTEST'] as Fase[]).map((fase) => ({
    fase,
    form: new FormGroup({
      fechaInicio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      fechaFin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    }),
  }));

  protected readonly etapas = signal<EtapaSesiones[]>([
    { fase: 'PRETEST', resumen: null, aviso: null },
    { fase: 'POSTEST', resumen: null, aviso: null },
  ]);
  protected readonly totalSesiones = computed(() =>
    this.etapas().reduce((total, e) => total + (e.resumen?.sesiones.length ?? 0), 0),
  );

  protected readonly faseACerrar = signal<Fase | null>(null);

  constructor() {
    this.cargarFases();
  }

  protected estadoDe(fase: Fase): FaseEstudio | undefined {
    return this.fases().find((f) => f.fase === fase);
  }

  /** "Lun", "Mié", "Vie": se lee de un vistazo que son dias de sesion. */
  protected diaSemana(iso: string): string {
    const [a, m, d] = iso.split('-').map(Number);
    const dia = new Date(a, m - 1, d).toLocaleDateString('es-PE', { weekday: 'short' }).replace('.', '');
    return dia.charAt(0).toUpperCase() + dia.slice(1);
  }

  protected guardarFase(item: FormularioFase): void {
    if (item.form.invalid) {
      item.form.markAllAsTouched();
      return;
    }
    const { fechaInicio, fechaFin } = item.form.getRawValue();
    this.estudioService.configurarFase(item.fase, fechaInicio, fechaFin).subscribe({
      next: () => {
        this.toast.exito(`Fechas del ${item.fase.toLowerCase()} guardadas`);
        this.cargarFases();
      },
      error: (e: HttpErrorResponse) => this.toast.error(this.mensaje(e)),
    });
  }

  protected cerrarFase(): void {
    const fase = this.faseACerrar();
    if (!fase) {
      return;
    }
    this.faseACerrar.set(null);
    this.estudioService.cerrarFase(fase).subscribe({
      next: () => {
        this.toast.exito(`El ${fase.toLowerCase()} quedó cerrado`);
        this.cargarFases();
      },
      error: (e: HttpErrorResponse) => this.toast.error(this.mensaje(e)),
    });
  }

  private cargarFases(): void {
    this.estudioService.fases().subscribe((fases) => {
      this.fases.set(fases);
      for (const item of this.formulariosFase) {
        const fase = fases.find((f) => f.fase === item.fase);
        if (fase) {
          item.form.reset({ fechaInicio: fase.fechaInicio, fechaFin: fase.fechaFin });
        }
        if (fase?.estado === 'CERRADA') {
          item.form.disable();
        }
      }
      this.cargarSesiones();
    });
  }

  private cargarSesiones(): void {
    for (const fase of ['PRETEST', 'POSTEST'] as Fase[]) {
      this.estudioService.recoleccion(fase).subscribe({
        next: (resumen) => this.actualizarEtapa({ fase, resumen, aviso: null }),
        error: (e: HttpErrorResponse) => this.actualizarEtapa({ fase, resumen: null, aviso: this.mensaje(e) }),
      });
    }
  }

  private actualizarEtapa(etapa: EtapaSesiones): void {
    this.etapas.update((lista) => lista.map((e) => (e.fase === etapa.fase ? etapa : e)));
  }

  private mensaje(error: HttpErrorResponse): string {
    return (error.error as ErrorResponse | undefined)?.message ?? 'No se pudo completar la operación';
  }
}
