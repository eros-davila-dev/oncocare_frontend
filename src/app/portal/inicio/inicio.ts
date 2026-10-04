import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { QrBotTelegramComponent } from '../../features/telegram/qr-bot-telegram/qr-bot-telegram';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/ui/icon/icon';
import type { NombreIcono } from '../../shared/ui/icon/icon-data';
import { RevelarDirective } from '../../shared/directives/revelar.directive';
import { PreguntaPublica, PreguntasFrecuentesPublicasService } from '../preguntas/preguntas-frecuentes-publicas.service';
import { CarruselPortadaComponent, DiapositivaPortada } from './carrusel-portada/carrusel-portada';

interface Elemento {
  icono: NombreIcono;
  titulo: string;
  texto: string;
}

interface Acceso extends Elemento {
  ruta: string;
}

const BENEFICIOS: Elemento[] = [
  {
    icono: 'calendar-days',
    titulo: 'Tus citas en un solo lugar',
    texto: 'Mira cuándo es tu próxima cita y confírmala, reprográmala o cancélala desde el celular.',
  },
  {
    icono: 'bell',
    titulo: 'Avisos antes de cada cita',
    texto: 'Te escribimos por Telegram y respondes con un botón. Así no se te pasa ninguna.',
  },
  {
    icono: 'users',
    titulo: 'Tu acompañante, informado',
    texto: 'El familiar que te acompaña también puede recibir los recordatorios, si tú lo autorizas.',
  },
  {
    icono: 'bot',
    titulo: 'Respuestas a cualquier hora',
    texto: 'El asistente virtual resuelve dudas sobre horarios, requisitos y trámites, y te pasa con una persona si hace falta.',
  },
];

const PASOS: Elemento[] = [
  { icono: 'user-check', titulo: 'Crea tu cuenta', texto: 'Con tu correo, en un minuto. Si prefieres, te ayudan en recepción.' },
  { icono: 'shield-check', titulo: 'Completa tu ficha', texto: 'Tu documento y un teléfono de contacto. Tus datos están protegidos.' },
  { icono: 'smartphone', titulo: 'Activa los avisos', texto: 'Comparte tu número con el bot de Telegram y listo: recibirás tus recordatorios.' },
];

const GARANTIAS: Elemento[] = [
  { icono: 'clock', titulo: 'Disponible 24/7', texto: 'El portal y el asistente no cierran.' },
  { icono: 'circle-check-big', titulo: 'Gratis', texto: 'Sin costo para pacientes y familiares.' },
  { icono: 'shield-check', titulo: 'Datos protegidos', texto: 'Conforme a la Ley N.° 29733.' },
];

/**
 * Portada publica del portal: carrusel con lo que el paciente puede hacer,
 * accesos rapidos, beneficios, pasos para empezar, recordatorios por Telegram
 * y preguntas frecuentes (las que administra la fundacion). Los textos son
 * cortos y los botones grandes: muchos pacientes son adultos mayores.
 */
@Component({
  selector: 'app-inicio-portal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, QrBotTelegramComponent, RevelarDirective, CarruselPortadaComponent],
  templateUrl: './inicio.html',
})
export class InicioPortalComponent {
  protected readonly authService = inject(AuthService);
  private readonly preguntasService = inject(PreguntasFrecuentesPublicasService);

  protected readonly beneficios = BENEFICIOS;
  protected readonly pasos = PASOS;
  protected readonly garantias = GARANTIAS;
  protected readonly preguntas = signal<PreguntaPublica[]>([]);

  protected readonly diapositivas = computed<DiapositivaPortada[]>(() => {
    const conSesion = this.authService.estaAutenticado();
    return [
      {
        imagen: '/portada/consulta.webp',
        alt: 'Doctora conversando con un paciente mayor en el consultorio',
        etiqueta: 'Portal del paciente',
        titulo: 'Tu atención, más cerca y sin olvidos',
        texto: 'Consulta tus citas y confírmalas, reprográmalas o cancélalas desde el celular, cuando lo necesites.',
        accion: conSesion ? { texto: 'Ver mis citas', ruta: '/mis-citas' } : { texto: 'Ingresar', ruta: '/auth/login' },
        accionSecundaria: conSesion ? undefined : { texto: 'Crear cuenta', ruta: '/auth/registro' },
      },
      {
        imagen: '/portada/recordatorio.webp',
        alt: 'Señora sonriendo mientras revisa un mensaje en su celular',
        etiqueta: 'Recordatorios por Telegram',
        titulo: 'Te avisamos antes de cada cita',
        texto: 'Confirma, reprograma o cancela con un solo toque. Es gratis y opcional.',
        accion: { texto: 'Activar recordatorios', ruta: '/recordatorios-telegram' },
      },
      {
        imagen: '/portada/acompanamiento.webp',
        alt: 'Médico sonriendo junto a una paciente en su habitación',
        etiqueta: 'Acompañamiento',
        titulo: 'Tu familia también puede estar al tanto',
        texto: 'Registra a la persona que te acompaña y recibirá los avisos de tus citas.',
        accion: { texto: 'Cómo funciona', ruta: '/recordatorios-telegram' },
      },
      {
        imagen: '/portada/atencion.webp',
        alt: 'Doctora atendiendo con calidez a una paciente',
        etiqueta: 'Asistente virtual',
        titulo: 'Resuelve tus dudas a cualquier hora',
        texto: 'Horarios, requisitos y trámites al instante. Si lo necesitas, te pasa con una persona del equipo.',
        accion: { texto: 'Ver preguntas frecuentes', ruta: '/preguntas-frecuentes' },
      },
    ];
  });

  protected readonly accesos = computed<Acceso[]>(() => [
    this.authService.estaAutenticado()
      ? { icono: 'calendar-days', titulo: 'Mis citas', texto: 'Próximas y pasadas', ruta: '/mis-citas' }
      : { icono: 'user-check', titulo: 'Ingresar', texto: 'A tu portal', ruta: '/auth/login' },
    { icono: 'bell', titulo: 'Recordatorios', texto: 'Actívalos en Telegram', ruta: '/recordatorios-telegram' },
    { icono: 'message-circle', titulo: 'Preguntas frecuentes', texto: 'Horarios y requisitos', ruta: '/preguntas-frecuentes' },
    this.authService.estaAutenticado()
      ? { icono: 'user-cog', titulo: 'Mi perfil', texto: 'Tus datos y contacto', ruta: '/mi-perfil' }
      : { icono: 'plus', titulo: 'Crear cuenta', texto: 'En un minuto', ruta: '/auth/registro' },
  ]);

  constructor() {
    this.preguntasService.listar().subscribe((lista) => this.preguntas.set(lista.slice(0, 5)));
  }
}
