import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DashboardService, FuenteActividad } from '../dashboard.service';
import { ActividadDetalle, ActividadDia, ActividadResumen } from '../../../core/models/dashboard.model';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/components/toast-notification/toast.service';
import { CardComponent } from '../../../shared/ui/card/card';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { TabsComponent } from '../../../shared/ui/tabs/tabs';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner';
import { formatoEtiquetaEnum } from '../../../shared/pipes/etiqueta-enum.pipe';
import { descargarBlob, fechaCorta } from '../../estudio/indicadores.util';
import { GraficoColumnasComponent, PuntoSerie, ReferenciaSerie } from '../../../shared/charts/grafico-columnas';
import { EstudioService } from '../../estudio/estudio.service';
import { LineaBaseSesion } from '../../../core/models/estudio.model';
import { GraficoBarrasComponent, ItemBarra } from '../../../shared/charts/grafico-barras';
import { EventosImportadosComponent } from '../eventos-importados/eventos-importados';

const PERIODOS = [
  { dias: 0, etiqueta: 'Hoy' },
  { dias: 7, etiqueta: '7 días' },
  { dias: 30, etiqueta: '30 días' },
  { dias: 90, etiqueta: '90 días' },
] as const;

const VISTAS = ['General', 'Tiempo de registro', 'Ausentismo', 'Recordatorios', 'Consultas'] as const;
/** Valor de ?vista= en la URL para abrir directo una pestana. */
const VISTA_POR_PARAMETRO: Record<string, Vista> = {
  general: 'General',
  registro: 'Tiempo de registro',
  ausentismo: 'Ausentismo',
  recordatorios: 'Recordatorios',
  consultas: 'Consultas',
  graficos: 'Tiempo de registro',
};
type Vista = (typeof VISTAS)[number];

const CANALES_RECORDATORIO: Record<string, string> = {
  NO_INFORMADO: 'Canal no informado (instrumento)',
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

/** Promedio por indicador de las sesiones cargadas del instrumento (null si no hay). */
function promedios(sesiones: LineaBaseSesion[]): { tpr: number | null; ta: number | null; nca: number | null } {
  const media = (valor: (s: LineaBaseSesion) => number | null): number | null => {
    const datos = sesiones.map(valor).filter((v): v is number => v != null);
    return datos.length ? datos.reduce((a, b) => a + b, 0) / datos.length : null;
  };
  return { tpr: media((s) => s.tprMin), ta: media((s) => s.taPct), nca: media((s) => s.ncaPct) };
}

function saludoDelMomento(): string {
  const hora = new Date().getHours();
  return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
}

/**
 * Panel del personal: todo lo que se hizo en el periodo elegido. Tiempo de
 * registro de pacientes, citas y ausentismo, recordatorios enviados y
 * consultas atendidas por el asistente, con una fila por día y el detalle
 * fila por fila (con nombres) para quien atiende a los pacientes.
 */
@Component({
  selector: 'app-dashboard-indicadores',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    CardComponent,
    ButtonComponent,
    TabsComponent,
    LoadingSpinnerComponent,
    IconComponent,
    GraficoColumnasComponent,
    GraficoBarrasComponent,
    EventosImportadosComponent,
  ],
  templateUrl: './dashboard-indicadores.html',
})
export class DashboardIndicadoresComponent {
  private readonly dashboardService = inject(DashboardService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AuthService);

  protected readonly periodos = PERIODOS;
  protected readonly fechaCorta = fechaCorta;
  protected readonly etiqueta = formatoEtiquetaEnum;

  /** El detalle lleva nombres de pacientes: no lo ve el investigador. */
  protected readonly puedeVerDetalle = this.authService.tieneAlgunRol('ADMIN', 'MEDICO', 'RECEPCIONISTA');
  protected readonly puedeDescargar = this.authService.tieneAlgunRol('ADMIN', 'RECEPCIONISTA');

  protected readonly saludo = saludoDelMomento();
  protected readonly nombre = () => this.authService.usuario()?.nombres?.split(' ')[0] ?? '';

