import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { EstudioService } from '../estudio.service';
import { CanalConsulta, ResultadoImportacion, TipoFicha, TipoMedicion } from '../../../core/models/estudio.model';
import { ErrorResponse } from '../../../core/models/error.model';
import { CardComponent } from '../../../shared/ui/card/card';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { InputComponent } from '../../../shared/ui/input/input';
import { SelectComponent, type OpcionSelect } from '../../../shared/ui/select/select';
import { TabsComponent } from '../../../shared/ui/tabs/tabs';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { descargarBlob } from '../indicadores.util';

const PESTANAS = ['Tiempos (TPR)', 'Ausentismo (TA)', 'Consultas (NCA)'] as const;
type Pestana = (typeof PESTANAS)[number];

const FICHA_POR_PESTANA: Record<Pestana, TipoFicha> = {
  'Tiempos (TPR)': 'tiempos',
  'Ausentismo (TA)': 'asistencias',
  'Consultas (NCA)': 'consultas',
};

const DESCRIPCION_POR_FICHA: Record<TipoFicha, string> = {
  tiempos:
    'Instrumento 01. Hora de inicio y fin de cada registro hecho con el proceso manual. Solo fechas del pretest: en el postest el sistema mide el tiempo solo.',
  asistencias:
    'Instrumento 02. Citas del pretest y si el paciente asistió. Solo fechas del pretest: en el postest se registra en la agenda.',
  consultas:
    'Instrumento 03. Consultas recibidas por WhatsApp, llamada o en persona y si se resolvieron. Se usa en ambas fases: estas consultas siguen ocurriendo durante el postest.',
};

const SI_NO: OpcionSelect[] = [
  { value: 'SI', label: 'Sí' },
  { value: 'NO', label: 'No' },
];

/**
 * Fichas de recoleccion del Anexo 2 de la tesis, digitalizadas: el pretest
 * vive en el mismo sistema y se calcula con las mismas formulas que el
 * postest.
 */
@Component({
  selector: 'app-estudio-fichas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CardComponent, ButtonComponent, InputComponent, SelectComponent, TabsComponent, IconComponent],
  templateUrl: './estudio-fichas.html',
})
export class EstudioFichasComponent {
  private readonly estudioService = inject(EstudioService);
  private readonly toast = inject(ToastService);

  protected readonly pestanas = PESTANAS;
  protected readonly pestana = signal<Pestana>('Tiempos (TPR)');
  protected readonly siNo = SI_NO;
  protected readonly participantes = signal<OpcionSelect[]>([]);
  protected readonly enviando = signal(false);

