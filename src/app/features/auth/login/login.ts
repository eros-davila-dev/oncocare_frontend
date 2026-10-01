import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AUDIENCIA } from '../../../core/config/audiencia';
import { ErrorResponse } from '../../../core/models/error.model';
import { InputComponent } from '../../../shared/ui/input/input';
import { ButtonComponent } from '../../../shared/ui/button/button';
import { IconComponent } from '../../../shared/ui/icon/icon';
import { AuthLayoutComponent } from '../auth-layout/auth-layout';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, InputComponent, ButtonComponent, IconComponent, AuthLayoutComponent],
  templateUrl: './login.html',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly esPortal = inject(AUDIENCIA, { optional: true }) === 'portal';
  protected readonly enviando = signal(false);
  protected readonly errorGeneral = signal('');
  /** Si la cuenta es de la otra aplicacion (paciente en la intranet o personal en el portal). */
  protected readonly urlOtraAplicacion = signal<string | null>(null);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    recordarme: new FormControl(true, { nonNullable: true }),
  });

  protected iniciarSesion(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.errorGeneral.set('');
    this.urlOtraAplicacion.set(null);

    const { email, password, recordarme } = this.form.getRawValue();

    this.authService.login({ email, password }, recordarme).subscribe({
      next: () => {
        if (!this.authService.perteneceAEstaAplicacion()) {
          this.urlOtraAplicacion.set(this.authService.urlDeSuAplicacion());
          this.authService.logout();
          this.enviando.set(false);
          return;
        }
        this.router.navigate([this.authService.rutaInicio()]);
      },
      error: (error: HttpErrorResponse) => {
        this.enviando.set(false);
        const cuerpo = error.error as ErrorResponse | undefined;
        this.errorGeneral.set(cuerpo?.message ?? 'No se pudo iniciar sesion. Intente nuevamente.');
      },
    });
  }
}
