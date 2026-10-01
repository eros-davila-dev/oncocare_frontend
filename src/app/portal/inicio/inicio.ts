import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/ui/icon/icon';
import type { NombreIcono } from '../../shared/ui/icon/icon-data';
import { PreguntaPublica, PreguntasFrecuentesPublicasService } from '../preguntas/preguntas-frecuentes-publicas.service';

interface Beneficio {
  icono: NombreIcono;
  titulo: string;
  texto: string;
}

const BENEFICIOS: Beneficio[] = [
  {
    icono: 'bell',
    titulo: 'Recordatorios de tus citas',
    texto: 'Vincula tu Telegram y te avisaremos antes de cada cita. Confirma o cancela con un solo botón.',
  },
  {
    icono: 'calendar-days',
    titulo: 'Tus citas en un solo lugar',
    texto: 'Revisa cuándo es tu próxima cita, confírmala, reprográmala o cancélala desde el celular.',
  },
  {
    icono: 'message-circle',
    titulo: 'Asistente virtual',
    texto: 'Resuelve tus dudas sobre citas y trámites en cualquier momento. Si lo necesitas, te deriva con una persona.',
  },
];

const PASOS = [
  'Crea tu cuenta con tu correo o pide ayuda en recepción.',
  'Completa tu ficha con tu documento y datos de contacto.',
  'Vincula tu Telegram desde «Mi perfil» para recibir recordatorios.',
];

/**
 * Pagina publica del portal. Explica lo que el paciente puede hacer y lo
 * lleva a ingresar; la informacion institucional (horarios, requisitos)
 * sale de las preguntas frecuentes que administra la fundacion.
 */
@Component({
  selector: 'app-inicio-portal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  templateUrl: './inicio.html',
})
export class InicioPortalComponent {
  protected readonly authService = inject(AuthService);
  private readonly preguntasService = inject(PreguntasFrecuentesPublicasService);

  protected readonly beneficios = BENEFICIOS;
  protected readonly pasos = PASOS;
  protected readonly preguntas = signal<PreguntaPublica[]>([]);

  constructor() {
    this.preguntasService.listar().subscribe((lista) => this.preguntas.set(lista.slice(0, 4)));
  }
}