  protected readonly diasPeriodo = signal<number | null>(30);
  protected readonly desdeControl = new FormControl(this.isoLocal(this.haceDias(30)), { nonNullable: true });
  protected readonly hastaControl = new FormControl(this.isoLocal(new Date()), { nonNullable: true });

  protected readonly cargando = signal(true);
  protected readonly descargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resumen = signal<ActividadResumen | null>(null);
  protected readonly detalle = signal<ActividadDetalle | null>(null);
  protected readonly vistas = VISTAS;
  /**
   * De donde salen los datos: el servidor de la fundacion (eventos importados
   * del instrumento) o lo que mide esta instalacion local.
   */
  protected readonly fuente = signal<FuenteActividad>('LOCAL');
  protected readonly fuentes: { valor: FuenteActividad; etiqueta: string }[] = [
    { valor: 'SERVIDOR', etiqueta: 'Servidor de la fundación' },
    { valor: 'LOCAL', etiqueta: 'Esta instalación' },
  ];

  /** Periodos de las etapas del estudio (fechas de sus sesiones), para verlos con un clic. */
  protected readonly etapasEstudio = computed(() => {
    const rango = (s: LineaBaseSesion[]) => (s.length ? { desde: s[0].fecha, hasta: s[s.length - 1].fecha } : null);
    return [
      { etiqueta: 'Pretest', rango: rango(this.lineaBase()) },
      { etiqueta: 'Postest', rango: rango(this.postestImportado()) },
    ].filter((e) => e.rango !== null) as { etiqueta: string; rango: { desde: string; hasta: string } }[];
  });
  /** Linea base del pretest (instrumento manual): su promedio se dibuja como referencia. */
  protected readonly lineaBase = signal<LineaBaseSesion[]>([]);
  /** Pacientes de demostracion activos: mientras existan se muestra un aviso. */
  protected readonly pacientesDemo = signal(0);
  /** Postest medido en el servidor de la fundacion e importado a esta instalacion. */
  protected readonly postestImportado = signal<LineaBaseSesion[]>([]);

  /** Promedio de las sesiones del pretest por indicador (null si no hay linea base). */
  protected readonly pretest = computed(() => promedios(this.lineaBase()));
  protected readonly postestDelExcel = computed(() => promedios(this.postestImportado()));

  /** Pretest vs postest por indicador (promedio de sesiones), para la tabla del resumen. */
  protected readonly comparacion = computed(() => {
    const pre = this.pretest();
    const post = this.postestDelExcel();
    const filas = [
      { indicador: 'Tiempo de registro', clave: 'tpr' as const, unidad: 'min', meta: 'Bajar', bajar: true },
      { indicador: 'Ausentismo', clave: 'ta' as const, unidad: '%', meta: 'Bajar', bajar: true },
      { indicador: 'Consultas atendidas', clave: 'nca' as const, unidad: '%', meta: 'Subir', bajar: false },
    ];
    return filas
      .filter((f) => pre[f.clave] != null)
      .map((f) => {
        const a = pre[f.clave]!;
        const b = post[f.clave];
        const diferencia = b == null ? null : b - a;
        return {
          indicador: f.indicador,
          unidad: f.unidad,
          meta: f.meta,
          pre: a,
          post: b,
          diferencia,
          cumple: diferencia === null ? null : f.bajar ? diferencia < 0 : diferencia > 0,
        };
      });
  });
  protected readonly vista = signal<Vista>(
    VISTA_POR_PARAMETRO[inject(ActivatedRoute).snapshot.queryParamMap.get('vista') ?? ''] ?? 'General',
  );

  /** Grafico de un indicador por su clave (tpr, ta, nca, recordatorios). */
  protected serie(clave: string) {
    return this.seriesPorDia().find((g) => g.clave === clave) ?? null;
  }

