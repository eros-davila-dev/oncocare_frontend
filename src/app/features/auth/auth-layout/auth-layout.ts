import { Component, input } from '@angular/core';
import { BrandLogoComponent } from '../../../shared/ui/brand-logo/brand-logo';
import { IconComponent } from '../../../shared/ui/icon/icon';

/**
 * Marco visual compartido por las pantallas publicas de autenticacion
 * (login, registro, verificacion, recuperacion de contrasena): el mismo
 * panel hero + tarjeta que ya tenia login.html, extraido para no repetirlo
 * en cada pantalla nueva del autoservicio de pacientes (seccion 7).
 */
@Component({
  selector: 'app-auth-layout',
  imports: [BrandLogoComponent, IconComponent],
  templateUrl: './auth-layout.html',
})
export class AuthLayoutComponent {
  titulo = input.required<string>();
  descripcion = input('');
}
