import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Los 3 pasos para vincular Telegram con el QR comun del bot, en lenguaje
 * sencillo. Se usa en el portal, en la ficha del paciente (recepcion) y en la
 * guia imprimible: el mismo texto en todas partes.
 */
@Component({
  selector: 'app-pasos-telegram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="space-y-3">
      <li class="flex gap-3">
        <span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">1</span>
        <p class="text-sm">
          <strong>Abre el bot de la fundación</strong>: escanea el código con la cámara del celular
          o busca <strong>{{ usuarioBot() ? '@' + usuarioBot() : 'el bot de la fundación' }}</strong> en Telegram.
        </p>
      </li>
      <li class="flex gap-3">
        <span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">2</span>
        <p class="text-sm">Pulsa <strong>Iniciar</strong> y luego toca el botón <strong>«📱 Compartir mi número»</strong>.</p>
      </li>
      <li class="flex gap-3">
        <span class="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">3</span>
        <p class="text-sm">
          Escribe los <strong>3 últimos dígitos del DNI {{ paraAcompanante() ? 'del paciente' : 'del paciente (el tuyo o el de la persona que acompañas)' }}</strong>.
          ¡Listo! El bot te confirmará.
        </p>
      </li>
    </ol>
    <p class="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
      🔒 Solo te enviaremos la fecha y la hora de las citas. <strong>Nunca</strong> te pediremos contraseñas, pagos ni códigos por mensaje.
    </p>
  `,
})
export class PasosTelegramComponent {
  usuarioBot = input<string | null>(null);
  /** true cuando las instrucciones son para el referido (pide el DNI del paciente). */
  paraAcompanante = input(false);
}