  /** Tarjetas de la pestana General: cada una lleva a la pestana de su indicador. */
  protected readonly tarjetas = computed(() => {
    const r = this.resumen();
    if (!r) return [];
    const pre = this.pretest();
    const post = this.postestDelExcel();
    return [
      {
        vista: 'Tiempo de registro' as Vista,
        titulo: 'TIEMPO DE REGISTRO',
        icono: 'clock' as const,
        colorIcono: 'bg-primary-soft text-primary',
        valor: this.numero(r.registros.promedioMin, 2),
        unidad: 'min',
        detalle: `${r.registros.total} ${r.registros.total === 1 ? 'paciente registrado' : 'pacientes registrados'} por el personal`,
        pre: pre.tpr,
        post: post.tpr,
      },
      {
        vista: 'Ausentismo' as Vista,
        titulo: 'AUSENTISMO',
        icono: 'calendar-days' as const,
        colorIcono: 'bg-warning-soft text-warning',
        valor: this.numero(r.citas.ausentismoPct),
        unidad: '%',
        detalle: `${r.citas.noAsistio} no asistieron de ${r.citas.atendidas + r.citas.noAsistio} citas con desenlace`,
        pre: pre.ta,
        post: post.ta,
      },
      {
        vista: 'Recordatorios' as Vista,
        titulo: 'RECORDATORIOS',
        icono: 'bell' as const,
        colorIcono: 'bg-success-soft text-success',
        valor: String(r.recordatorios.enviados),
        unidad: 'enviados',
        detalle: `${this.numero(r.recordatorios.coberturaPct)} % de las citas con desenlace recibió recordatorio`,
        pre: null,
        post: null,
      },
      {
        vista: 'Consultas' as Vista,
        titulo: 'CONSULTAS ATENDIDAS',
        icono: 'bot' as const,
        colorIcono: 'bg-lavender text-secondary-foreground',
        valor: this.numero(r.consultas.atendidasAutomaticoPct),
        unidad: '%',
        detalle: `${r.consultas.resueltasPorAsistente} de ${r.consultas.cerradas} resueltas por el asistente`,
        pre: pre.nca,
        post: post.nca,
      },
    ];
  });
  /** Graficos que se estan viendo como tabla. */
  protected readonly tablas = signal<ReadonlySet<string>>(new Set());

  /** Un grafico de columnas por indicador, con un valor por dia con actividad. */
  protected readonly seriesPorDia = computed(() => {
    const dias = this.resumen()?.dias ?? [];
    const pre = this.pretest();
    const post = this.postestDelExcel();
    const refs = (clave: 'tpr' | 'ta' | 'nca'): ReferenciaSerie[] => {
      const lista: ReferenciaSerie[] = [];
      if (pre[clave] != null) lista.push({ valor: Math.round(pre[clave]! * 100) / 100, etiqueta: 'Promedio pretest' });
      if (post[clave] != null) lista.push({ valor: Math.round(post[clave]! * 100) / 100, etiqueta: 'Postest (servidor)' });
      return lista;
    };
    const serie = (valor: (d: ActividadDia) => number | null): PuntoSerie[] =>
      dias.map((d) => ({ etiqueta: d.fecha.slice(8, 10) + '/' + d.fecha.slice(5, 7), detalle: fechaCorta(d.fecha), valor: valor(d) }));
    return [
      {
        clave: 'tpr',
        titulo: 'Tiempo de registro por día',
        subtitulo: 'Minutos promedio por paciente registrado por el personal · meta: bajar',
        puntos: serie((d) => d.tprMin),
        unidad: 'min',
        decimales: 2,
        maximo: null,
        referencias: refs('tpr'),
      },
      {
        clave: 'ta',
        titulo: 'Ausentismo por día',
        subtitulo: 'No asistieron / citas con desenlace × 100 · meta: bajar',
        puntos: serie((d) => d.ausentismoPct),
        unidad: '%',
        decimales: 1,
        maximo: 100,
        referencias: refs('ta'),
      },
      {
        clave: 'nca',
        titulo: 'Consultas atendidas por el asistente',
        subtitulo: 'Resueltas sin pasar al personal / consultas cerradas × 100 · meta: subir',
        puntos: serie((d) => d.atendidasAutomaticoPct),
        unidad: '%',
        decimales: 1,
        maximo: 100,
        referencias: refs('nca'),
      },
      {
        clave: 'recordatorios',
        titulo: 'Recordatorios enviados por día',
        subtitulo: 'Avisos de cita que salieron por Telegram, correo o llamada',
        puntos: serie((d) => d.recordatoriosEnviados),
        unidad: '',
        decimales: 0,
        maximo: null,
        referencias: [] as ReferenciaSerie[],
      },
    ];
  });

