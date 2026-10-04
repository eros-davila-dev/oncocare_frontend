import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AUDIENCIA } from '../../../core/config/audiencia';
import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../../../shared/ui/icon/icon';
import type { NombreIcono } from '../../../shared/ui/icon/icon-data';

interface Escena {
  imagen: string;
  titulo: string;
  texto: string;
}

const ESCENAS_PORTAL: Escena[] = [
  {
    imagen: '/portada/recordatorio.webp',
    titulo: 'Te avisamos antes de cada cita',
    texto: 'Recibe el recordatorio en Telegram y confirma con un solo toque.',
  },
  {
    imagen: '/portada/consulta.webp',
    titulo: 'Tus citas, siempre a mano',
    texto: 'Confírmalas, reprográmalas o cancélalas desde el celular.',
  },
  {
    imagen: '/portada/acompanamiento.webp',
    titulo: 'Tu familia, también informada',
    texto: 'La persona que te acompaña puede recibir los avisos de tus citas.',
  },
];

const ESCENAS_INTRANET: Escena[] = [
  {
    imagen: '/portada/consulta.webp',
    titulo: 'La agenda del día en un vistazo',
    texto: 'Citas, asistencia y pacientes que necesitan una llamada.',
  },
  {
    imagen: '/portada/equipo.webp',
    titulo: 'Cada paciente, con su historia completa',
    texto: 'Ficha, tratamientos y consultas en un solo lugar.',
  },
  {
    imagen: '/portada/atencion.webp',
    titulo: 'Indicadores para decidir mejor',
    texto: 'Tiempo de registro, ausentismo, recordatorios y consultas atendidas.',
  },
];

const DURACION_MS = 5000;

/**
 * Marco de las pantallas de autenticacion (login, registro, verificacion y
 * recuperacion de contrasena) de las dos aplicaciones: fotos que cambian cada
 * 5 segundos con un mensaje para cada audiencia (paciente o personal) y la
 * tarjeta del formulario. En el celular las fotos se reducen a una franja
 * superior para que el formulario quede a la vista.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [IconComponent, RouterLink],
  templateUrl: './auth-layout.html',
})
export class AuthLayoutComponent {
  titulo = input.required<string>();
  descripcion = input('');

  protected readonly themeService = inject(ThemeService);
  protected readonly esPortal = inject(AUDIENCIA, { optional: true }) === 'portal';
  protected readonly escenas = this.esPortal ? ESCENAS_PORTAL : ESCENAS_INTRANET;
  protected readonly garantias: { icono: NombreIcono; texto: string }[] = this.esPortal
    ? [
        { icono: 'circle-check-big', texto: 'Gratis' },
        { icono: 'clock', texto: 'Disponible 24/7' },
        { icono: 'shield-check', texto: 'Datos protegidos' },
      ]
    : [
        { icono: 'shield-check', texto: 'Acceso seguro' },
        { icono: 'users', texto: 'Seguimiento continuo' },
        { icono: 'heart', texto: 'Mejor calidad de vida' },
      ];

  protected readonly indice = signal(0);
  protected readonly pausado = signal(
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  constructor() {
    const temporizador = setInterval(() => {
      if (!this.pausado()) {
        this.indice.update((i) => (i + 1) % this.escenas.length);
      }
    }, DURACION_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(temporizador));
  }

  protected ir(i: number): void {
    this.indice.set(i);
  }
}
