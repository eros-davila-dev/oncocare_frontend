import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InputComponent } from '../../../shared/ui/input/input';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { AuthLayoutComponent } from '../auth-layout/auth-layout';

/**
 * Seccion 9: la respuesta es siempre la misma exista o no la cuenta, para no
 * permitir enumerar correos registrados. Por eso aqui no hay manejo de
 * error especifico: cualquier respuesta 2xx del backend muestra el mismo
 * mensaje generico.
 */
@Component({
  selector: 'app-recuperar-password',
  imports: [ReactiveFormsModule, RouterLink, InputComponent, ButtonComponent, IconComponent, AuthLayoutComponent],
  templateUrl: './recuperar-password.html',
})
export class RecuperarPasswordComponent {
  private readonly authService = inject(AuthService);

  protected readonly enviando = signal(false);
  protected readonly solicitudEnviada = signal(false);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  protected solicitar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.authService.recuperarPassword({ email: this.form.getRawValue().email }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.solicitudEnviada.set(true);
      },
      error: () => {
        // Incluso ante un error de red mostramos el mismo mensaje generico;
        // el usuario no necesita saber si su correo existe o no.
        this.enviando.set(false);
        this.solicitudEnviada.set(true);
      },
    });
  }
}