  protected readonly citasPorResultado = computed<ItemBarra[]>(() => {
    const c = this.resumen()?.citas;
    return c
      ? [
          { etiqueta: 'Asistieron', valor: c.atendidas },
          { etiqueta: 'No asistieron', valor: c.noAsistio },
          { etiqueta: 'Canceladas', valor: c.canceladas },
          { etiqueta: 'Por atender', valor: c.pendientes },
        ].filter((i) => i.valor > 0)
      : [];
  });

  protected readonly consultasPorTema = computed<ItemBarra[]>(() =>
    Object.entries(this.resumen()?.consultas.porCategoria ?? {}).map(([tema, valor]) => ({
      etiqueta: formatoEtiquetaEnum(tema),
      valor,
    })),
  );

  protected readonly recordatoriosPorCanal = computed<ItemBarra[]>(() =>
    Object.entries(this.resumen()?.recordatorios.enviadosPorCanal ?? {}).map(([canal, valor]) => ({
      etiqueta: CANALES_RECORDATORIO[canal] ?? canal,
      valor,
    })),
  );

  protected alternarTabla(clave: string): void {
    this.tablas.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(clave)) nuevo.delete(clave);
      else nuevo.add(clave);
      return nuevo;
    });
  }

  protected readonly canales = computed(() => {
    const r = this.resumen();
    return r ? Object.entries(r.recordatorios.enviadosPorCanal).map(([canal, n]) => `${CANALES_RECORDATORIO[canal] ?? canal}: ${n}`) : [];
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
    this.dashboardService.datosDemo().subscribe({ next: (r) => this.pacientesDemo.set(r.pacientes), error: () => this.pacientesDemo.set(0) });
    const estudio = inject(EstudioService);
    estudio.lineaBase().subscribe({ next: (s) => this.lineaBase.set(s), error: () => this.lineaBase.set([]) });
    // Si hay datos del servidor de la fundacion, el panel abre con ellos y en el periodo del postest.
    estudio.lineaBase('POSTEST').subscribe({
      next: (s) => {
        this.postestImportado.set(s);
        if (s.length) {
          this.fuente.set('SERVIDOR');
          this.desdeControl.setValue(s[0].fecha);
          this.hastaControl.setValue(s[s.length - 1].fecha);
          this.diasPeriodo.set(null);
        }
        this.cargar();
      },
      error: () => {
        this.postestImportado.set([]);
        this.cargar();
      },
    });
  }

  protected cambiarFuente(fuente: FuenteActividad): void {
    this.fuente.set(fuente);
    this.cargar();
  }

  protected verEtapa(rango: { desde: string; hasta: string }): void {
    this.desdeControl.setValue(rango.desde);
    this.hastaControl.setValue(rango.hasta);
    this.diasPeriodo.set(null);
    this.cargar();
  }

  protected etapaActiva(rango: { desde: string; hasta: string }): boolean {
    return this.diasPeriodo() === null && this.desdeControl.value === rango.desde && this.hastaControl.value === rango.hasta;
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
    this.dashboardService.exportarActividad(desde, hasta, this.fuente()).subscribe({
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
    this.dashboardService.actividad(desde, hasta, this.fuente()).subscribe({
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
      this.dashboardService.actividadDetalle(desde, hasta, this.fuente()).subscribe({
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