  protected readonly opcionesTipo: OpcionSelect[] = [
    { value: 'REGISTRO_CITA', label: 'Registro de cita (indicador de la hipótesis)' },
    { value: 'REGISTRO_PACIENTE', label: 'Alta de paciente' },
    { value: 'ACTUALIZACION_PACIENTE', label: 'Actualización de ficha' },
  ];
  protected readonly opcionesMedio: OpcionSelect[] = [
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'LLAMADA', label: 'Llamada' },
    { value: 'PRESENCIAL', label: 'Presencial' },
  ];

  protected readonly formTiempo = new FormGroup({
    pacienteId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    tipo: new FormControl<TipoMedicion>('REGISTRO_CITA', { nonNullable: true }),
    fecha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    horaInicio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    horaFin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    observacion: new FormControl(''),
  });

  protected readonly formAsistencia = new FormGroup({
    pacienteId: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fecha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    hora: new FormControl(''),
    tipoConsulta: new FormControl(''),
    asistio: new FormControl<'SI' | 'NO' | null>(null, { validators: [Validators.required] }),
  });

  protected readonly formConsulta = new FormGroup({
    fecha: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    hora: new FormControl(''),
    canal: new FormControl<CanalConsulta | null>(null, { validators: [Validators.required] }),
    pacienteId: new FormControl<number | null>(null),
    resumen: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(300)] }),
    resuelta: new FormControl<'SI' | 'NO' | null>(null, { validators: [Validators.required] }),
    observacion: new FormControl(''),
  });

  protected readonly archivo = signal<File | null>(null);
  protected readonly resultadoImportacion = signal<ResultadoImportacion | null>(null);
  protected readonly importando = signal(false);

  constructor() {
    this.estudioService.participantes().subscribe((lista) =>
      this.participantes.set(
        lista.filter((p) => p.incluido).map((p) => ({ value: p.pacienteId, label: `${p.codigo} · ${p.nombreCompleto}` })),
      ),
    );
  }

  protected ficha(): TipoFicha {
    return FICHA_POR_PESTANA[this.pestana()];
  }

  protected descripcion(): string {
    return DESCRIPCION_POR_FICHA[this.ficha()];
  }

  protected cambiarPestana(pestana: Pestana): void {
    this.pestana.set(pestana);
    this.archivo.set(null);
    this.resultadoImportacion.set(null);
  }

  protected guardarTiempo(): void {
    if (this.marcarSiInvalido(this.formTiempo)) {
      return;
    }
    const v = this.formTiempo.getRawValue();
    this.enviar(
      this.estudioService.registrarTiempo({
        pacienteId: v.pacienteId!,
        tipo: v.tipo,
        fecha: v.fecha,
        horaInicio: v.horaInicio,
        horaFin: v.horaFin,
        observacion: v.observacion || null,
      }),
      () => this.formTiempo.reset({ tipo: 'REGISTRO_CITA', pacienteId: v.pacienteId, fecha: v.fecha }),
      'Tiempo de registro guardado',
    );
  }

  protected guardarAsistencia(): void {
    if (this.marcarSiInvalido(this.formAsistencia)) {
      return;
    }
    const v = this.formAsistencia.getRawValue();
    this.enviar(
      this.estudioService.registrarAsistencia({
        pacienteId: v.pacienteId!,
        fecha: v.fecha,
        hora: v.hora || null,
        tipoConsulta: v.tipoConsulta || null,
        asistio: v.asistio === 'SI',
      }),
      () => this.formAsistencia.reset({ pacienteId: v.pacienteId }),
      'Cita del pretest registrada',
    );
  }

  protected guardarConsulta(): void {
    if (this.marcarSiInvalido(this.formConsulta)) {
      return;
    }
    const v = this.formConsulta.getRawValue();
    this.enviar(
      this.estudioService.registrarConsulta({
        fecha: v.fecha,
        hora: v.hora || null,
        canal: v.canal!,
        pacienteId: v.pacienteId,
        resumen: v.resumen,
        resuelta: v.resuelta === 'SI',
        observacion: v.observacion || null,
      }),
      () => this.formConsulta.reset({ fecha: v.fecha, canal: v.canal }),
      'Consulta registrada',
    );
  }

  protected seleccionarArchivo(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    this.archivo.set(entrada.files?.item(0) ?? null);
    this.resultadoImportacion.set(null);
  }

  protected importar(aplicar: boolean): void {
    const archivo = this.archivo();
    if (!archivo) {
      this.toast.error('Seleccione un archivo .xlsx o .csv');
      return;
    }
    this.importando.set(true);
    this.estudioService.importar(this.ficha(), archivo, aplicar).subscribe({
      next: (resultado) => {
        this.importando.set(false);
        this.resultadoImportacion.set(resultado);
        if (resultado.aplicado) {
          this.toast.exito(`${resultado.filasValidas} filas importadas`);
        }
      },
      error: (e: HttpErrorResponse) => {
        this.importando.set(false);
        this.toast.error(this.mensaje(e));
      },
    });
  }

  protected descargarPlantilla(): void {
    const ficha = this.ficha();
    this.estudioService.plantilla(ficha).subscribe((blob) => descargarBlob(blob, `plantilla-ficha-${ficha}.xlsx`));
  }

  private enviar<T>(peticion: Observable<T>, alTerminar: () => void, mensajeExito: string): void {
    this.enviando.set(true);
    peticion.subscribe({
      next: () => {
        this.enviando.set(false);
        this.toast.exito(mensajeExito);
        alTerminar();
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        this.toast.error(this.mensaje(e));
      },
    });
  }

  private marcarSiInvalido(form: FormGroup): boolean {
    if (form.invalid) {
      form.markAllAsTouched();
      return true;
    }
    return false;
  }

  private mensaje(error: HttpErrorResponse): string {
    const cuerpo = error.error as ErrorResponse | undefined;
    const detalle = cuerpo?.errores?.map((e) => e.mensaje).join('. ');
    return detalle || cuerpo?.message || 'No se pudo guardar la ficha';
  }
}
